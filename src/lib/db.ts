import { createClient, type Client, type InStatement, type ResultSet, type Row } from "@libsql/client";

let client: Client;
let initialized = false;

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function getDb(): Promise<Client> {
  const c = getClient();
  if (!initialized) {
    await initializeDatabase(c);
    initialized = true;
  }
  return c;
}

async function initializeDatabase(client: Client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      folder TEXT DEFAULT '',
      last_fetched_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, url)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      url TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      category TEXT DEFAULT 'article',
      content TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      reading_progress REAL DEFAULT 0,
      location TEXT DEFAULT 'inbox',
      is_favorite INTEGER DEFAULT 0,
      is_feed INTEGER DEFAULT 0,
      parent_feed_id TEXT REFERENCES feeds(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      published_at TEXT,
      last_opened_at TEXT
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      note TEXT DEFAULT '',
      color TEXT DEFAULT 'yellow',
      location_start INTEGER DEFAULT 0,
      location_end INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      is_discard INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      next_review_at TEXT,
      review_interval_days REAL DEFAULT 7,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS document_tags (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (document_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS highlight_tags (
      highlight_id TEXT NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (highlight_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS daily_review_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      highlight_id TEXT NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      reviewed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_location ON documents(user_id, location);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(user_id, category);
    CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id);
    CREATE INDEX IF NOT EXISTS idx_highlights_document ON highlights(document_id);
    CREATE INDEX IF NOT EXISTS idx_highlights_review ON highlights(user_id, next_review_at);
    CREATE INDEX IF NOT EXISTS idx_feeds_user ON feeds(user_id);
    CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
  `);
}

// Helper: convert a Row to a plain object
export function rowToObj(row: Row, columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const col of columns) {
    obj[col] = row[col];
  }
  return obj;
}

// Helper: convert a full ResultSet to array of plain objects
export function rowsToObjects(rs: ResultSet): Record<string, unknown>[] {
  return rs.rows.map(row => rowToObj(row, rs.columns));
}

// Helper: get first row as object or null
export function firstRow(rs: ResultSet): Record<string, unknown> | null {
  if (rs.rows.length === 0) return null;
  return rowToObj(rs.rows[0], rs.columns);
}
