import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import crypto from 'crypto';

export interface KnowledgeDocument {
  id: string;
  category: 'VARIETIES' | 'ORCHARD_TERROIR' | 'POLICIES' | 'SHIPPING' | 'PRICING_DEALS' | 'STORAGE_RIPENING' | 'FAQ';
  title: string;
  content: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RAGSearchResult {
  id: string;
  category: string;
  title: string;
  content: string;
  relevanceScore: number;
}

/**
 * Searches the AI knowledge base documents with keyword and semantic tag scoring.
 */
export function searchKnowledgeBase(query: string, category?: string, limit = 4): RAGSearchResult[] {
  ensureDatabaseReady();
  const db = getDatabase();

  const rawDocs = db.prepare(`
    SELECT id, category, title, content, tags_json
    FROM ai_knowledge_documents
    WHERE is_active = 1 ${category ? 'AND category = ?' : ''}
  `).all(...(category ? [category] : [])) as any[];

  if (!rawDocs || rawDocs.length === 0) return [];

  const cleanQuery = query.toLowerCase().trim();
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'for', 'of', 'with', 'do', 'you', 'what', 'how', 'are']);
  const queryTokens = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const scored: RAGSearchResult[] = [];

  for (const doc of rawDocs) {
    let score = 0;
    const lowerTitle = doc.title.toLowerCase();
    const lowerContent = doc.content.toLowerCase();
    let tags: string[] = [];
    try {
      tags = JSON.parse(doc.tags_json || '[]').map((t: string) => t.toLowerCase());
    } catch {
      tags = [];
    }

    // Direct phrase match
    if (lowerTitle.includes(cleanQuery)) score += 20;
    if (lowerContent.includes(cleanQuery)) score += 10;

    // Token matches
    for (const token of queryTokens) {
      if (lowerTitle.includes(token)) score += 6;
      if (tags.some((t) => t.includes(token) || token.includes(t))) score += 5;
      if (lowerContent.includes(token)) score += 2;
    }

    // Category affinity
    if (cleanQuery.includes('sweet') || cleanQuery.includes('brix') || cleanQuery.includes('flavor') || cleanQuery.includes('taste')) {
      if (doc.category === 'VARIETIES') score += 4;
    }
    if (cleanQuery.includes('ship') || cleanQuery.includes('deliver') || cleanQuery.includes('city') || cleanQuery.includes('tcs')) {
      if (doc.category === 'SHIPPING') score += 4;
    }
    if (cleanQuery.includes('ripen') || cleanQuery.includes('carbide') || cleanQuery.includes('store') || cleanQuery.includes('box')) {
      if (doc.category === 'STORAGE_RIPENING' || doc.category === 'ORCHARD_TERROIR') score += 4;
    }

    if (score > 0) {
      scored.push({
        id: doc.id,
        category: doc.category,
        title: doc.title,
        content: doc.content,
        relevanceScore: score
      });
    }
  }

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, limit);
}

/**
 * Returns all knowledge documents for admin management.
 */
export function getAllKnowledgeDocuments(filters?: { category?: string; search?: string }): KnowledgeDocument[] {
  ensureDatabaseReady();
  const db = getDatabase();

  let sql = `SELECT * FROM ai_knowledge_documents WHERE 1=1`;
  const params: any[] = [];

  if (filters?.category && filters.category !== 'ALL') {
    sql += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters?.search && filters.search.trim()) {
    sql += ` AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags_json) LIKE ?)`;
    const term = `%${filters.search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY updated_at DESC`;

  const rows = db.prepare(sql).all(...params) as any[];

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    content: r.content,
    tags: JSON.parse(r.tags_json || '[]'),
    is_active: Boolean(r.is_active),
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

/**
 * Get single knowledge document by ID.
 */
export function getKnowledgeDocumentById(id: string): KnowledgeDocument | null {
  ensureDatabaseReady();
  const db = getDatabase();

  const r = db.prepare(`SELECT * FROM ai_knowledge_documents WHERE id = ?`).get(id) as any;
  if (!r) return null;

  return {
    id: r.id,
    category: r.category,
    title: r.title,
    content: r.content,
    tags: JSON.parse(r.tags_json || '[]'),
    is_active: Boolean(r.is_active),
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

/**
 * Create a new knowledge document.
 */
export function createKnowledgeDocument(doc: {
  category: string;
  title: string;
  content: string;
  tags?: string[];
}): KnowledgeDocument {
  ensureDatabaseReady();
  const db = getDatabase();

  const id = `doc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const tagsJson = JSON.stringify(doc.tags || []);

  db.prepare(`
    INSERT INTO ai_knowledge_documents (id, category, title, content, tags_json, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `).run(id, doc.category, doc.title.trim(), doc.content.trim(), tagsJson);

  return getKnowledgeDocumentById(id)!;
}

/**
 * Update an existing knowledge document.
 */
export function updateKnowledgeDocument(
  id: string,
  updates: {
    category?: string;
    title?: string;
    content?: string;
    tags?: string[];
    is_active?: boolean;
  }
): KnowledgeDocument | null {
  ensureDatabaseReady();
  const db = getDatabase();

  const existing = getKnowledgeDocumentById(id);
  if (!existing) return null;

  const category = updates.category !== undefined ? updates.category : existing.category;
  const title = updates.title !== undefined ? updates.title.trim() : existing.title;
  const content = updates.content !== undefined ? updates.content.trim() : existing.content;
  const tagsJson = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(existing.tags);
  const isActive = updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : (existing.is_active ? 1 : 0);

  db.prepare(`
    UPDATE ai_knowledge_documents
    SET category = ?, title = ?, content = ?, tags_json = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(category, title, content, tagsJson, isActive, id);

  return getKnowledgeDocumentById(id);
}

/**
 * Delete a knowledge document.
 */
export function deleteKnowledgeDocument(id: string): boolean {
  ensureDatabaseReady();
  const db = getDatabase();

  const result = db.prepare(`DELETE FROM ai_knowledge_documents WHERE id = ?`).run(id);
  return result.changes > 0;
}
