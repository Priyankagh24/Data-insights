import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Menu, Bell } from "lucide-react";
import { Sidebar, type NavId } from "./Sidebar";
import { SessionManagementHeader } from "@/components/dashboard/SessionManagementHeader";
import UploadDialog, { type PipelineResult } from "@/components/dashboard/UploadDialog";
import { useToast } from "@/hooks/use-toast";

interface AppLayoutProps {
  children: React.ReactNode;
  activeNav?: NavId;
  title: string;
  description: React.ReactNode;
  alertCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  onNavigate?: (id: NavId) => void;
  hideSidebar?: boolean;
}

export function AppLayout({
  children,
  activeNav = "overview",
  title,
  description,
  alertCount = 0,
  onRefresh,
  refreshing = false,
  onNavigate,
  hideSidebar = false,
}: AppLayoutProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSidebarNavigate = useCallback((id: NavId) => {
    setMobileOpen(false);
    if (onNavigate) {
      onNavigate(id);
    } else {
      if (id === "upload") navigate("/upload");
      else if (id === "summary") navigate("/summary");
      else navigate("/dashboard");
    }
  }, [navigate, onNavigate]);

  const handleUploadSuccess = useCallback((result: PipelineResult) => {
    toast({ title: "Pipeline complete", description: `${result.clean_rows.toLocaleString()} clean rows processed.` });
    navigate("/summary"); // Go to summary after upload
  }, [toast, navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile overlay */}
      {!hideSidebar && mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop sticky, mobile fixed overlay */}
      {!hideSidebar && (
        <div className={`hidden md:flex flex-col shrink-0`} style={{ height: "100vh" }}>
          <Sidebar
            active={activeNav}
            onNavigate={handleSidebarNavigate}
            onUpload={() => setUploadOpen(true)}
            onRefresh={onRefresh}
            refreshing={refreshing}
            alertCount={alertCount}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed((v) => !v)}
          />
        </div>
      )}

      {/* Mobile sidebar */}
      {!hideSidebar && (
        <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar
            active={activeNav}
            onNavigate={handleSidebarNavigate}
            onUpload={() => { setUploadOpen(true); setMobileOpen(false); }}
            onRefresh={onRefresh}
            refreshing={refreshing}
            alertCount={alertCount}
            collapsed={false}
            onCollapse={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 border-b border-border bg-card px-4 md:px-6 py-3 flex items-center gap-3">
          {!hideSidebar && (
            <button
              className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-foreground truncate">{title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Session Management */}
            <SessionManagementHeader />
            
            {/* Quick action chips */}
            {alertCount > 0 && (
              <button
                onClick={() => navigate("/dashboard")}
                className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
                  activeNav === "alerts"
                    ? "bg-red-500 text-white border-red-500"
                    : "border-red-500/30 text-red-500 bg-red-500/8 hover:bg-red-500/15"
                }`}
                data-testid="topbar-alerts-chip"
              >
                <Bell size={11} />
                {alertCount} Alerts
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {children}
        </main>
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={handleUploadSuccess} />
    </div>
  );
}
