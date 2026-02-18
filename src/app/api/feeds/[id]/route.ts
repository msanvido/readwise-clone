import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, firstRow, rowsToObjects } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();

  const feedRs = await db.execute({
    sql: "SELECT * FROM feeds WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  const feed = firstRow(feedRs);
  if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const docsRs = await db.execute({
    sql: "SELECT * FROM documents WHERE parent_feed_id = ? AND user_id = ? ORDER BY created_at DESC",
    args: [id, user.id],
  });
  const documents = rowsToObjects(docsRs);

  return NextResponse.json({ feed, documents });
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

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
  if (body.folder !== undefined) { updates.push("folder = ?"); values.push(body.folder); }

  if (updates.length > 0) {
    values.push(id, user.id);
    await db.execute({
      sql: `UPDATE feeds SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args: values,
    });
  }

  const rs = await db.execute({ sql: "SELECT * FROM feeds WHERE id = ?", args: [id] });
  const feed = firstRow(rs);
  return NextResponse.json({ feed });
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
    sql: "DELETE FROM feeds WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });

  if (rs.rowsAffected === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
