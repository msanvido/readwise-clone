"use client";

import { Star, Tag, Pencil, Trash2 } from "lucide-react";
import type { Highlight } from "@/lib/types";
import clsx from "clsx";
import { useState } from "react";

export default function HighlightCard({
  highlight,
  documentTitle,
  documentAuthor,
  onFavorite,
  onDelete,
  onUpdateNote,
}: {
  highlight: Highlight;
  documentTitle?: string;
  documentAuthor?: string;
  onFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateNote?: (id: string, note: string) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(highlight.note || "");

  const handleSaveNote = () => {
    onUpdateNote?.(highlight.id, note);
    setEditingNote(false);
  };

  return (
    <div className="card group">
      {/* Highlight text */}
      <div className="border-l-4 border-highlight-yellow pl-4 py-1">
        <p className="text-sm leading-relaxed">{highlight.text}</p>
      </div>

      {/* Note */}
      {editingNote ? (
        <div className="mt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input text-sm min-h-[60px]"
            placeholder="Add a note..."
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveNote} className="btn btn-primary btn-sm">
              Save
            </button>
            <button
              onClick={() => setEditingNote(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : highlight.note ? (
        <div className="mt-3 bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-text-secondary font-medium mb-1">Note</p>
          <p className="text-sm">{highlight.note}</p>
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-text-muted">
          {documentTitle && (
            <span>
              {documentTitle}
              {documentAuthor && ` — ${documentAuthor}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditingNote(true)}
            className="btn-icon btn-ghost"
            title="Add note"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onFavorite && (
            <button
              onClick={() => onFavorite(highlight.id)}
              className="btn-icon btn-ghost"
              title="Favorite"
            >
              <Star
                className={clsx(
                  "w-3.5 h-3.5",
                  highlight.is_favorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-text-muted"
                )}
              />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(highlight.id)}
              className="btn-icon btn-ghost"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-text-muted" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
