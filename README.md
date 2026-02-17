# Readwise Clone

A full-featured Readwise & Reader clone built with Next.js, TypeScript, Tailwind CSS, and SQLite. Save articles, manage highlights, review with spaced repetition, and subscribe to RSS feeds.

## Features

### Library (Readwise Core)
- **Document Management** — Save articles from URL (auto-parsed), manual entry, or import
- **Smart Organization** — Inbox, Later, Shortlist, Archive locations
- **Category Filtering** — Articles, Books, PDFs, Emails, Tweets, Videos, Podcasts
- **Search** — Full-text search across all documents and highlights
- **Favorites** — Star important documents and highlights
- **Tags** — Organize with custom tags on documents and highlights
- **Reading Progress** — Track how far you've read in each document
- **CSV Export** — Export all highlights to CSV for use in other tools
- **Bulk Import** — Paste highlights to import them in bulk

### Reader
- **Clean Reading View** — Distraction-free article reading with serif typography
- **Article Parsing** — Automatically extracts content from any URL using Mozilla Readability
- **Highlighting** — Select text or manually add highlights while reading
- **Notes** — Add personal annotations to any highlight
- **Highlights Panel** — Side panel showing all highlights for the current document
- **Reading Progress** — Auto-tracked as you scroll
- **Location Management** — Move documents between Inbox/Later/Shortlist/Archive

### Daily Review (Spaced Repetition)
- **Flashcard-style Review** — One highlight at a time, centered card UI
- **Spaced Repetition Algorithm** — Highlights resurface based on review intervals
- **Review Actions** — Keep, Soon (3d), Later (14d), Someday (30d), Discard
- **Keyboard Shortcuts** — 1-5 for actions, F for favorite, N for notes
- **Progress Tracking** — See how many highlights reviewed today
- **Completion Screen** — Satisfying "all done" state

### RSS Feeds
- **Subscribe to Feeds** — Add RSS feed URLs
- **Folder Organization** — Group feeds into folders
- **Feed Management** — Edit, delete, refresh feeds

### Authentication
- **Email/Password Auth** — JWT-based authentication
- **Secure Sessions** — HttpOnly cookies, 30-day expiry

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT (jose) + bcrypt
- **Article Parsing**: Mozilla Readability + JSDOM
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd readwise-clone
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
JWT_SECRET=your-secret-key-change-this-in-production
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deploying to Vercel

### Option 1: Vercel with Serverless SQLite (Development/Demo)

> **Note**: SQLite with file-based storage works in Vercel's serverless functions but data is **ephemeral** — it resets on each deployment and may not persist between function invocations. This is fine for demos.

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Set environment variable: `JWT_SECRET=your-production-secret`
4. Deploy!

### Option 2: Production Deployment (Recommended)

For persistent data in production, you should swap SQLite for a hosted database:

1. **Turso** (SQLite-compatible, serverless) — Drop-in replacement via `@libsql/client`
2. **Vercel Postgres** — Use `@vercel/postgres`
3. **PlanetScale** — MySQL-compatible serverless DB
4. **Supabase** — PostgreSQL with built-in auth

To use Turso (easiest migration from SQLite):

```bash
npm install @libsql/client
```

Then update `src/lib/db.ts` to use the Turso client instead of better-sqlite3.

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app pages
│   │   ├── library/        # Document library
│   │   ├── reader/[id]/    # Reading view
│   │   ├── review/         # Daily review
│   │   ├── feeds/          # RSS feeds
│   │   └── settings/       # User settings
│   ├── (auth)/             # Auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── api/                # API routes
│   │   ├── auth/           # Auth endpoints
│   │   ├── documents/      # Document CRUD
│   │   ├── highlights/     # Highlight CRUD
│   │   ├── feeds/          # RSS feed management
│   │   ├── review/         # Daily review endpoints
│   │   ├── tags/           # Tag management
│   │   └── parse/          # URL parsing
│   ├── globals.css         # Global styles + Tailwind
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root redirect
├── components/
│   ├── layout/             # Sidebar, modals
│   └── ui/                 # Reusable UI components
└── lib/
    ├── auth.ts             # Authentication utilities
    ├── db.ts               # Database initialization
    ├── parser.ts           # Article parsing (Readability)
    └── types.ts            # TypeScript interfaces
```

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/signup` | POST | Create account |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/me` | GET | Current user |
| `/api/documents` | GET/POST | List/create documents |
| `/api/documents/[id]` | GET/PATCH/DELETE | Document CRUD |
| `/api/highlights` | GET/POST | List/create highlights |
| `/api/highlights/[id]` | GET/PATCH/DELETE | Highlight CRUD |
| `/api/feeds` | GET/POST | List/subscribe feeds |
| `/api/feeds/[id]` | GET/PATCH/DELETE | Feed CRUD |
| `/api/feeds/refresh` | POST | Refresh all feeds |
| `/api/review` | GET/POST | Get review items / record review |
| `/api/tags` | GET/POST | List/create tags |
| `/api/tags/[id]` | DELETE | Delete tag |
| `/api/parse` | POST | Parse URL content |

## License

MIT
