import { useTheme } from "@/hooks/use-theme";
import { useGetExpenseSummary, useGetFraudAnomalies, getGetExpenseSummaryQueryKey, getGetFraudAnomaliesQueryKey } from "@workspace/api-client-react";
import { formatINR } from "@/lib/format";
import {
  Activity, LayoutDashboard, Users, Building2, Globe, ShieldAlert,
  BarChart3, FileText, Bell, Search, Upload, RefreshCw, Moon, Sun,
  ChevronRight, X, Database, BookOpen
} from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";

export type NavId =
  | "overview" | "transactions" | "personal" | "vendors"
  | "departments" | "currency" | "quality" | "fraud"
  | "alerts" | "executive" | "upload" | "summary";

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  group: string;
}

function SidebarQuickStats() {
  const isFileUploaded = useSessionStore(state => state.isFileUploaded);
  const { data } = useGetExpenseSummary({ 
    query: { queryKey: getGetExpenseSummaryQueryKey(), enabled: isFileUploaded } 
  });
  const { data: fraud } = useGetFraudAnomalies({ 
    query: { queryKey: getGetFraudAnomaliesQueryKey(), enabled: isFileUploaded } 
  });

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

export interface SidebarProps {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onUpload: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  personalCount?: number;
  fraudCount?: number;
  alertCount?: number;
  collapsed: boolean;
  onCollapse: () => void;
}

export function Sidebar({ 
  active, onNavigate, onUpload, onRefresh, 
  refreshing = false, personalCount, fraudCount, 
  alertCount, collapsed, onCollapse 
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const isFileUploaded = useSessionStore(state => state.isFileUploaded);

  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "Analytics",
      items: [
        { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} />, group: "Analytics" },
        { id: "summary", label: "Cleaning Summary", icon: <FileText size={15} />, group: "Analytics" },
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
      {!collapsed && isFileUploaded && <SidebarQuickStats />}

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
              // If no file uploaded, standard items are disabled to prevent empty dashboards
              const disabled = !isFileUploaded;
              
              return (
                <button
                  key={item.id}
                  disabled={disabled}
                  onClick={() => onNavigate(item.id)}
                  data-testid={`nav-${item.id}`}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-all w-full group ${
                    isActive
                      ? "bg-primary text-white"
                      : disabled 
                        ? "text-white/20 cursor-not-allowed"
                        : "text-white/50 hover:text-white/80 hover:bg-white/6"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <span className={`shrink-0 ${isActive ? "text-white" : disabled ? "text-white/20" : "text-white/40 group-hover:text-white/60"}`}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="text-xs font-medium flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge !== 0 && !disabled && (
                        <span className={`text-[10px] font-bold px-1.5 rounded-full text-white ${isActive ? "bg-white/25" : item.badgeColor}`}>
                          {typeof item.badge === "number" && item.badge > 999 ? "999+" : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && item.badge !== 0 && !disabled && (
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
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing || !isFileUploaded}
            data-testid="sidebar-button-refresh"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors w-full ${(!isFileUploaded) ? 'text-white/20 cursor-not-allowed' : 'text-white/40 hover:text-white/70 hover:bg-white/6'} ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Refresh Data" : undefined}
          >
            <RefreshCw size={14} className={`shrink-0 ${refreshing ? "animate-spin" : ""}`} />
            {!collapsed && <span className="text-xs font-medium">Refresh Data</span>}
          </button>
        )}

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
