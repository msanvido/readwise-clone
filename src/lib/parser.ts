import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ParsedArticle {
  title: string;
  content: string;
  textContent: string;
  author: string;
  excerpt: string;
  siteName: string;
  length: number;
}

export async function parseUrl(url: string): Promise<ParsedArticle | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReadwiseClone/1.0; +http://localhost)",
      },
    });
    const html = await response.text();
    return parseHtml(html, url);
  } catch {
    return null;
  }
}

export function parseHtml(html: string, url: string): ParsedArticle | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) return null;

    return {
      title: article.title || "",
      content: article.content || "",
      textContent: article.textContent || "",
      author: article.byline || "",
      excerpt: article.excerpt || "",
      siteName: article.siteName || "",
      length: article.length || 0,
    };
  } catch {
    return null;
  }
}

export function estimateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 230);
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
