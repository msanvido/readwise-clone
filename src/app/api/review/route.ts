import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, rowsToObjects, firstRow } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Unreviewed highlights (never reviewed)
  const unreviewedRs = await db.execute({
    sql: `SELECT h.*, d.title as document_title, d.author as document_author,
           d.category as document_category, d.cover_image as document_cover_image
    FROM highlights h
    LEFT JOIN documents d ON d.id = h.document_id
    WHERE h.user_id = ? AND h.review_count = 0 AND h.is_discard = 0
    ORDER BY RANDOM()
    LIMIT 5`,
    args: [user.id],
  });

  // Due for review (spaced repetition)
  const dueRs = await db.execute({
    sql: `SELECT h.*, d.title as document_title, d.author as document_author,
           d.category as document_category, d.cover_image as document_cover_image
    FROM highlights h
    LEFT JOIN documents d ON d.id = h.document_id
    WHERE h.user_id = ? AND h.next_review_at <= ? AND h.is_discard = 0 AND h.review_count > 0
    ORDER BY h.next_review_at ASC
    LIMIT 10`,
    args: [user.id, now],
  });

  const allItems = [...rowsToObjects(unreviewedRs), ...rowsToObjects(dueRs)];

  // Get tags for each highlight
  const items = [];
  for (const item of allItems) {
    const tagsRs = await db.execute({
      sql: `SELECT t.* FROM tags t
        JOIN highlight_tags ht ON ht.tag_id = t.id
        WHERE ht.highlight_id = ?`,
      args: [item.id as string],
    });

    items.push({
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
      tags: rowsToObjects(tagsRs),
    });
  }

  // Count reviewed today
  const todayRs = await db.execute({
    sql: "SELECT COUNT(*) as count FROM daily_review_log WHERE user_id = ? AND reviewed_at >= ?",
    args: [user.id, todayStart.toISOString()],
  });
  const reviewedToday = firstRow(todayRs);

  return NextResponse.json({
    items,
    total: items.length,
    reviewed_today: (reviewedToday?.count as number) || 0,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { highlight_id, action } = await request.json();
  if (!highlight_id || !action) {
    return NextResponse.json({ error: "highlight_id and action are required" }, { status: 400 });
  }

  const db = await getDb();
  const hlRs = await db.execute({
    sql: "SELECT * FROM highlights WHERE id = ? AND user_id = ?",
    args: [highlight_id, user.id],
  });
  const highlight = firstRow(hlRs);
  if (!highlight) return NextResponse.json({ error: "Highlight not found" }, { status: 404 });

  const now = new Date();

  switch (action) {
    case "keep": {
      const newInterval = (highlight.review_interval_days as number) * 2;
      const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
      await db.execute({
        sql: `UPDATE highlights SET review_count = review_count + 1, review_interval_days = ?,
          next_review_at = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [newInterval, nextReview.toISOString(), highlight_id],
      });
      break;
    }
    case "soon": {
      const nextReview = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      await db.execute({
        sql: `UPDATE highlights SET review_count = review_count + 1, review_interval_days = 3,
          next_review_at = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [nextReview.toISOString(), highlight_id],
      });
      break;
    }
    case "later": {
      const nextReview = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      await db.execute({
        sql: `UPDATE highlights SET review_count = review_count + 1, review_interval_days = 14,
          next_review_at = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [nextReview.toISOString(), highlight_id],
      });
      break;
    }
    case "someday": {
      const nextReview = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.execute({
        sql: `UPDATE highlights SET review_count = review_count + 1, review_interval_days = 30,
          next_review_at = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [nextReview.toISOString(), highlight_id],
      });
      break;
    }
    case "discard": {
      await db.execute({
        sql: "UPDATE highlights SET is_discard = 1, updated_at = datetime('now') WHERE id = ?",
        args: [highlight_id],
      });
      break;
    }
    case "favorite": {
      const newVal = highlight.is_favorite ? 0 : 1;
      await db.execute({
        sql: "UPDATE highlights SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?",
        args: [newVal, highlight_id],
      });
      break;
    }
  }

  // Log the review
  await db.execute({
    sql: "INSERT INTO daily_review_log (id, user_id, highlight_id, action) VALUES (?, ?, ?, ?)",
    args: [uuid(), user.id, highlight_id, action],
  });

  return NextResponse.json({ success: true });
}
