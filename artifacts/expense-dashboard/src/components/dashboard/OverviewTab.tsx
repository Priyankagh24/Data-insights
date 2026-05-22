import {
  useGetMonthlyTrend,
  useGetSpendByDepartment,
  useGetReceiptCompliance,
  useListExpenses,
  getGetMonthlyTrendQueryKey,
  getGetSpendByDepartmentQueryKey,
  getGetReceiptComplianceQueryKey,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import KpiCards from "./KpiCards";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import { AlertTriangle, Info } from "lucide-react";
import {
  AreaChart,
  Area,
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

const CHART_COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981", "#6366f1"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}

function MonthlyTrendChart() {
  const { data, isLoading } = useGetMonthlyTrend({ query: { queryKey: getGetMonthlyTrendQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-56 w-full" />;
  const formatted = data.map((d) => ({ ...d, spend_cr: parseFloat((d.spend_inr / 10000000).toFixed(2)) }));
  return (
    <CardShell>
      <SectionTitle>Monthly Spend Trend (Cr INR)</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
            formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
          />
          <Area type="monotone" dataKey="spend_cr" stroke="#0ea5e9" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

function DeptBarChart() {
  const { data, isLoading } = useGetSpendByDepartment({ query: { queryKey: getGetSpendByDepartmentQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-56 w-full" />;
  const top10 = [...data].sort((a, b) => b.spend_inr - a.spend_inr).slice(0, 10);
  const formatted = top10.map((d) => ({ ...d, spend_cr: parseFloat((d.spend_inr / 10000000).toFixed(2)) }));
  return (
    <CardShell>
      <SectionTitle>Spend by Department (Top 10)</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 16, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
          <YAxis type="category" dataKey="department" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={60} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
            formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
          />
          <Bar dataKey="spend_cr" fill="#14b8a6" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

function ReceiptComplianceChart() {
  const { data, isLoading } = useGetReceiptCompliance({ query: { queryKey: getGetReceiptComplianceQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-56 w-full" />;
  const pieData = [
    { name: "Attached", value: data.attached_count, color: "#10b981" },
    { name: "Missing", value: data.missing_count, color: "#ef4444" },
    { name: "Unknown", value: data.unknown_count, color: "#6b7280" },
  ];
  return (
    <CardShell>
      <SectionTitle>Receipt Compliance</SectionTitle>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
            formatter={(v: number, name: string) => [`${((v / (data.attached_count + data.missing_count + data.unknown_count)) * 100).toFixed(1)}%`, name]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 text-center text-xs text-muted-foreground">
        <span className="text-red-500 font-semibold">{data.missing_pct.toFixed(1)}%</span> of transactions missing receipts
      </div>
    </CardShell>
  );
}

function AiInsights() {
  const insights = [
    { type: "warning", icon: <AlertTriangle size={13} />, text: "9.9% personal expense rate — 2-3x industry benchmark. Systematic policy abuse detected." },
    { type: "warning", icon: <AlertTriangle size={13} />, text: "All 15,020 transactions pending approval — approval workflow is non-functional." },
    { type: "info", icon: <Info size={13} />, text: "Engineering + Sales account for the highest spend concentration. Consider department-level budget caps." },
    { type: "info", icon: <Info size={13} />, text: "39.5% missing receipt rate creates significant tax audit and compliance exposure." },
  ];
  return (
    <div className="flex flex-col gap-2">
      {insights.map((ins, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${ins.type === "warning" ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400" : "border-blue-500/30 bg-blue-500/8 text-blue-700 dark:text-blue-400"}`}
          data-testid={`insight-${i}`}
        >
          <span className="mt-0.5 shrink-0">{ins.icon}</span>
          <span>{ins.text}</span>
        </div>
      ))}
    </div>
  );
}

function TransactionTable() {
  const { data, isLoading } = useListExpenses({ page: 1, limit: 10 }, { query: { queryKey: getListExpensesQueryKey({ page: 1, limit: 10 }) } });
  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;

  return (
    <CardShell>
      <SectionTitle>Recent Transactions</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {["TXN ID", "Date", "Vendor", "Department", "Amount (INR)", "Category", "Status"].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.slice(0, 10).map((row) => (
              <tr key={row.txn_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-txn-${row.txn_id}`}>
                <td className="py-2 px-2 font-mono text-muted-foreground">{row.txn_id}</td>
                <td className="py-2 px-2">{row.txn_date || row.submission_date || "—"}</td>
                <td className="py-2 px-2 max-w-[140px] truncate">{row.vendor_canonical}</td>
                <td className="py-2 px-2">{row.department}</td>
                <td className="py-2 px-2 font-medium tabular-nums">{formatINR(row.amount_inr)}</td>
                <td className="py-2 px-2 text-muted-foreground">{row.category || "—"}</td>
                <td className="py-2 px-2">
                  <div className="flex gap-1">
                    {row.is_personal && <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-500 border border-red-500/20">Personal</span>}
                    {row.is_flagged && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20">Flagged</span>}
                    {!row.is_personal && !row.is_flagged && <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/10 text-green-600 border border-green-500/20">OK</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardShell>
  );
}

export default function OverviewTab() {
  return (
    <div className="flex flex-col gap-5">
      <KpiCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyTrendChart />
        </div>
        <ReceiptComplianceChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DeptBarChart />
        </div>
        <CardShell>
          <SectionTitle>AI Insights</SectionTitle>
          <AiInsights />
        </CardShell>
      </div>

      <TransactionTable />
    </div>
  );
}
