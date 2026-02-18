import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rs = await db.execute({
    sql: "UPDATE feeds SET last_fetched_at = datetime('now') WHERE user_id = ?",
    args: [user.id],
  });

  return NextResponse.json({ refreshed: rs.rowsAffected });
}
