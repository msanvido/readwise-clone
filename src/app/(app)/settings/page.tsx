"use client";

import { useState, useEffect } from "react";
import { Settings, User, Download, Upload, Database, BookOpen } from "lucide-react";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState({ documents: 0, highlights: 0, feeds: 0, tags: 0 });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
    // Fetch basic stats
    Promise.all([
      fetch("/api/documents?limit=0").then(r => r.json()),
      fetch("/api/highlights?limit=0").then(r => r.json()),
      fetch("/api/feeds").then(r => r.json()),
      fetch("/api/tags").then(r => r.json()),
    ]).then(([docs, hls, feeds, tags]) => {
      setStats({
        documents: docs.total || 0,
        highlights: hls.total || 0,
        feeds: feeds.feeds?.length || 0,
        tags: tags.tags?.length || 0,
      });
    });
  }, []);

  const handleExport = async () => {
    const res = await fetch("/api/highlights?limit=9999");
    const data = await res.json();
    const csv = [
      ["Text", "Note", "Document", "Author", "Date"].join(","),
      ...data.highlights.map((h: Record<string, string>) =>
        [
          `"${(h.text || "").replace(/"/g, '""')}"`,
          `"${(h.note || "").replace(/"/g, '""')}"`,
          `"${(h.document_title || "").replace(/"/g, '""')}"`,
          `"${(h.document_author || "").replace(/"/g, '""')}"`,
          h.created_at,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "readwise-highlights-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-brand" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Profile */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Profile
        </h2>
        {user && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Name</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Member since</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-4 h-4" /> Library Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Documents", value: stats.documents, icon: BookOpen },
            { label: "Highlights", value: stats.highlights, icon: BookOpen },
            { label: "RSS Feeds", value: stats.feeds, icon: BookOpen },
            { label: "Tags", value: stats.tags, icon: BookOpen },
          ].map(stat => (
            <div key={stat.label} className="text-center p-4 bg-surface-secondary rounded-lg">
              <div className="text-2xl font-bold text-brand">{stat.value}</div>
              <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Data
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Export all your highlights as a CSV file that you can import into other tools.
        </p>
        <button onClick={handleExport} className="btn btn-secondary gap-2">
          <Download className="w-4 h-4" />
          Export Highlights (CSV)
        </button>
      </div>

      {/* Import */}
      <div className="card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Import Highlights
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Import highlights from Kindle, Readwise, or CSV files. Paste your highlights below.
        </p>
        <ImportForm />
      </div>
    </div>
  );
}

function ImportForm() {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState("");

  const handleImport = async () => {
    setImporting(true);
    setResult("");

    // Parse pasted highlights (simple format: separate by double newlines)
    const highlights = text.split(/\n\n+/).filter(h => h.trim().length > 10);

    if (highlights.length === 0) {
      setResult("No highlights found. Paste highlights separated by blank lines.");
      setImporting(false);
      return;
    }

    // Create a document for imported highlights
    const docRes = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Import - ${new Date().toLocaleDateString()}`, category: "book" }),
    });

    if (!docRes.ok) {
      setResult("Failed to create document");
      setImporting(false);
      return;
    }

    const { document } = await docRes.json();
    let count = 0;

    for (const hl of highlights) {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: document.id, text: hl.trim() }),
      });
      if (res.ok) count++;
    }

    setResult(`Successfully imported ${count} highlights!`);
    setText("");
    setImporting(false);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste your highlights here, separated by blank lines..."
        className="input min-h-[150px] resize-y mb-3"
        rows={6}
      />
      {result && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-3">
          {result}
        </div>
      )}
      <button
        onClick={handleImport}
        disabled={importing || !text.trim()}
        className="btn btn-primary gap-2"
      >
        <Upload className="w-4 h-4" />
        {importing ? "Importing..." : "Import Highlights"}
      </button>
    </div>
  );
}
