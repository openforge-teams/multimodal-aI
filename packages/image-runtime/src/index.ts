import type {
  TextToImageRequest,
  ImageToImageRequest,
  InpaintingRequest,
  UpscaleRequest,
  ImageRequest,
  ImageOutput,
  TaskHandle,
  ProviderConfig,
} from '@dreamforge/types';

export interface ImageRuntimeParams {
  provider: ProviderConfig;
  apiKey: string;
}

export interface ImageRuntime {
  textToImage(req: TextToImageRequest): Promise<TaskHandle>;
  imageToImage(req: ImageToImageRequest): Promise<TaskHandle>;
  inpainting(req: InpaintingRequest): Promise<TaskHandle>;
  upscale(req: UpscaleRequest): Promise<TaskHandle>;
  submit(req: ImageRequest): Promise<TaskHandle>;
  pollStatus(taskId: string): Promise<TaskHandle>;
}

export { createOpenAIImageRuntime } from './providers/openai-compatible';
export { createImageRuntime } from './factory';
