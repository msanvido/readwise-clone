"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RotateCcw, Star, Clock, CalendarDays, ThumbsDown,
  Check, Pencil, BookOpen, ArrowRight, Zap
} from "lucide-react";
import clsx from "clsx";

interface ReviewItem {
  highlight: {
    id: string;
    text: string;
    note: string;
    is_favorite: number;
    review_count: number;
  };
  document: {
    title: string;
    author: string;
    category: string;
    cover_image: string;
  };
  tags: { id: string; name: string }[];
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [animating, setAnimating] = useState(false);

  const fetchReview = useCallback(async () => {
    const res = await fetch("/api/review");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotalItems(data.total);
      setReviewedToday(data.reviewed_today);
      setCurrentIndex(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleAction = async (action: string) => {
    const current = items[currentIndex];
    if (!current || animating) return;

    setAnimating(true);

    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlight_id: current.highlight.id, action }),
    });

    setReviewedToday(prev => prev + 1);

    setTimeout(() => {
      setItems(prev => prev.filter((_, i) => i !== currentIndex));
      if (currentIndex >= items.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      setAnimating(false);
      setEditingNote(false);
      setNoteText("");
    }, 300);
  };

  const saveNote = async () => {
    const current = items[currentIndex];
    if (!current) return;
    await fetch(`/api/highlights/${current.highlight.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    setItems(prev => prev.map((item, i) =>
      i === currentIndex ? { ...item, highlight: { ...item.highlight, note: noteText } } : item
    ));
    setEditingNote(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingNote) return;
      switch (e.key) {
        case "1": handleAction("keep"); break;
        case "2": handleAction("soon"); break;
        case "3": handleAction("later"); break;
        case "4": handleAction("someday"); break;
        case "5": handleAction("discard"); break;
        case "f": handleAction("favorite"); break;
        case "n": setEditingNote(true); setNoteText(items[currentIndex]?.highlight.note || ""); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  const current = items[currentIndex];
  const completed = !current || items.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-surface">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-brand" />
            <h1 className="text-lg font-bold">Daily Review</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              {reviewedToday} reviewed today
            </span>
            {!completed && (
              <span>{items.length} remaining</span>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {!completed && totalItems > 0 && (
        <div className="h-1 bg-surface-secondary">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${((totalItems - items.length) / totalItems) * 100}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {completed ? (
          /* Completion screen */
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">All done for today!</h2>
            <p className="text-text-secondary mb-6">
              You reviewed {reviewedToday} highlight{reviewedToday !== 1 ? "s" : ""} today.
              {reviewedToday === 0 && " No highlights to review right now."}
            </p>
            <div className="flex gap-3 justify-center">
              <a href="/library" className="btn btn-primary gap-2">
                <BookOpen className="w-4 h-4" />
                Go to Library
              </a>
              <button onClick={fetchReview} className="btn btn-secondary gap-2">
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        ) : (
          /* Review card */
          <div className={clsx(
            "w-full max-w-2xl transition-all duration-300",
            animating && "opacity-0 translate-x-8"
          )}>
            <div className="review-card">
              {/* Source info */}
              <div className="flex items-center gap-2 mb-6">
                <span className="badge badge-brand capitalize">{current.document.category}</span>
                <span className="text-sm text-text-secondary truncate">
                  {current.document.title}
                </span>
                {current.document.author && (
                  <span className="text-sm text-text-muted">— {current.document.author}</span>
                )}
              </div>

              {/* Highlight text */}
              <blockquote className="text-xl leading-relaxed mb-6 font-serif border-l-4 border-brand pl-6 py-2">
                {current.highlight.text}
              </blockquote>

              {/* Note */}
              {editingNote ? (
                <div className="mb-6">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add your thoughts..."
                    className="input min-h-[80px]"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveNote} className="btn btn-primary btn-sm">Save Note</button>
                    <button onClick={() => setEditingNote(false)} className="btn btn-ghost btn-sm">Cancel</button>
                  </div>
                </div>
              ) : current.highlight.note ? (
                <div className="mb-6 bg-surface-secondary rounded-lg p-4">
                  <p className="text-sm text-text-secondary font-medium mb-1">Your note:</p>
                  <p className="text-sm">{current.highlight.note}</p>
                  <button
                    onClick={() => { setEditingNote(true); setNoteText(current.highlight.note); }}
                    className="text-xs text-brand mt-2 hover:underline"
                  >
                    Edit note
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingNote(true); setNoteText(""); }}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-6"
                >
                  <Pencil className="w-3.5 h-3.5" /> Add note
                </button>
              )}

              {/* Tags */}
              {current.tags.length > 0 && (
                <div className="flex gap-1 mb-6 flex-wrap">
                  {current.tags.map(tag => (
                    <span key={tag.id} className="badge bg-surface-secondary text-text-secondary">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-border flex-wrap">
                <button
                  onClick={() => handleAction("keep")}
                  className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100 gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Keep
                  <kbd className="text-[10px] opacity-50 ml-1">1</kbd>
                </button>
                <button
                  onClick={() => handleAction("soon")}
                  className="btn btn-sm bg-yellow-50 text-yellow-700 hover:bg-yellow-100 gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Soon
                  <kbd className="text-[10px] opacity-50 ml-1">2</kbd>
                </button>
                <button
                  onClick={() => handleAction("later")}
                  className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Later
                  <kbd className="text-[10px] opacity-50 ml-1">3</kbd>
                </button>
                <button
                  onClick={() => handleAction("someday")}
                  className="btn btn-sm bg-gray-50 text-gray-600 hover:bg-gray-100 gap-1"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Someday
                  <kbd className="text-[10px] opacity-50 ml-1">4</kbd>
                </button>
                <button
                  onClick={() => handleAction("discard")}
                  className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 gap-1"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Discard
                  <kbd className="text-[10px] opacity-50 ml-1">5</kbd>
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button
                  onClick={() => handleAction("favorite")}
                  className={clsx(
                    "btn btn-sm btn-ghost gap-1",
                    current.highlight.is_favorite && "text-yellow-500"
                  )}
                >
                  <Star className={clsx("w-3.5 h-3.5", current.highlight.is_favorite && "fill-current")} />
                  <kbd className="text-[10px] opacity-50">F</kbd>
                </button>
              </div>
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-xs text-text-muted mt-4">
              Press 1-5 for actions, F for favorite, N for note
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
