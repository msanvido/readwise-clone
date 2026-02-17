import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const document = db.prepare(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?"
  ).get(id, user.id);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const highlights = db.prepare(
    "SELECT * FROM highlights WHERE document_id = ? AND user_id = ? AND is_discard = 0 ORDER BY created_at DESC"
  ).all(id, user.id);

  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN document_tags dt ON dt.tag_id = t.id
    WHERE dt.document_id = ?
  `).all(id);

  return NextResponse.json({ document, highlights, tags });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?"
  ).get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["title", "author", "location", "reading_progress", "is_favorite", "category", "last_opened_at"];
  const updates: string[] = [];
  const values: (string | number)[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id, user.id);
    db.prepare(
      `UPDATE documents SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  const document = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  return NextResponse.json({ document });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const result = db.prepare(
    "DELETE FROM documents WHERE id = ? AND user_id = ?"
  ).run(id, user.id);

  if (result.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
