import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseUrl, countWords } from "@/lib/parser";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const parsed = await parseUrl(url);
  if (!parsed) {
    return NextResponse.json({ error: "Failed to parse URL" }, { status: 422 });
  }

  return NextResponse.json({
    title: parsed.title,
    author: parsed.author,
    excerpt: parsed.excerpt,
    wordCount: countWords(parsed.textContent),
    content: parsed.content,
  });
}
