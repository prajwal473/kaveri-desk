import { NextRequest, NextResponse } from 'next/server';
import { executeChatTurn, ChatMessage } from '@/lib/gemini/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, query } = body;

    const chatMessages: ChatMessage[] = messages || [];
    const latestQuery = query || (chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].content : '');

    if (!latestQuery) {
      return NextResponse.json({ error: 'Query or messages required' }, { status: 400 });
    }

    const response = await executeChatTurn(chatMessages, latestQuery);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: err.message || 'Chat turn failed' }, { status: 500 });
  }
}
