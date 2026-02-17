import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const documentId = sp.get("document_id");
  const search = sp.get("search");
  const isFavorite = sp.get("is_favorite");
  const limit = parseInt(sp.get("limit") || "50");
  const offset = parseInt(sp.get("offset") || "0");

  const db = getDb();
  let where = "WHERE h.user_id = ? AND h.is_discard = 0";
  const params: (string | number)[] = [user.id];

  if (documentId) {
    where += " AND h.document_id = ?";
    params.push(documentId);
  }
  if (search) {
    where += " AND h.text LIKE ?";
    params.push(`%${search}%`);
  }
  if (isFavorite === "1") {
    where += " AND h.is_favorite = 1";
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM highlights h ${where}`
  ).get(...params) as { count: number };

  const highlights = db.prepare(`
    SELECT h.*, d.title as document_title, d.author as document_author, d.category as document_category
    FROM highlights h
    LEFT JOIN documents d ON d.id = h.document_id
    ${where}
    ORDER BY h.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return NextResponse.json({ highlights, total: total.count });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.document_id || !body.text) {
    return NextResponse.json({ error: "document_id and text are required" }, { status: 400 });
  }

  const db = getDb();
  const id = uuid();
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 7);

  db.prepare(`
    INSERT INTO highlights (id, user_id, document_id, text, note, color, location_start, location_end, next_review_at, review_interval_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    body.document_id,
    body.text,
    body.note || "",
    body.color || "yellow",
    body.location_start || 0,
    body.location_end || 0,
    nextReview.toISOString(),
    7
  );

  const highlight = db.prepare("SELECT * FROM highlights WHERE id = ?").get(id);
  return NextResponse.json({ highlight }, { status: 201 });
}
