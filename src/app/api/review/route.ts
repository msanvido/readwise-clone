import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Unreviewed highlights (never reviewed)
  const unreviewed = db.prepare(`
    SELECT h.*, d.title as document_title, d.author as document_author,
           d.category as document_category, d.cover_image as document_cover_image
    FROM highlights h
    LEFT JOIN documents d ON d.id = h.document_id
    WHERE h.user_id = ? AND h.review_count = 0 AND h.is_discard = 0
    ORDER BY RANDOM()
    LIMIT 5
  `).all(user.id);

  // Due for review (spaced repetition)
  const dueForReview = db.prepare(`
    SELECT h.*, d.title as document_title, d.author as document_author,
           d.category as document_category, d.cover_image as document_cover_image
    FROM highlights h
    LEFT JOIN documents d ON d.id = h.document_id
    WHERE h.user_id = ? AND h.next_review_at <= ? AND h.is_discard = 0 AND h.review_count > 0
    ORDER BY h.next_review_at ASC
    LIMIT 10
  `).all(user.id, now);

  // Combine items
  const allItems = [...unreviewed, ...dueForReview];

  // Get tags for each highlight
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (allItems as any[]).map((item) => {
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN highlight_tags ht ON ht.tag_id = t.id
      WHERE ht.highlight_id = ?
    `).all(item.id as string);

    return {
      highlight: {
        id: item.id,
        user_id: item.user_id,
        document_id: item.document_id,
        text: item.text,
        note: item.note,
        color: item.color,
        location_start: item.location_start,
        location_end: item.location_end,
        is_favorite: item.is_favorite,
        is_discard: item.is_discard,
        review_count: item.review_count,
        next_review_at: item.next_review_at,
        review_interval_days: item.review_interval_days,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
      document: {
        title: item.document_title,
        author: item.document_author,
        category: item.document_category,
        cover_image: item.document_cover_image,
      },
      tags,
    };
  });

  // Count reviewed today
  const reviewedToday = db.prepare(`
    SELECT COUNT(*) as count FROM daily_review_log
    WHERE user_id = ? AND reviewed_at >= ?
  `).get(user.id, todayStart.toISOString()) as { count: number };

  return NextResponse.json({
    items,
    total: items.length,
    reviewed_today: reviewedToday.count,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { highlight_id, action } = await request.json();
  if (!highlight_id || !action) {
    return NextResponse.json({ error: "highlight_id and action are required" }, { status: 400 });
  }

  const db = getDb();
  const highlight = db.prepare(
    "SELECT * FROM highlights WHERE id = ? AND user_id = ?"
  ).get(highlight_id, user.id) as { review_interval_days: number; review_count: number; is_favorite: number } | undefined;

  if (!highlight) return NextResponse.json({ error: "Highlight not found" }, { status: 404 });

  const now = new Date();

  switch (action) {
    case "keep": {
      const newInterval = highlight.review_interval_days * 2;
      const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
      db.prepare(`
        UPDATE highlights SET review_count = review_count + 1, review_interval_days = ?,
        next_review_at = ?, updated_at = datetime('now') WHERE id = ?
      `).run(newInterval, nextReview.toISOString(), highlight_id);
      break;
    }
    case "soon": {
      const nextReview = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      db.prepare(`
        UPDATE highlights SET review_count = review_count + 1, review_interval_days = 3,
        next_review_at = ?, updated_at = datetime('now') WHERE id = ?
      `).run(nextReview.toISOString(), highlight_id);
      break;
    }
    case "later": {
      const nextReview = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      db.prepare(`
        UPDATE highlights SET review_count = review_count + 1, review_interval_days = 14,
        next_review_at = ?, updated_at = datetime('now') WHERE id = ?
      `).run(nextReview.toISOString(), highlight_id);
      break;
    }
    case "someday": {
      const nextReview = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      db.prepare(`
        UPDATE highlights SET review_count = review_count + 1, review_interval_days = 30,
        next_review_at = ?, updated_at = datetime('now') WHERE id = ?
      `).run(nextReview.toISOString(), highlight_id);
      break;
    }
    case "discard": {
      db.prepare(
        "UPDATE highlights SET is_discard = 1, updated_at = datetime('now') WHERE id = ?"
      ).run(highlight_id);
      break;
    }
    case "favorite": {
      const newVal = highlight.is_favorite ? 0 : 1;
      db.prepare(
        "UPDATE highlights SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newVal, highlight_id);
      break;
    }
  }

  // Log the review
  db.prepare(
    "INSERT INTO daily_review_log (id, user_id, highlight_id, action) VALUES (?, ?, ?, ?)"
  ).run(uuid(), user.id, highlight_id, action);

  return NextResponse.json({ success: true });
}
