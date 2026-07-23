import type {
  TextToVideoRequest,
  ImageToVideoRequest,
  FirstLastFrameRequest,
  VideoRequest,
  TaskHandle,
} from '@dreamforge/types';
import type { VideoRuntime, VideoRuntimeParams } from '../index';

function generateTaskId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// 存储异步任务的状态（内存中，生产环境应使用 Redis/数据库）
const taskStore = new Map<string, { provider: string; model: string; endpoint: string; apiKey: string }>();

export function createOpenAIVideoRuntime(params: VideoRuntimeParams): VideoRuntime {
  const { provider, apiKey } = params;
  const baseUrl = provider.base_url.replace(/\/$/, '');

  async function submitAsyncTask(
    endpoint: string,
    body: Record<string, unknown>,
    model: string,
  ): Promise<TaskHandle> {
    const taskId = generateTaskId();

    // 存储任务信息用于后续轮询
    taskStore.set(taskId, {
      provider: provider.id,
      model,
      endpoint: `${baseUrl}${endpoint}/${taskId}`,
      apiKey,
    });

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          task_id: taskId,
          provider: provider.id,
          model,
          modality: 'video',
          status: 'failed',
          input: body,
          metadata: { credits_cost: 0 },
          error: {
            code: String(response.status),
            message: error,
            retryable: response.status >= 500,
          },
        };
      }

      const data = await response.json();

      // 如果提供商返回了任务 ID，使用它
      const providerTaskId = data.id || data.task_id || taskId;

      // 如果响应中包含结果（同步 API），直接返回成功
      if (data.output || data.video_url || data.videos) {
        const videos = data.videos || [
          {
            url: data.video_url || data.output,
            thumbnail_url: data.thumbnail_url,
            duration: data.duration,
          },
        ];

        return {
          task_id: providerTaskId,
          provider: provider.id,
          model,
          modality: 'video',
          status: 'succeeded',
          input: body,
          output: { videos },
          metadata: {
            credits_cost: 0,
            finished_at: new Date().toISOString(),
            provider_raw: data,
          },
        };
      }

      // 异步任务，返回 queued 状态
      taskStore.set(providerTaskId, {
        provider: provider.id,
        model,
        endpoint: `${baseUrl}${endpoint}/${providerTaskId}`,
        apiKey,
      });

      return {
        task_id: providerTaskId,
        provider: provider.id,
        model,
        modality: 'video',
        status: 'queued',
        input: body,
        metadata: {
          credits_cost: 0,
          provider_raw: data,
        },
      };
    } catch (error: any) {
      return {
        task_id: taskId,
        provider: provider.id,
        model,
        modality: 'video',
        status: 'failed',
        input: body,
        metadata: { credits_cost: 0 },
        error: {
          code: 'network_error',
          message: error.message || 'Network error',
          retryable: true,
        },
      };
    }
  }

  async function textToVideo(req: TextToVideoRequest): Promise<TaskHandle> {
    const body: Record<string, unknown> = {
      model: req.model,
      prompt: req.prompt,
      duration: req.duration || 5,
      resolution: req.resolution || '720p',
      aspect_ratio: req.aspect_ratio || '16:9',
      camera_movement: req.camera_movement,
      seed: req.seed,
      ...(req.vendor_params || {}),
    };

    if (req.audio) {
      body.audio = req.audio;
    }

    if (req.shots && req.shots.length > 0) {
      body.shots = req.shots;
    }

    return submitAsyncTask('/videos/generations', body, req.model);
  }

  async function imageToVideo(req: ImageToVideoRequest): Promise<TaskHandle> {
    const body: Record<string, unknown> = {
      model: req.model,
      image: req.image,
      prompt: req.prompt,
      duration: req.duration || 5,
      resolution: req.resolution || '720p',
      aspect_ratio: req.aspect_ratio || '16:9',
      camera_movement: req.camera_movement,
      motion_strength: req.motion_strength,
      seed: req.seed,
      ...(req.vendor_params || {}),
    };

    return submitAsyncTask('/videos/image-to-video', body, req.model);
  }

  async function firstLastFrame(req: FirstLastFrameRequest): Promise<TaskHandle> {
    const body: Record<string, unknown> = {
      model: req.model,
      first_frame: req.first_frame,
      last_frame: req.last_frame,
      prompt: req.prompt,
      duration: req.duration || 5,
      resolution: req.resolution || '720p',
      seed: req.seed,
      ...(req.vendor_params || {}),
    };

    return submitAsyncTask('/videos/first-last-frame', body, req.model);
  }

  async function submit(req: VideoRequest): Promise<TaskHandle> {
    switch (req.type) {
      case 'text_to_video':
        return textToVideo(req);
      case 'image_to_video':
        return imageToVideo(req);
      case 'first_last_frame':
        return firstLastFrame(req);
      default:
        throw new Error(`Unknown video request type`);
    }
  }

  async function pollStatus(taskId: string): Promise<TaskHandle> {
    const taskInfo = taskStore.get(taskId);

    if (!taskInfo) {
      return {
        task_id: taskId,
        provider: provider.id,
        model: '',
        modality: 'video',
        status: 'failed',
        input: {},
        metadata: { credits_cost: 0 },
        error: {
          code: 'not_found',
          message: 'Task not found',
          retryable: false,
        },
      };
    }

    try {
      const response = await fetch(taskInfo.endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${taskInfo.apiKey}`,
        },
      });

      if (!response.ok) {
        return {
          task_id: taskId,
          provider: taskInfo.provider,
          model: taskInfo.model,
          modality: 'video',
          status: 'failed',
          input: {},
          metadata: { credits_cost: 0 },
          error: {
            code: String(response.status),
            message: 'Failed to poll task status',
            retryable: response.status >= 500,
          },
        };
      }

      const data = await response.json();
      const status = mapProviderStatus(data.status || data.state);

      const result: TaskHandle = {
        task_id: taskId,
        provider: taskInfo.provider,
        model: taskInfo.model,
        modality: 'video',
        status,
        input: {},
        metadata: {
          credits_cost: 0,
          provider_raw: data,
        },
      };

      if (status === 'succeeded') {
        const videos = data.videos || data.output
          ? Array.isArray(data.output)
            ? data.output
            : [{ url: data.video_url || data.output }]
          : [];

        result.output = { videos };
        result.metadata.finished_at = new Date().toISOString();
      } else if (status === 'failed') {
        result.error = {
          code: data.error_code || 'unknown',
          message: data.error_message || data.error || 'Task failed',
          retryable: false,
        };
      }

      return result;
    } catch (error: any) {
      return {
        task_id: taskId,
        provider: taskInfo.provider,
        model: taskInfo.model,
        modality: 'video',
        status: 'failed',
        input: {},
        metadata: { credits_cost: 0 },
        error: {
          code: 'network_error',
          message: error.message || 'Polling failed',
          retryable: true,
        },
      };
    }
  }

  async function cancelTask(taskId: string): Promise<boolean> {
    const taskInfo = taskStore.get(taskId);
    if (!taskInfo) return false;

    try {
      const response = await fetch(`${taskInfo.endpoint}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${taskInfo.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return {
    textToVideo,
    imageToVideo,
    firstLastFrame,
    submit,
    pollStatus,
    cancelTask,
  };
}

function mapProviderStatus(status: string): TaskHandle['status'] {
  const statusMap: Record<string, TaskHandle['status']> = {
    pending: 'queued',
    queued: 'queued',
    processing: 'running',
    running: 'running',
    succeeded: 'succeeded',
    completed: 'succeeded',
    success: 'succeeded',
    failed: 'failed',
    error: 'failed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  };

  return statusMap[status?.toLowerCase()] || 'running';
}
