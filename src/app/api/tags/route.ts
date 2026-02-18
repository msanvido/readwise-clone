import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, rowsToObjects, firstRow } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT t.*,
      (SELECT COUNT(*) FROM document_tags dt WHERE dt.tag_id = t.id) as document_count,
      (SELECT COUNT(*) FROM highlight_tags ht WHERE ht.tag_id = t.id) as highlight_count
    FROM tags t
    WHERE t.user_id = ?
    ORDER BY t.name ASC`,
    args: [user.id],
  });

  return NextResponse.json({ tags: rowsToObjects(rs) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const db = await getDb();
  const id = uuid();

  try {
    await db.execute({
      sql: "INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)",
      args: [id, user.id, name],
    });
    const rs = await db.execute({ sql: "SELECT * FROM tags WHERE id = ?", args: [id] });
    return NextResponse.json({ tag: firstRow(rs) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
  }
}
