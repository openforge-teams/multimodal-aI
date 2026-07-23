import type { VideoRuntime, VideoRuntimeParams } from './index';
import { createOpenAIVideoRuntime } from './providers/openai-compatible';

export function createVideoRuntime(params: VideoRuntimeParams): VideoRuntime {
  const { provider } = params;

  switch (provider.protocol) {
    case 'openai':
      return createOpenAIVideoRuntime(params);
    case 'apimart':
    case 'native':
      return createOpenAIVideoRuntime(params);
    default:
      throw new Error(`Unsupported provider protocol: ${provider.protocol}`);
  }
}
