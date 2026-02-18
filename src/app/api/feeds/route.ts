import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, rowsToObjects } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM feeds WHERE user_id = ? ORDER BY folder ASC, title ASC",
    args: [user.id],
  });
  const feeds = rowsToObjects(rs);
  const folders = [...new Set(feeds.map(f => f.folder as string).filter(Boolean))];

  return NextResponse.json({ feeds, folders });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, title, folder } = await request.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const db = await getDb();
  const id = uuid();

  try {
    await db.execute({
      sql: "INSERT INTO feeds (id, user_id, title, url, folder) VALUES (?, ?, ?, ?, ?)",
      args: [id, user.id, title || url, url, folder || ""],
    });
    const rs = await db.execute({ sql: "SELECT * FROM feeds WHERE id = ?", args: [id] });
    const feed = rowsToObjects(rs)[0];
    return NextResponse.json({ feed }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Feed already subscribed" }, { status: 409 });
  }
}
