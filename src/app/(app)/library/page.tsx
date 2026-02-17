"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Inbox, Clock, Star, Archive, Library, Filter,
  BookOpen, FileText, Mail, Video, Mic, Rss, Highlighter, X
} from "lucide-react";
import clsx from "clsx";

interface Doc {
  id: string;
  title: string;
  author: string;
  category: string;
  word_count: number;
  reading_progress: number;
  is_favorite: number;
  location: string;
  url: string;
  created_at: string;
  cover_image: string;
}

interface HighlightItem {
  id: string;
  text: string;
  note: string;
  is_favorite: number;
  document_title: string;
  document_author: string;
  created_at: string;
}

const locationTabs = [
  { key: "", label: "All", icon: Library },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "later", label: "Later", icon: Clock },
  { key: "shortlist", label: "Shortlist", icon: Star },
  { key: "archive", label: "Archive", icon: Archive },
];

const categories = [
  { value: "", label: "All Types" },
  { value: "article", label: "Articles" },
  { value: "book", label: "Books" },
  { value: "pdf", label: "PDFs" },
  { value: "email", label: "Emails" },
  { value: "tweet", label: "Tweets" },
  { value: "video", label: "Videos" },
  { value: "podcast", label: "Podcasts" },
];

const catIcons: Record<string, typeof FileText> = {
  book: BookOpen, article: FileText, pdf: FileText, email: Mail,
  tweet: FileText, video: Video, podcast: Mic, rss: Rss,
};

export default function LibraryPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" /></div>}>
      <LibraryPage />
    </Suspense>
  );
}

function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewMode = searchParams.get("view");
  const locationParam = searchParams.get("location") || "";
  const categoryParam = searchParams.get("category") || "";

  const [documents, setDocuments] = useState<Doc[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (locationParam) params.set("location", locationParam);
    if (categoryParam) params.set("category", categoryParam);
    if (search) params.set("search", search);
    params.set("limit", "50");

    const res = await fetch(`/api/documents?${params}`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
      setTotal(data.total);
    }
    setLoading(false);
  }, [locationParam, categoryParam, search]);

  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "50");

    const res = await fetch(`/api/highlights?${params}`);
    if (res.ok) {
      const data = await res.json();
      setHighlights(data.highlights);
      setTotal(data.total);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    if (viewMode === "highlights") {
      fetchHighlights();
    } else {
      fetchDocuments();
    }
  }, [viewMode, fetchDocuments, fetchHighlights]);

  const setLocationFilter = (loc: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (loc) params.set("location", loc); else params.delete("location");
    params.delete("view");
    router.push(`/library?${params}`);
  };

  const setCategoryFilter = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set("category", cat); else params.delete("category");
    router.push(`/library?${params}`);
  };

  const toggleFavorite = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: doc.is_favorite ? 0 : 1 }),
    });
    setDocuments(prev => prev.map(d =>
      d.id === id ? { ...d, is_favorite: d.is_favorite ? 0 : 1 } : d
    ));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">
          {viewMode === "highlights" ? "All Highlights" : "Library"}
        </h1>

        {/* Location tabs */}
        {viewMode !== "highlights" && (
          <div className="flex gap-1 mb-4">
            {locationTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setLocationFilter(tab.key)}
                  className={clsx(
                    "btn btn-sm gap-2",
                    locationParam === tab.key ? "btn-primary" : "btn-ghost"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
            <button
              onClick={() => router.push("/library?view=highlights")}
              className={clsx(
                "btn btn-sm gap-2 ml-2",
                viewMode === "highlights" ? "btn-primary" : "btn-ghost"
              )}
            >
              <Highlighter className="w-3.5 h-3.5" />
              Highlights
            </button>
          </div>
        )}

        {/* Search and filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={viewMode === "highlights" ? "Search highlights..." : "Search documents..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (viewMode === "highlights" ? fetchHighlights() : fetchDocuments())}
              className="input pl-9"
            />
            {search && (
              <button onClick={() => { setSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>

          {viewMode !== "highlights" && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <select
                value={categoryParam}
                onChange={e => setCategoryFilter(e.target.value)}
                className="input w-auto pr-8"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-sm text-text-muted">{total} items</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
        </div>
      ) : viewMode === "highlights" ? (
        /* Highlights view */
        <div className="space-y-3">
          {highlights.length === 0 ? (
            <EmptyState message="No highlights yet. Start reading and highlighting!" icon={Highlighter} />
          ) : highlights.map(h => (
            <div key={h.id} className="card group">
              <div className="border-l-4 border-highlight-yellow pl-4 py-1">
                <p className="text-sm leading-relaxed">{h.text}</p>
              </div>
              {h.note && (
                <div className="mt-2 bg-surface-secondary rounded-lg p-3">
                  <p className="text-xs text-text-secondary">{h.note}</p>
                </div>
              )}
              <div className="mt-2 text-xs text-text-muted">
                {h.document_title}{h.document_author && ` — ${h.document_author}`}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Documents grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                message={locationParam
                  ? `No documents in ${locationParam}. Save some articles!`
                  : "Your library is empty. Add your first article!"}
                icon={Library}
              />
            </div>
          ) : documents.map(doc => {
            const CatIcon = catIcons[doc.category] || FileText;
            const readingTime = Math.ceil(doc.word_count / 230);
            return (
              <a
                key={doc.id}
                href={`/reader/${doc.id}`}
                className="card hover:shadow-md transition-all group block"
              >
                <div className="flex gap-3">
                  <div className="w-14 h-18 rounded-lg bg-surface-secondary flex items-center justify-center flex-shrink-0">
                    {doc.cover_image ? (
                      <img src={doc.cover_image} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <CatIcon className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-brand transition-colors">
                      {doc.title}
                    </h3>
                    {doc.author && <p className="text-xs text-text-secondary mt-0.5 truncate">{doc.author}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-text-muted flex-wrap">
                      <span className="badge badge-brand capitalize">{doc.category}</span>
                      {doc.word_count > 0 && <span>{readingTime} min</span>}
                      {doc.reading_progress > 0 && <span>{Math.round(doc.reading_progress * 100)}%</span>}
                    </div>
                    {doc.reading_progress > 0 && doc.reading_progress < 1 && (
                      <div className="mt-2 h-1 bg-surface-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${doc.reading_progress * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(doc.id); }}
                    className="self-start opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Star className={clsx("w-4 h-4", doc.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-text-muted")} />
                  </button>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon: typeof Library }) {
  return (
    <div className="text-center py-20">
      <Icon className="w-12 h-12 text-text-muted mx-auto mb-4" />
      <p className="text-text-secondary">{message}</p>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-add-modal"))}
        className="btn btn-primary mt-4"
      >
        Add Content
      </button>
    </div>
  );
}
