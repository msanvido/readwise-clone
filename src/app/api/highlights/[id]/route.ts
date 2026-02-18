import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, rowsToObjects, firstRow } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();

  const highlightRs = await db.execute({
    sql: `
      SELECT h.*, d.title as document_title, d.author as document_author
      FROM highlights h
      LEFT JOIN documents d ON d.id = h.document_id
      WHERE h.id = ? AND h.user_id = ?
    `,
    args: [id, user.id],
  });
  const highlight = firstRow(highlightRs);

  if (!highlight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tagsRs = await db.execute({
    sql: `
      SELECT t.* FROM tags t
      JOIN highlight_tags ht ON ht.tag_id = t.id
      WHERE ht.highlight_id = ?
    `,
    args: [id],
  });
  const tags = rowsToObjects(tagsRs);

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
  const db = await getDb();

  const existingRs = await db.execute({
    sql: "SELECT * FROM highlights WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  const existing = firstRow(existingRs);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["text", "note", "color", "is_favorite", "is_discard"];
  const setClauses: string[] = [];
  const values: (string | number)[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      setClauses.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (setClauses.length > 0) {
    setClauses.push("updated_at = datetime('now')");
    await db.execute({
      sql: `UPDATE highlights SET ${setClauses.join(", ")} WHERE id = ? AND user_id = ?`,
      args: [...values, id, user.id],
    });
  }

  const rs = await db.execute({
    sql: "SELECT * FROM highlights WHERE id = ?",
    args: [id],
  });
  const highlight = firstRow(rs);

  return NextResponse.json({ highlight });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();

  const result = await db.execute({
    sql: "DELETE FROM highlights WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
