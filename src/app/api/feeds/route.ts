import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const feeds = db.prepare(
    "SELECT * FROM feeds WHERE user_id = ? ORDER BY folder ASC, title ASC"
  ).all(user.id);

  const folders = [...new Set((feeds as { folder: string }[]).map(f => f.folder).filter(Boolean))];

  return NextResponse.json({ feeds, folders });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, title, folder } = await request.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const db = getDb();
  const id = uuid();

  try {
    db.prepare(
      "INSERT INTO feeds (id, user_id, title, url, folder) VALUES (?, ?, ?, ?, ?)"
    ).run(id, user.id, title || url, url, folder || "");

    const feed = db.prepare("SELECT * FROM feeds WHERE id = ?").get(id);
    return NextResponse.json({ feed }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Feed already subscribed" }, { status: 409 });
  }
}
