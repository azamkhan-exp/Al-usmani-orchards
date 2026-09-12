import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const db = getDatabase();
    const rows = (await db.prepare('SELECT section_key, content_json, updated_at FROM website_content').all()) as any[];

    const contentMap: Record<string, any> = {};
    for (const r of rows) {
      try {
        contentMap[r.section_key] = JSON.parse(r.content_json);
      } catch {
        contentMap[r.section_key] = r.content_json;
      }
    }

    return NextResponse.json({ success: true, content: contentMap });
  } catch (err: any) {
    console.error('Admin CMS GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch CMS content' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'cms:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { sectionKey, content } = body;

    if (!sectionKey || !content) {
      return NextResponse.json({ error: 'Section key and content required' }, { status: 400 });
    }

    const db = getDatabase();
    const contentStr = JSON.stringify(content);

    await db.prepare(`
      INSERT INTO website_content (id, section_key, content_json, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(section_key) DO UPDATE SET
        content_json = excluded.content_json,
        updated_at = datetime('now')
    `).run(`cms-${sectionKey}`, sectionKey, contentStr);

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'CMS_CONTENT_UPDATED',
      resourceType: 'CMS',
      resourceId: sectionKey,
      newState: content
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin CMS POST error:', err);
    return NextResponse.json({ error: 'Failed to update CMS content' }, { status: 500 });
  }
}
