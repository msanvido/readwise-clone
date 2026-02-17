"use client";

import { useState, useEffect } from "react";
import { X, Link, FileText, Upload } from "lucide-react";

export default function AddContentModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-add-modal", handler);
    return () => window.removeEventListener("open-add-modal", handler);
  }, []);

  const reset = () => {
    setUrl("");
    setTitle("");
    setAuthor("");
    setContent("");
    setError("");
    setMode("url");
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      handleClose();
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, content, category: "article" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      handleClose();
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Add Content</h2>
          <button onClick={handleClose} className="btn-icon btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-6 pt-4">
          <button
            onClick={() => setMode("url")}
            className={`btn btn-sm gap-2 ${mode === "url" ? "btn-primary" : "btn-ghost"}`}
          >
            <Link className="w-3.5 h-3.5" />
            From URL
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`btn btn-sm gap-2 ${mode === "manual" ? "btn-primary" : "btn-ghost"}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Manual Entry
          </button>
        </div>

        {/* Forms */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-danger rounded-lg text-sm">
              {error}
            </div>
          )}

          {mode === "url" ? (
            <form onSubmit={handleSubmitUrl}>
              <label className="block text-sm font-medium mb-2">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="input mb-4"
                required
              />
              <p className="text-xs text-text-muted mb-4">
                We&apos;ll automatically extract the title, author, and content.
              </p>
              <button
                type="submit"
                disabled={loading || !url}
                className="btn btn-primary w-full gap-2"
              >
                {loading ? "Saving..." : <>
                  <Upload className="w-4 h-4" />
                  Save Article
                </>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitManual}>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="input mb-3"
                required
              />
              <label className="block text-sm font-medium mb-2">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                className="input mb-3"
              />
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste article text, notes, or highlights..."
                className="input mb-4 min-h-[120px] resize-y"
                rows={5}
              />
              <button
                type="submit"
                disabled={loading || !title}
                className="btn btn-primary w-full"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
