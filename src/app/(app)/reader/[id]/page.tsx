"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Star, ExternalLink, Plus, Trash2, ChevronDown,
  Highlighter, PanelRightClose, PanelRightOpen, BookOpen
} from "lucide-react";
import clsx from "clsx";

interface Doc {
  id: string;
  title: string;
  author: string;
  content: string;
  url: string;
  category: string;
  word_count: number;
  reading_progress: number;
  is_favorite: number;
  location: string;
  published_at: string;
}

interface Hl {
  id: string;
  text: string;
  note: string;
  is_favorite: number;
  created_at: string;
}

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [highlights, setHighlights] = useState<Hl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [newHighlight, setNewHighlight] = useState("");
  const [locationMenu, setLocationMenu] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>(undefined);

  const fetchDocument = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDoc(data.document);
      setHighlights(data.highlights || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Track reading progress on scroll
  useEffect(() => {
    if (!doc) return;
    const handleScroll = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const progress = Math.min(scrollTop / docHeight, 1);
          fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reading_progress: Math.round(progress * 100) / 100 }),
          });
        }
      }, 2000);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [doc, id]);

  const toggleFavorite = async () => {
    if (!doc) return;
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: doc.is_favorite ? 0 : 1 }),
    });
    if (res.ok) {
      const data = await res.json();
      setDoc(data.document);
    }
  };

  const changeLocation = async (location: string) => {
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    });
    setDoc(prev => prev ? { ...prev, location } : null);
    setLocationMenu(false);
  };

  const addHighlight = async () => {
    if (!newHighlight.trim()) return;
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: id, text: newHighlight }),
    });
    if (res.ok) {
      const data = await res.json();
      setHighlights(prev => [data.highlight, ...prev]);
      setNewHighlight("");
    }
  };

  const deleteHighlight = async (hlId: string) => {
    await fetch(`/api/highlights/${hlId}`, { method: "DELETE" });
    setHighlights(prev => prev.filter(h => h.id !== hlId));
  };

  // Handle text selection to create highlights
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 5) {
      setNewHighlight(selection.toString().trim());
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <BookOpen className="w-12 h-12 text-text-muted mb-4" />
        <p className="text-text-secondary">Document not found</p>
        <a href="/library" className="btn btn-primary mt-4">Back to Library</a>
      </div>
    );
  }

  const readingTime = Math.ceil(doc.word_count / 230);

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="/library" className="btn-icon btn-ghost">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate max-w-md">{doc.title}</h1>
              <p className="text-xs text-text-muted">
                {doc.author && `${doc.author} · `}
                {readingTime} min read
                {doc.reading_progress > 0 && ` · ${Math.round(doc.reading_progress * 100)}% done`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Location dropdown */}
            <div className="relative">
              <button
                onClick={() => setLocationMenu(!locationMenu)}
                className="btn btn-sm btn-secondary gap-1 capitalize"
              >
                {doc.location}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {locationMenu && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-30">
                  {["inbox", "later", "shortlist", "archive"].map(loc => (
                    <button
                      key={loc}
                      onClick={() => changeLocation(loc)}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-sm hover:bg-surface-hover capitalize",
                        doc.location === loc && "text-brand font-medium"
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFavorite} className="btn-icon btn-ghost">
              <Star className={clsx("w-5 h-5", doc.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-text-muted")} />
            </button>

            {doc.url && (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-icon btn-ghost">
                <ExternalLink className="w-5 h-5" />
              </a>
            )}

            <button onClick={() => setShowPanel(!showPanel)} className="btn-icon btn-ghost">
              {showPanel ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="h-0.5 bg-surface-secondary">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${(doc.reading_progress || 0) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex">
        {/* Main content */}
        <article
          ref={contentRef}
          className={clsx("flex-1 transition-all", showPanel ? "mr-80" : "")}
          onMouseUp={handleMouseUp}
        >
          <div className="max-w-2xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold mb-3 leading-tight">{doc.title}</h1>
            {doc.author && <p className="text-text-secondary mb-6">{doc.author}</p>}
            <div
              className="reading-content"
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          </div>
        </article>

        {/* Highlights panel */}
        {showPanel && (
          <aside className="w-80 fixed right-0 top-[57px] bottom-0 bg-surface border-l border-border overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Highlighter className="w-4 h-4 text-brand" />
                  Highlights ({highlights.length})
                </h2>
              </div>

              {/* Add highlight input */}
              <div className="mb-4">
                <textarea
                  value={newHighlight}
                  onChange={e => setNewHighlight(e.target.value)}
                  placeholder="Select text in the article or type a highlight here..."
                  className="input text-sm min-h-[80px] resize-y"
                  rows={3}
                />
                <button
                  onClick={addHighlight}
                  disabled={!newHighlight.trim()}
                  className="btn btn-primary btn-sm w-full mt-2 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Highlight
                </button>
              </div>

              {/* Highlights list */}
              <div className="space-y-3">
                {highlights.map(hl => (
                  <div key={hl.id} className="group rounded-lg bg-surface-secondary p-3">
                    <div className="border-l-3 border-highlight-yellow pl-3">
                      <p className="text-xs leading-relaxed">{hl.text}</p>
                    </div>
                    {hl.note && (
                      <p className="text-xs text-text-secondary mt-2 italic">{hl.note}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-muted">
                        {new Date(hl.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteHighlight(hl.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-text-muted hover:text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
                {highlights.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-6">
                    No highlights yet. Select text in the article or type above to add one.
                  </p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
