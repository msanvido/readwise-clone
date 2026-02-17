"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Inbox,
  Clock,
  Star,
  Archive,
  Rss,
  RotateCcw,
  Settings,
  LogOut,
  Plus,
  Highlighter,
  Library,
} from "lucide-react";
import clsx from "clsx";
import { Suspense } from "react";

const navItems = [
  { label: "Library", href: "/library", icon: Library },
  { label: "Inbox", href: "/library?location=inbox", icon: Inbox },
  { label: "Later", href: "/library?location=later", icon: Clock },
  { label: "Shortlist", href: "/library?location=shortlist", icon: Star },
  { label: "Archive", href: "/library?location=archive", icon: Archive },
  { divider: true },
  { label: "Feeds", href: "/feeds", icon: Rss },
  { label: "Daily Review", href: "/review", icon: RotateCcw },
  { label: "All Highlights", href: "/library?view=highlights", icon: Highlighter },
];

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-brand-light" />
        <span className="text-white font-bold text-lg">Readwise</span>
      </div>

      {/* Add button */}
      <div className="px-3 mb-2">
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-add-modal"));
            }
          }}
          className="btn btn-primary w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if ("divider" in item) {
            return <div key={i} className="my-3 border-t border-sidebar-hover" />;
          }
          const Icon = item.icon!;
          const isActive =
            fullPath === item.href ||
            (item.href !== "/library" && pathname === "/library" && item.href?.includes("?") && fullPath === item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={clsx("sidebar-link", isActive && "sidebar-link-active")}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-hover space-y-0.5">
        <a href="/settings" className="sidebar-link">
          <Settings className="w-4 h-4" />
          Settings
        </a>
        <button onClick={handleLogout} className="sidebar-link w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={<aside className="w-64 bg-sidebar h-screen fixed left-0 top-0 z-30" />}>
      <SidebarInner />
    </Suspense>
  );
}
