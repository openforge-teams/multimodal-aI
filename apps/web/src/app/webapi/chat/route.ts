import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLLMRuntime } from '@dreamforge/providers';
import type { ChatRequest } from '@dreamforge/types';

export async function POST(req: Request) {
  // 验证会话
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as ChatRequest & { providerId?: string };
  const { providerId, ...chatRequest } = body;

  try {
    const runtime = await getLLMRuntime(session.user.id, providerId);
    if (!runtime) {
      return NextResponse.json(
        { error: 'No LLM provider configured. Please add an LLM provider in settings.' },
        { status: 400 },
      );
    }

    const stream = await runtime.chat(chatRequest);

    // 使用 ReadableStream 返回流式响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const data = encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
            controller.enqueue(data);
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 },
    );
  }
}
