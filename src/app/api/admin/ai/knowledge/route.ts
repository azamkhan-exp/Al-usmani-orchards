import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getAllKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument
} from '@/lib/ai/rag';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const docs = getAllKnowledgeDocuments({ category, search });
    return NextResponse.json({ success: true, documents: docs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch knowledge documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { category, title, content, tags } = body;

    if (!category || !title || !content) {
      return NextResponse.json({ error: 'Category, title, and content are required.' }, { status: 400 });
    }

    const newDoc = createKnowledgeDocument({
      category,
      title,
      content,
      tags: Array.isArray(tags) ? tags : []
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create document' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    const updated = updateKnowledgeDocument(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    const success = deleteKnowledgeDocument(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete document' }, { status: 500 });
  }
}
