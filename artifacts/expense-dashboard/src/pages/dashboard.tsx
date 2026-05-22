import { useState, useCallback } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useGetExpenseSummary, useGetFraudAnomalies, getGetExpenseSummaryQueryKey, getGetFraudAnomaliesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Activity, LayoutDashboard, Users, Building2, Globe, ShieldAlert,
  BarChart3, FileText, Bell, Search, Upload, RefreshCw, Moon, Sun,
  ChevronRight, AlertTriangle, TrendingUp, Database, BookOpen,
  Menu, X
} from "lucide-react";
import { formatINR } from "@/lib/format";

import OverviewTab from "@/components/dashboard/OverviewTab";
import PersonalExpensesTab from "@/components/dashboard/PersonalExpensesTab";
import VendorAnalysisTab from "@/components/dashboard/VendorAnalysisTab";
import DepartmentsTab from "@/components/dashboard/DepartmentsTab";
import CurrencyTab from "@/components/dashboard/CurrencyTab";
import DataQualityTab from "@/components/dashboard/DataQualityTab";
import FraudTab from "@/components/dashboard/FraudTab";
import ExecutiveSummaryTab from "@/components/dashboard/ExecutiveSummaryTab";
import AlertsTab from "@/components/dashboard/AlertsTab";
import TransactionsTab from "@/components/dashboard/TransactionsTab";
import UploadDialog, { type PipelineResult } from "@/components/dashboard/UploadDialog";

type NavId =
  | "overview" | "transactions" | "personal" | "vendors"
  | "departments" | "currency" | "quality" | "fraud"
  | "alerts" | "executive";

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  group: string;
}

const PAGE_LABELS: Record<NavId, string> = {
  overview: "Overview",
  transactions: "Transaction Explorer",
  personal: "Personal Expenses",
  vendors: "Vendor Analysis",
  departments: "Departments",
  currency: "Currency",
  quality: "Data Quality",
  fraud: "Fraud & Anomalies",
  alerts: "Smart Alerts",
  executive: "Executive Summary",
};

function SidebarQuickStats() {
  const { data } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });
  const { data: fraud } = useGetFraudAnomalies({ query: { queryKey: getGetFraudAnomaliesQueryKey() } });

  if (!data) return null;

  return (
    <div className="px-3 pb-3">
      <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Live Metrics</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/50">Total Spend</span>
            <span className="text-[11px] font-bold text-white tabular-nums">{formatINR(data.total_spend_inr)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/50">Transactions</span>
            <span className="text-[11px] font-bold text-white tabular-nums">{data.total_transactions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/50">Personal Flagged</span>
            <span className="text-[11px] font-bold text-red-400 tabular-nums">{data.personal_expense_count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/50">Risk Score</span>
            <span className="text-[11px] font-bold text-amber-400 tabular-nums">{fraud ? `${fraud.risk_score.toFixed(0)}/100` : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onUpload: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  personalCount?: number;
  fraudCount?: number;
  alertCount?: number;
  collapsed: boolean;
  onCollapse: () => void;
}

function Sidebar({ active, onNavigate, onUpload, onRefresh, refreshing, personalCount, fraudCount, alertCount, collapsed, onCollapse }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "Analytics",
      items: [
        { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} />, group: "Analytics" },
        { id: "transactions", label: "Transactions", icon: <Search size={15} />, group: "Analytics" },
        { id: "personal", label: "Personal Expenses", icon: <Users size={15} />, badge: personalCount, badgeColor: "bg-red-500", group: "Analytics" },
        { id: "vendors", label: "Vendor Analysis", icon: <Building2 size={15} />, group: "Analytics" },
        { id: "departments", label: "Departments", icon: <BarChart3 size={15} />, group: "Analytics" },
        { id: "currency", label: "Currency", icon: <Globe size={15} />, group: "Analytics" },
      ],
    },
    {
      label: "Risk & Compliance",
      items: [
        { id: "fraud", label: "Fraud & Anomalies", icon: <ShieldAlert size={15} />, badge: fraudCount, badgeColor: "bg-amber-500", group: "Risk" },
        { id: "alerts", label: "Smart Alerts", icon: <Bell size={15} />, badge: alertCount, badgeColor: "bg-red-500", group: "Risk" },
        { id: "quality", label: "Data Quality", icon: <Database size={15} />, group: "Risk" },
      ],
    },
    {
      label: "Reports",
      items: [
        { id: "executive", label: "Executive Summary", icon: <BookOpen size={15} />, group: "Reports" },
      ],
    },
  ];

  return (
    <aside
      className={`flex flex-col h-screen bg-[hsl(222,47%,9%)] border-r border-white/8 shrink-0 transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}
      style={{ position: "sticky", top: 0 }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-white/8 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary shrink-0">
          <Activity size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-sm text-white tracking-tight">ExpenseIQ</div>
            <div className="text-[9px] text-white/40 font-medium truncate">FY 2024–26 · ERP Audit</div>
          </div>
        )}
        <button
          onClick={onCollapse}
          className="ml-auto text-white/30 hover:text-white/60 transition-colors hidden md:flex"
          data-testid="button-collapse-sidebar"
        >
          {collapsed ? <ChevronRight size={13} /> : <X size={13} />}
        </button>
      </div>

      {/* Quick stats */}
      {!collapsed && <SidebarQuickStats />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {!collapsed && (
              <div className="px-2 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  data-testid={`nav-${item.id}`}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-all w-full group ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/6"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <span className={`shrink-0 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/60"}`}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="text-xs font-medium flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 rounded-full text-white ${isActive ? "bg-white/25" : item.badgeColor}`}>
                          {typeof item.badge === "number" && item.badge > 999 ? "999+" : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && item.badge !== 0 && (
                    <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${item.badgeColor ?? "bg-red-500"}`} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className={`border-t border-white/8 p-2 flex flex-col gap-1.5`}>
        {/* Upload — primary CTA */}
        <button
          onClick={onUpload}
          data-testid="sidebar-button-upload"
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Upload Data" : undefined}
        >
          <Upload size={14} className="shrink-0" />
          {!collapsed && <span className="text-xs font-semibold">Upload Data</span>}
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          data-testid="sidebar-button-refresh"
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors w-full text-white/40 hover:text-white/70 hover:bg-white/6 ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Refresh Data" : undefined}
        >
          <RefreshCw size={14} className={`shrink-0 ${refreshing ? "animate-spin" : ""}`} />
          {!collapsed && <span className="text-xs font-medium">Refresh Data</span>}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          data-testid="sidebar-button-theme"
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors w-full text-white/40 hover:text-white/70 hover:bg-white/6 ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
        >
          {theme === "dark" ? <Sun size={14} className="shrink-0" /> : <Moon size={14} className="shrink-0" />}
          {!collapsed && <span className="text-xs font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
      </div>
    </aside>
  );
}


export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUploadResult, setLastUploadResult] = useState<PipelineResult | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: summary } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });
  const { data: fraud } = useGetFraudAnomalies({ query: { queryKey: getGetFraudAnomaliesQueryKey() } });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
    toast({ title: "Data refreshed", description: "All metrics have been updated." });
  }, [queryClient, toast]);

  const handleNavigate = useCallback((id: NavId) => {
    setActiveNav(id);
    setMobileOpen(false);
  }, []);

  const handleUploadSuccess = useCallback((result: PipelineResult) => {
    setLastUploadResult(result);
    setActiveNav("overview");
    toast({ title: "Pipeline complete", description: `${result.clean_rows.toLocaleString()} clean rows — results shown in Overview.` });
  }, [toast]);

  const alertCount = 8; // static based on what AlertsTab generates

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop sticky, mobile fixed overlay */}
      <div className={`hidden md:flex flex-col shrink-0`} style={{ height: "100vh" }}>
        <Sidebar
          active={activeNav}
          onNavigate={handleNavigate}
          onUpload={() => setUploadOpen(true)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          personalCount={summary?.personal_expense_count}
          fraudCount={fraud?.high_value_outliers?.length}
          alertCount={alertCount}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar
          active={activeNav}
          onNavigate={handleNavigate}
          onUpload={() => { setUploadOpen(true); setMobileOpen(false); }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          personalCount={summary?.personal_expense_count}
          fraudCount={fraud?.high_value_outliers?.length}
          alertCount={alertCount}
          collapsed={false}
          onCollapse={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 border-b border-border bg-card px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-foreground truncate">{PAGE_LABELS[activeNav]}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {activeNav === "overview" && "FY 2024–26 — 15,020 transactions · ₹2,617.69 Cr total spend"}
              {activeNav === "transactions" && "Search, filter, and export the full transaction ledger"}
              {activeNav === "personal" && "Personal expense policy compliance analysis"}
              {activeNav === "vendors" && "Vendor spend concentration and risk insights"}
              {activeNav === "departments" && "Department and cost center spend breakdown"}
              {activeNav === "currency" && "Multi-currency exposure and forex analysis"}
              {activeNav === "quality" && "Data quality scoring and ERP migration readiness"}
              {activeNav === "fraud" && "Anomaly detection and high-value transaction review"}
              {activeNav === "alerts" && "Live risk alerts requiring action — prioritised by severity"}
              {activeNav === "executive" && "C-suite governance summary and action items"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick action chips */}
            <button
              onClick={() => setActiveNav("alerts")}
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
            <button
              onClick={() => setUploadOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/8 hover:bg-primary/15 font-medium transition-colors"
              data-testid="topbar-upload-chip"
            >
              <Upload size={11} />
              Upload
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className={activeNav === "overview" ? "block" : "hidden"}><OverviewTab uploadResult={lastUploadResult} onUpload={() => setUploadOpen(true)} /></div>
          <div className={activeNav === "transactions" ? "block" : "hidden"}><TransactionsTab /></div>
          <div className={activeNav === "personal" ? "block" : "hidden"}><PersonalExpensesTab /></div>
          <div className={activeNav === "vendors" ? "block" : "hidden"}><VendorAnalysisTab /></div>
          <div className={activeNav === "departments" ? "block" : "hidden"}><DepartmentsTab /></div>
          <div className={activeNav === "currency" ? "block" : "hidden"}><CurrencyTab /></div>
          <div className={activeNav === "quality" ? "block" : "hidden"}><DataQualityTab /></div>
          <div className={activeNav === "fraud" ? "block" : "hidden"}><FraudTab /></div>
          <div className={activeNav === "alerts" ? "block" : "hidden"}><AlertsTab /></div>
          <div className={activeNav === "executive" ? "block" : "hidden"}><ExecutiveSummaryTab /></div>
        </main>
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={handleUploadSuccess} />
    </div>
  );
}
