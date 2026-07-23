import type { ImageRuntime, ImageRuntimeParams } from './index';
import { createOpenAIImageRuntime } from './providers/openai-compatible';

export function createImageRuntime(params: ImageRuntimeParams): ImageRuntime {
  const { provider } = params;

  switch (provider.protocol) {
    case 'openai':
      return createOpenAIImageRuntime(params);
    case 'apimart':
    case 'native':
      return createOpenAIImageRuntime(params);
    default:
      throw new Error(`Unsupported provider protocol: ${provider.protocol}`);
  }
}
