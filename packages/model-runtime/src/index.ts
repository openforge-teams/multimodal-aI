import type {
  ChatRequest,
  ChatChunk,
  ChatCompletion,
  FunctionCallRequest,
  FunctionCallResult,
  ProviderConfig,
} from '@dreamforge/types';

export interface RuntimeParams {
  provider: ProviderConfig;
  apiKey: string;
}

export interface LLMRuntime {
  chat(req: ChatRequest): Promise<AsyncIterable<ChatChunk>>;
  chatNonStreaming(req: ChatRequest): Promise<ChatCompletion>;
  functionCall(req: FunctionCallRequest): Promise<FunctionCallResult>;
}

export { createOpenAICompatibleRuntime } from './providers/openai-compatible';
export { createLLMRuntime } from './factory';
