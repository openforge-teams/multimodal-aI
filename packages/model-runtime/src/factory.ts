import type { LLMRuntime, RuntimeParams } from './index';
import { createOpenAICompatibleRuntime } from './providers/openai-compatible';

export function createLLMRuntime(params: RuntimeParams): LLMRuntime {
  const { provider } = params;

  switch (provider.protocol) {
    case 'openai':
      return createOpenAICompatibleRuntime(params);
    case 'apimart':
    case 'native':
      // 对于原生协议，仍然尝试使用 OpenAI 兼容模式（很多提供商兼容）
      return createOpenAICompatibleRuntime(params);
    default:
      throw new Error(`Unsupported provider protocol: ${provider.protocol}`);
  }
}
