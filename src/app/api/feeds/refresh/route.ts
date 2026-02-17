import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const result = db.prepare(
    "UPDATE feeds SET last_fetched_at = datetime('now') WHERE user_id = ?"
  ).run(user.id);

  return NextResponse.json({ refreshed: result.changes });
}
