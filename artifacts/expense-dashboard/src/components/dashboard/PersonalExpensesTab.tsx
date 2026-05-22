import {
  useGetPersonalExpenseAnalysis,
  getGetPersonalExpenseAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatPercent } from "@/lib/format";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useGetExpenseSummary, getGetExpenseSummaryQueryKey } from "@workspace/api-client-react";

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#6366f1",
  LOW: "#10b981",
};

export default function PersonalExpensesTab() {
  const { data, isLoading } = useGetPersonalExpenseAnalysis({
    query: { queryKey: getGetPersonalExpenseAnalysisQueryKey() },
  });
  const { data: summary } = useGetExpenseSummary({
    query: { queryKey: getGetExpenseSummaryQueryKey() },
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const totalTransactions = summary?.total_transactions ?? 1;
  const businessCount = totalTransactions - data.total_count;
  const businessVsPersonal = [
    { name: "Business", value: businessCount, color: "#14b8a6" },
    { name: "Personal", value: data.total_count, color: "#ef4444" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardShell className="border-l-4 border-l-red-500 bg-red-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Personal Transactions</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-personal-count">{data.total_count.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatPercent(data.pct_of_transactions)} of all transactions</div>
        </CardShell>
        <CardShell className="border-l-4 border-l-red-500 bg-red-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Personal Spend</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-personal-spend">{formatINR(data.total_inr)}</div>
          <div className="text-xs text-muted-foreground mt-1">INR equivalent</div>
        </CardShell>
        <CardShell className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Unique Offenders</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-offenders">{data.top_offenders.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Employees with personal charges</div>
        </CardShell>
        <CardShell className="border-l-4 border-l-purple-500 bg-purple-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Policy Violations</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-violations">{data.policy_violations.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Distinct violation patterns</div>
        </CardShell>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CardShell>
            <SectionTitle>Top 10 Personal Expense Offenders</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_offenders} layout="vertical" margin={{ top: 0, right: 16, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="employee" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                  formatter={(v: number) => [v, "Personal Transactions"]}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardShell>
        </div>
        <CardShell>
          <SectionTitle>Business vs Personal</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={businessVsPersonal} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                {businessVsPersonal.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [v.toLocaleString(), ""]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center text-xs text-red-500 font-medium">
            {formatPercent(data.pct_of_transactions)} personal rate (2-3x benchmark)
          </div>
        </CardShell>
      </div>

      {/* Top personal vendors */}
      <CardShell>
        <SectionTitle>Top Personal Expense Vendors</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.top_personal_vendors.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 100, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="vendor" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={100} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
              formatter={(v: number) => [v, "Personal Transactions"]}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardShell>

      {/* Policy violations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.policy_violations.map((v, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border p-4 bg-card"
            data-testid={`violation-${i}`}
          >
            <span className={`mt-0.5 shrink-0 ${v.severity === "CRITICAL" ? "text-red-500" : v.severity === "HIGH" ? "text-amber-500" : "text-blue-500"}`}>
              <ShieldAlert size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{v.title}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: `${SEVERITY_COLORS[v.severity]}20`, color: SEVERITY_COLORS[v.severity], border: `1px solid ${SEVERITY_COLORS[v.severity]}40` }}
                >
                  {v.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
