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

  const docRs = await db.execute({
    sql: "SELECT * FROM documents WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  const document = firstRow(docRs);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const highlightsRs = await db.execute({
    sql: "SELECT * FROM highlights WHERE document_id = ? AND user_id = ? AND is_discard = 0 ORDER BY created_at DESC",
    args: [id, user.id],
  });
  const highlights = rowsToObjects(highlightsRs);

  const tagsRs = await db.execute({
    sql: `SELECT t.* FROM tags t
      JOIN document_tags dt ON dt.tag_id = t.id
      WHERE dt.document_id = ?`,
    args: [id],
  });
  const tags = rowsToObjects(tagsRs);

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
  const db = await getDb();

  const existingRs = await db.execute({
    sql: "SELECT * FROM documents WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  if (!firstRow(existingRs)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    await db.execute({
      sql: `UPDATE documents SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args: values,
    });
  }

  const rs = await db.execute({ sql: "SELECT * FROM documents WHERE id = ?", args: [id] });
  const document = firstRow(rs);
  return NextResponse.json({ document });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();

  const rs = await db.execute({
    sql: "DELETE FROM documents WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });

  if (rs.rowsAffected === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
