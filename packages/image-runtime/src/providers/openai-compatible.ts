import type {
  TextToImageRequest,
  ImageToImageRequest,
  InpaintingRequest,
  UpscaleRequest,
  ImageRequest,
  TaskHandle,
} from '@dreamforge/types';
import type { ImageRuntime, ImageRuntimeParams } from '../index';

function generateTaskId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createOpenAIImageRuntime(params: ImageRuntimeParams): ImageRuntime {
  const { provider, apiKey } = params;
  const baseUrl = provider.base_url.replace(/\/$/, '');

  async function makeRequest(
    endpoint: string,
    body: Record<string, unknown>,
    model: string,
  ): Promise<TaskHandle> {
    const taskId = generateTaskId();
    const taskHandle: TaskHandle = {
      task_id: taskId,
      provider: provider.id,
      model,
      modality: 'image',
      status: 'queued',
      input: body,
      metadata: {
        credits_cost: 0,
      },
    };

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
          ...taskHandle,
          status: 'failed',
          error: {
            code: String(response.status),
            message: error,
            retryable: response.status >= 500,
          },
        };
      }

      const data = await response.json();

      // 处理 OpenAI 兼容的图像生成响应
      const images = data.data?.map((item: any, index: number) => ({
        url: item.url || item.b64_json
          ? `data:image/png;base64,${item.b64_json}`
          : undefined,
        seed: data.seed ? data.seed + index : undefined,
      })) || [];

      return {
        ...taskHandle,
        status: 'succeeded',
        output: { images },
        metadata: {
          credits_cost: 0,
          finished_at: new Date().toISOString(),
          provider_raw: data,
        },
      };
    } catch (error: any) {
      return {
        ...taskHandle,
        status: 'failed',
        error: {
          code: 'network_error',
          message: error.message || 'Network error',
          retryable: true,
        },
      };
    }
  }

  async function textToImage(req: TextToImageRequest): Promise<TaskHandle> {
    const body = {
      model: req.model,
      prompt: req.prompt,
      n: req.num_images || 1,
      size: mapAspectRatioToSize(req.aspect_ratio, req.quality),
      quality: req.quality === 'hd' ? 'hd' : 'standard',
      style: req.style_preset,
      seed: req.seed,
      ...(req.vendor_params || {}),
    };

    // 添加 negative_prompt 作为 vendor 参数（如果有）
    if (req.negative_prompt) {
      (body as any).negative_prompt = req.negative_prompt;
    }

    return makeRequest('/images/generations', body, req.model);
  }

  async function imageToImage(req: ImageToImageRequest): Promise<TaskHandle> {
    // 对于图像到图像，尝试使用 /images/edits 端点
    // 如果 init_image 是 URL，需要先下载
    const body: Record<string, unknown> = {
      model: req.model,
      prompt: req.prompt,
      n: req.num_images || 1,
      size: mapAspectRatioToSize(req.aspect_ratio, req.quality),
      image: req.init_image,
      strength: req.strength,
      seed: req.seed,
      ...(req.vendor_params || {}),
    };

    if (req.negative_prompt) {
      body.negative_prompt = req.negative_prompt;
    }

    if (req.reference_images && req.reference_images.length > 0) {
      body.reference_images = req.reference_images;
    }

    return makeRequest('/images/edits', body, req.model);
  }

  async function inpainting(req: InpaintingRequest): Promise<TaskHandle> {
    const body = {
      model: req.model,
      prompt: req.prompt,
      image: req.image,
      mask: req.mask,
      seed: req.seed,
      ...(req.vendor_params || {}),
    };

    return makeRequest('/images/edits', body, req.model);
  }

  async function upscale(req: UpscaleRequest): Promise<TaskHandle> {
    const body = {
      model: req.model,
      image: req.image,
      scale: req.scale || 2,
      ...(req.vendor_params || {}),
    };

    return makeRequest('/images/upscale', body, req.model);
  }

  async function submit(req: ImageRequest): Promise<TaskHandle> {
    switch (req.type) {
      case 'text_to_image':
        return textToImage(req);
      case 'image_to_image':
        return imageToImage(req);
      case 'inpainting':
        return inpainting(req);
      case 'upscale':
        return upscale(req);
      default:
        throw new Error(`Unknown image request type`);
    }
  }

  async function pollStatus(taskId: string): Promise<TaskHandle> {
    // 对于同步 API，任务已完成，这里返回一个占位符
    // 对于异步提供商，需要重写此方法
    return {
      task_id: taskId,
      provider: provider.id,
      model: '',
      modality: 'image',
      status: 'succeeded',
      input: {},
      metadata: { credits_cost: 0 },
    };
  }

  return {
    textToImage,
    imageToImage,
    inpainting,
    upscale,
    submit,
    pollStatus,
  };
}

function mapAspectRatioToSize(
  aspectRatio?: string,
  quality?: string,
): string {
  const base = quality === '4k' ? 2048 : quality === '2k' ? 1536 : quality === 'hd' ? 1024 : 512;

  switch (aspectRatio) {
    case '16:9':
      return `${base * 2}x${base}`;
    case '9:16':
      return `${base}x${base * 2}`;
    case '3:4':
      return `${base * 0.75}x${base}`;
    case '4:3':
      return `${base}x${base * 0.75}`;
    case '1:1':
    default:
      return `${base}x${base}`;
  }
}
