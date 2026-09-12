import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { runOrchardAgent } from '@/lib/ai/agent';
import { askAdminAssistant } from '@/lib/services/ai.service';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { query, mode, phoneOrEmail } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Query cannot be empty.' }, { status: 400 });
    }

    const user = await getCurrentUser();

    if (mode === 'admin') {
      if (!user || user.role === 'CUSTOMER') {
        return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
      }
      const response = await askAdminAssistant(query);
      return NextResponse.json({ success: true, ...response });
    }

    // Customer AI Concierge (RAG & Agentic Tool Execution)
    const userContext = {
      userId: user?.id,
      phoneOrEmail: phoneOrEmail || (user as any)?.phone || user?.email
    };

    const response = await runOrchardAgent(query, userContext);
    return NextResponse.json({ success: true, ...response });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return NextResponse.json({ error: 'Failed to process assistant request' }, { status: 500 });
  }
}
