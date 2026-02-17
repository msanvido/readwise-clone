"use client";

import { useState, useEffect, useCallback } from "react";
import { Rss, Plus, Trash2, FolderOpen, RefreshCw, ExternalLink } from "lucide-react";

interface Feed {
  id: string;
  title: string;
  url: string;
  folder: string;
  last_fetched_at: string | null;
  created_at: string;
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeeds = useCallback(async () => {
    const res = await fetch("/api/feeds");
    if (res.ok) {
      const data = await res.json();
      setFeeds(data.feeds);
      setFolders(data.folders);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: newUrl, title: newTitle || undefined, folder: newFolder || undefined }),
    });
    if (res.ok) {
      setNewUrl("");
      setNewTitle("");
      setNewFolder("");
      setShowAdd(false);
      fetchFeeds();
    }
  };

  const deleteFeed = async (id: string) => {
    await fetch(`/api/feeds/${id}`, { method: "DELETE" });
    setFeeds(prev => prev.filter(f => f.id !== id));
  };

  const refreshFeeds = async () => {
    setRefreshing(true);
    await fetch("/api/feeds/refresh", { method: "POST" });
    await fetchFeeds();
    setRefreshing(false);
  };

  // Group feeds by folder
  const grouped: Record<string, Feed[]> = {};
  feeds.forEach(feed => {
    const key = feed.folder || "Uncategorized";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(feed);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Rss className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold">RSS Feeds</h1>
          <span className="badge badge-brand">{feeds.length} feeds</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshFeeds}
            disabled={refreshing}
            className="btn btn-secondary gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh All
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>
      </div>

      {/* Add feed form */}
      {showAdd && (
        <form onSubmit={addFeed} className="card mb-6">
          <h3 className="font-semibold mb-3">Subscribe to Feed</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Feed URL *</label>
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="input"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Feed title"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Folder (optional)</label>
                <input
                  type="text"
                  value={newFolder}
                  onChange={e => setNewFolder(e.target.value)}
                  placeholder="e.g., Tech, News"
                  className="input"
                  list="folders-list"
                />
                <datalist id="folders-list">
                  {folders.map(f => <option key={f} value={f} />)}
                </datalist>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Subscribe</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* Feeds list */}
      {feeds.length === 0 ? (
        <div className="text-center py-20">
          <Rss className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary mb-2">No RSS feeds yet</p>
          <p className="text-sm text-text-muted mb-4">Subscribe to your favorite blogs and news sources</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Feed
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([folder, folderFeeds]) => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">{folder}</h2>
                <span className="text-xs text-text-muted">({folderFeeds.length})</span>
              </div>
              <div className="space-y-2">
                {folderFeeds.map(feed => (
                  <div key={feed.id} className="card flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <Rss className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{feed.title}</h3>
                        <p className="text-xs text-text-muted truncate">{feed.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={feed.url} target="_blank" rel="noopener noreferrer" className="btn-icon btn-ghost">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => deleteFeed(feed.id)} className="btn-icon btn-ghost text-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
