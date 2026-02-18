import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, rowsToObjects, firstRow } from "@/lib/db";
import { parseUrl, countWords } from "@/lib/parser";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const location = sp.get("location");
  const category = sp.get("category");
  const search = sp.get("search");
  const sort = sp.get("sort") || "created_at";
  const order = sp.get("order") || "desc";
  const limit = parseInt(sp.get("limit") || "50");
  const offset = parseInt(sp.get("offset") || "0");

  const db = await getDb();
  let where = "WHERE d.user_id = ?";
  const params: (string | number)[] = [user.id];

  if (location) {
    where += " AND d.location = ?";
    params.push(location);
  }
  if (category) {
    where += " AND d.category = ?";
    params.push(category);
  }
  if (search) {
    where += " AND (d.title LIKE ? OR d.author LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const allowedSorts = ["created_at", "title", "updated_at", "reading_progress"];
  const sortCol = allowedSorts.includes(sort) ? sort : "created_at";
  const sortDir = order === "asc" ? "ASC" : "DESC";

  const totalRs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM documents d ${where}`,
    args: params,
  });
  const totalRow = firstRow(totalRs);

  const docsRs = await db.execute({
    sql: `SELECT d.* FROM documents d ${where} ORDER BY d.is_favorite DESC, d.${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    args: [...params, limit, offset],
  });
  const documents = rowsToObjects(docsRs);

  return NextResponse.json({ documents, total: (totalRow?.count as number) || 0 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = await getDb();
  const id = uuid();

  let title = body.title || "";
  let author = body.author || "";
  let content = body.content || "";
  let summary = "";
  let wordCount = 0;
  let coverImage = "";
  const category = body.category || "article";
  const url = body.url || "";
  const location = body.location || "inbox";

  if (url) {
    const parsed = await parseUrl(url);
    if (parsed) {
      title = title || parsed.title;
      author = author || parsed.author;
      content = parsed.content;
      summary = parsed.excerpt;
      wordCount = countWords(parsed.textContent);
    } else {
      title = title || url;
    }
  } else {
    wordCount = countWords(content.replace(/<[^>]*>/g, ""));
  }

  await db.execute({
    sql: `INSERT INTO documents (id, user_id, title, author, url, source, category, content, summary, cover_image, word_count, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, user.id, title, author, url, url ? "web" : "manual", category, content, summary, coverImage, wordCount, location],
  });

  const rs = await db.execute({ sql: "SELECT * FROM documents WHERE id = ?", args: [id] });
  const document = firstRow(rs);
  return NextResponse.json({ document }, { status: 201 });
}
