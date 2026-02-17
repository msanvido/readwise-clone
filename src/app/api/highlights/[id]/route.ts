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

  const highlight = db.prepare(`
    SELECT h.*, d.title as document_title, d.author as document_author
    FROM highlights h
    LEFT JOIN documents d ON d.id = h.document_id
    WHERE h.id = ? AND h.user_id = ?
  `).get(id, user.id);

  if (!highlight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN highlight_tags ht ON ht.tag_id = t.id
    WHERE ht.highlight_id = ?
  `).all(id);

  return NextResponse.json({ highlight, tags });
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
    "SELECT * FROM highlights WHERE id = ? AND user_id = ?"
  ).get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["text", "note", "color", "is_favorite", "is_discard"];
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
      `UPDATE highlights SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  const highlight = db.prepare("SELECT * FROM highlights WHERE id = ?").get(id);
  return NextResponse.json({ highlight });
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
    "DELETE FROM highlights WHERE id = ? AND user_id = ?"
  ).run(id, user.id);

  if (result.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
