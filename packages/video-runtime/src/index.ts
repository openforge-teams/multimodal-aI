import type {
  TextToVideoRequest,
  ImageToVideoRequest,
  FirstLastFrameRequest,
  VideoRequest,
  TaskHandle,
  ProviderConfig,
} from '@dreamforge/types';

export interface VideoRuntimeParams {
  provider: ProviderConfig;
  apiKey: string;
}

export interface VideoRuntime {
  textToVideo(req: TextToVideoRequest): Promise<TaskHandle>;
  imageToVideo(req: ImageToVideoRequest): Promise<TaskHandle>;
  firstLastFrame(req: FirstLastFrameRequest): Promise<TaskHandle>;
  submit(req: VideoRequest): Promise<TaskHandle>;
  pollStatus(taskId: string): Promise<TaskHandle>;
  cancelTask(taskId: string): Promise<boolean>;
}

export { createOpenAIVideoRuntime } from './providers/openai-compatible';
export { createVideoRuntime } from './factory';
