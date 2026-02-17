"use client";

import { Clock, Star, BookOpen, FileText, Rss, Mail, Video, Mic } from "lucide-react";
import type { Document } from "@/lib/types";
import clsx from "clsx";

const categoryIcons: Record<string, typeof BookOpen> = {
  book: BookOpen,
  article: FileText,
  pdf: FileText,
  epub: BookOpen,
  email: Mail,
  tweet: FileText,
  video: Video,
  podcast: Mic,
  rss: Rss,
};

export default function DocumentCard({
  document: doc,
  onFavorite,
}: {
  document: Document;
  onFavorite?: (id: string) => void;
}) {
  const Icon = categoryIcons[doc.category] || FileText;
  const readingTime = Math.ceil(doc.word_count / 230);

  return (
    <a
      href={`/reader/${doc.id}`}
      className="card hover:shadow-md transition-shadow group block"
    >
      <div className="flex gap-4">
        {/* Cover image or icon */}
        <div className="w-16 h-20 rounded-lg bg-surface-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
          {doc.cover_image ? (
            <img
              src={doc.cover_image}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="w-6 h-6 text-text-muted" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-brand transition-colors">
            {doc.title}
          </h3>
          {doc.author && (
            <p className="text-xs text-text-secondary mt-0.5">{doc.author}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span className="badge badge-brand capitalize">{doc.category}</span>
            {doc.word_count > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readingTime} min
              </span>
            )}
            {doc.reading_progress > 0 && (
              <span>{Math.round(doc.reading_progress * 100)}% read</span>
            )}
          </div>

          {/* Progress bar */}
          {doc.reading_progress > 0 && doc.reading_progress < 1 && (
            <div className="mt-2 h-1 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${doc.reading_progress * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Favorite */}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(doc.id);
            }}
            className="btn-icon btn-ghost self-start opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star
              className={clsx(
                "w-4 h-4",
                doc.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-text-muted"
              )}
            />
          </button>
        )}
      </div>
    </a>
  );
}
