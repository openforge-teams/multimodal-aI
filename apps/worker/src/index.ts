import 'dotenv/config';
import { createWorker, createPollWorker, enqueuePollTask, type TaskPayload, type Job } from '@dreamforge/queue';
import { updateTaskStatus, getTask } from '@dreamforge/tasks';
import { getImageRuntime, getVideoRuntime, getLLMRuntime } from '@dreamforge/providers';
import { deductCredits, calculateCost } from '@dreamforge/billing';
import { createAsset } from '@dreamforge/assets';
import type {
  ImageRequest,
  VideoRequest,
  ImageOutput,
  VideoOutput,
  TaskHandle,
} from '@dreamforge/types';

console.log('🐝 DreamForge Worker starting...');
console.log(`  Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log(`  Database: ${process.env.DATABASE_URL ? 'connected' : 'not configured'}`);

// ============ 图像任务处理器 ============
createWorker('image', async (job: Job<TaskPayload>) => {
  const { taskId, userId, provider, model, request, requestType } = job.data;
  console.log(`[Image] Processing task: ${taskId}, type: ${requestType}`);

  try {
    // 更新状态为 running
    await updateTaskStatus(taskId, 'running');

    // 获取运行时
    const runtime = await getImageRuntime(userId, provider);
    if (!runtime) {
      throw new Error(`Image runtime not found for provider: ${provider}`);
    }

    // 执行请求
    const imageRequest = { type: requestType, ...request } as ImageRequest;
    const result = await runtime.submit(imageRequest);

    // 如果是异步任务（状态为 queued），加入轮询队列
    if (result.status === 'queued') {
      await enqueuePollTask({
        ...job.data,
        taskId: result.task_id,
      }, 5000);
      return;
    }

    // 处理结果
    await handleImageResult(taskId, userId, provider, model, result, request);
  } catch (error: any) {
    console.error(`[Image] Task failed: ${taskId}`, error);
    await updateTaskStatus(taskId, 'failed', {
      errorCode: error.code || 'unknown',
      errorMessage: error.message || 'Unknown error',
      retryable: error.retryable ?? true,
    });
  }
});

// ============ 视频任务处理器 ============
createWorker('video', async (job: Job<TaskPayload>) => {
  const { taskId, userId, provider, model, request, requestType } = job.data;
  console.log(`[Video] Processing task: ${taskId}, type: ${requestType}`);

  try {
    await updateTaskStatus(taskId, 'running');

    const runtime = await getVideoRuntime(userId, provider);
    if (!runtime) {
      throw new Error(`Video runtime not found for provider: ${provider}`);
    }

    const videoRequest = { type: requestType, ...request } as VideoRequest;
    const result = await runtime.submit(videoRequest);

    // 视频通常是异步的，加入轮询队列
    if (result.status === 'queued' || result.status === 'running') {
      await enqueuePollTask({
        ...job.data,
        taskId: result.task_id,
      }, 10000);
      return;
    }

    await handleVideoResult(taskId, userId, provider, model, result, request);
  } catch (error: any) {
    console.error(`[Video] Task failed: ${taskId}`, error);
    await updateTaskStatus(taskId, 'failed', {
      errorCode: error.code || 'unknown',
      errorMessage: error.message || 'Unknown error',
      retryable: error.retryable ?? true,
    });
  }
});

// ============ LLM 任务处理器 ============
createWorker('llm', async (job: Job<TaskPayload>) => {
  const { taskId, userId, provider, model, request } = job.data;
  console.log(`[LLM] Processing task: ${taskId}`);

  try {
    await updateTaskStatus(taskId, 'running');

    const runtime = await getLLMRuntime(userId, provider);
    if (!runtime) {
      throw new Error(`LLM runtime not found for provider: ${provider}`);
    }

    const result = await runtime.chatNonStreaming(request as any);

    // 计算费用并扣除
    const cost = await calculateCost(provider, model, 'llm');
    if (cost > 0) {
      await deductCredits(userId, cost, taskId, `LLM usage: ${model}`).catch(() => {});
    }

    await updateTaskStatus(taskId, 'succeeded', {
      output: { content: result.content, tool_calls: result.tool_calls } as any,
      creditsCost: cost,
    });
  } catch (error: any) {
    console.error(`[LLM] Task failed: ${taskId}`, error);
    await updateTaskStatus(taskId, 'failed', {
      errorCode: error.code || 'unknown',
      errorMessage: error.message || 'Unknown error',
      retryable: error.retryable ?? true,
    });
  }
});

// ============ 轮询任务处理器 ============
createPollWorker(async (job: Job<TaskPayload>) => {
  const { taskId, userId, provider, modality } = job.data;
  console.log(`[Poll] Checking task: ${taskId}`);

  try {
    const task = await getTask(taskId);
    if (!task) {
      console.warn(`[Poll] Task not found: ${taskId}`);
      return;
    }

    if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
      return;
    }

    let result: TaskHandle | null = null;

    if (modality === 'image') {
      const runtime = await getImageRuntime(userId, provider);
      if (runtime) {
        result = await runtime.pollStatus(taskId);
      }
    } else if (modality === 'video') {
      const runtime = await getVideoRuntime(userId, provider);
      if (runtime) {
        result = await runtime.pollStatus(taskId);
      }
    }

    if (!result) return;

    if (result.status === 'succeeded') {
      if (modality === 'image') {
        await handleImageResult(taskId, userId, provider, task.model, result, task.input);
      } else if (modality === 'video') {
        await handleVideoResult(taskId, userId, provider, task.model, result, task.input);
      }
    } else if (result.status === 'failed') {
      await updateTaskStatus(taskId, 'failed', {
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        retryable: result.error?.retryable,
      });
    } else {
      // 继续轮询
      await enqueuePollTask(job.data, 10000);
    }
  } catch (error: any) {
    console.error(`[Poll] Error checking task: ${taskId}`, error);
    // 出错后继续轮询
    await enqueuePollTask(job.data, 15000);
  }
});

// ============ 结果处理函数 ============
async function handleImageResult(
  taskId: string,
  userId: string,
  provider: string,
  model: string,
  result: TaskHandle,
  request: Record<string, unknown>,
): Promise<void> {
  const output = result.output as unknown as ImageOutput;
  const images = output?.images || [];

  // 计算费用
  const cost = await calculateCost(provider, model, 'image', {
    resolution: request.aspect_ratio as string,
    quality: request.quality as string,
    num_images: images.length || 1,
  });

  // 扣除费用
  if (cost > 0) {
    await deductCredits(userId, cost, taskId, `Image generation: ${model}`).catch(() => {});
  }

  // 创建资产记录
  const prompt = (request.prompt as string) || '';
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (image?.url) {
      await createAsset({
        userId,
        type: 'image',
        url: image.url,
        taskId,
        provider,
        model,
        prompt,
        params: request,
        seed: image.seed,
        creditsCost: Math.ceil(cost / images.length),
      });
    }
  }

  // 更新任务状态
  await updateTaskStatus(taskId, 'succeeded', {
    output: result.output as any,
    creditsCost: cost,
  });

  console.log(`[Image] Task completed: ${taskId}, ${images.length} images generated`);
}

async function handleVideoResult(
  taskId: string,
  userId: string,
  provider: string,
  model: string,
  result: TaskHandle,
  request: Record<string, unknown>,
): Promise<void> {
  const output = result.output as unknown as VideoOutput;
  const videos = output?.videos || [];

  // 计算费用
  const cost = await calculateCost(provider, model, 'video', {
    resolution: request.resolution as string,
    duration: request.duration as number,
  });

  if (cost > 0) {
    await deductCredits(userId, cost, taskId, `Video generation: ${model}`).catch(() => {});
  }

  // 创建资产记录
  const prompt = (request.prompt as string) || '';
  for (const video of videos) {
    if (video?.url) {
      await createAsset({
        userId,
        type: 'video',
        url: video.url,
        thumbnail: video.thumbnail_url,
        taskId,
        provider,
        model,
        prompt,
        params: request,
        creditsCost: cost,
      });
    }
  }

  await updateTaskStatus(taskId, 'succeeded', {
    output: result.output as any,
    creditsCost: cost,
  });

  console.log(`[Video] Task completed: ${taskId}, ${videos.length} videos generated`);
}

console.log('✅ DreamForge Worker started successfully');
console.log('   Listening for tasks...');

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});
