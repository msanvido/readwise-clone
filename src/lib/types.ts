export interface Document {
  id: string;
  user_id: string;
  title: string;
  author: string;
  url: string;
  source: string;
  category: "article" | "book" | "pdf" | "epub" | "email" | "tweet" | "video" | "podcast";
  content: string;
  summary: string;
  cover_image: string;
  word_count: number;
  reading_progress: number;
  location: "inbox" | "later" | "shortlist" | "archive" | "feed";
  is_favorite: number;
  is_feed: number;
  parent_feed_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_opened_at: string | null;
}

export interface Highlight {
  id: string;
  user_id: string;
  document_id: string;
  text: string;
  note: string;
  color: string;
  location_start: number;
  location_end: number;
  is_favorite: number;
  is_discard: number;
  review_count: number;
  next_review_at: string | null;
  review_interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Feed {
  id: string;
  user_id: string;
  title: string;
  url: string;
  folder: string;
  last_fetched_at: string | null;
  created_at: string;
}

export interface ReviewItem {
  highlight: Highlight;
  document: Document;
  tags: Tag[];
}
