import type {
  ChatRequest,
  ChatChunk,
  ChatCompletion,
  FunctionCallResult,
} from '@dreamforge/types';
import type { LLMRuntime, RuntimeParams } from '../index';

export function createOpenAICompatibleRuntime(params: RuntimeParams): LLMRuntime {
  const { provider, apiKey } = params;
  const baseUrl = provider.base_url.replace(/\/$/, '');

  async function* chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    const body = {
      model: req.model,
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
      top_p: req.top_p,
      stream: true,
      tools: req.tools,
      response_format: req.response_format,
      ...(req.vendor_params || {}),
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (choice) {
            yield {
              delta: choice.delta?.content,
              content: choice.delta?.content,
              role: choice.delta?.role,
              finish_reason: choice.finish_reason,
              tool_calls: choice.delta?.tool_calls?.map((tc: any) => ({
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments,
              })),
            };
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  async function chatNonStreaming(req: ChatRequest): Promise<ChatCompletion> {
    const body = {
      model: req.model,
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
      top_p: req.top_p,
      stream: false,
      tools: req.tools,
      response_format: req.response_format,
      ...(req.vendor_params || {}),
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id,
      content: choice?.message?.content || '',
      role: choice?.message?.role || 'assistant',
      finish_reason: choice?.finish_reason,
      tool_calls: choice?.message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name,
        arguments: JSON.parse(tc.function?.arguments || '{}'),
      })),
      usage: data.usage,
    };
  }

  async function functionCall(req: any): Promise<FunctionCallResult> {
    const result = await chatNonStreaming(req);
    if (result.tool_calls && result.tool_calls.length > 0) {
      return {
        name: result.tool_calls[0].name,
        arguments: result.tool_calls[0].arguments,
      };
    }
    return {
      name: '',
      arguments: {},
    };
  }

  return {
    chat: async (req) => chat(req),
    chatNonStreaming,
    functionCall,
  };
}
