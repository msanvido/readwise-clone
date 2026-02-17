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

  const feed = db.prepare(
    "SELECT * FROM feeds WHERE id = ? AND user_id = ?"
  ).get(id, user.id);
  if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documents = db.prepare(
    "SELECT * FROM documents WHERE parent_feed_id = ? AND user_id = ? ORDER BY created_at DESC"
  ).all(id, user.id);

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
  const db = getDb();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
  if (body.folder !== undefined) { updates.push("folder = ?"); values.push(body.folder); }

  if (updates.length > 0) {
    values.push(id, user.id);
    db.prepare(
      `UPDATE feeds SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  const feed = db.prepare("SELECT * FROM feeds WHERE id = ?").get(id);
  return NextResponse.json({ feed });
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
    "DELETE FROM feeds WHERE id = ? AND user_id = ?"
  ).run(id, user.id);

  if (result.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
