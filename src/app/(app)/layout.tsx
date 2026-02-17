import Sidebar from "@/components/layout/Sidebar";
import AddContentModal from "@/components/layout/AddContentModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar />
      <AddContentModal />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
