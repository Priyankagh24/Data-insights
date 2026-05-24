import {
  useGetVendorAnalysis,
  getGetVendorAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import { AlertCircle } from "lucide-react";
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

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981", "#6366f1", "#f97316", "#06b6d4", "#a855f7", "#84cc16"];

export default function VendorAnalysisTab() {
  const { data, isLoading } = useGetVendorAnalysis({ query: { queryKey: getGetVendorAnalysisQueryKey() } });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
      </div>
    );
  }

  const top15 = (data?.top_vendors_by_spend ?? []).slice(0, 15).map((v) => ({
    ...v,
    spend_cr: parseFloat((v.spend_inr / 10000000).toFixed(2)),
  }));

  const top8 = (data?.vendor_concentration ?? []).slice(0, 8);
  const top8Total = top8.reduce((s, v) => s + v.spend_inr, 0);
  const totalSpend = data.top_vendors_by_spend.reduce((s, v) => s + v.spend_inr, 0);
  const otherSpend = totalSpend - top8Total;
  const pieData = [
    ...top8.map((v, i) => ({ name: v.vendor, value: v.spend_inr, color: COLORS[i] })),
    { name: "Others", value: otherSpend, color: "#6b7280" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Top 15 vendors bar */}
      <CardShell>
        <SectionTitle>Top 15 Vendors by Spend</SectionTitle>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top15} layout="vertical" margin={{ top: 0, right: 16, left: 120, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
            <YAxis type="category" dataKey="vendor" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={120} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
              formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
            />
            <Bar dataKey="spend_cr" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardShell>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SaaS vendors */}
        <CardShell>
          <SectionTitle>SaaS Vendor Concentration</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.saas_vendors.map((v) => ({ ...v, spend_cr: parseFloat((v.spend_inr / 10000000).toFixed(2)) }))} layout="vertical" margin={{ top: 0, right: 16, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
              <YAxis type="category" dataKey="vendor" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={100} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
              />
              <Bar dataKey="spend_cr" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardShell>

        {/* Vendor concentration donut */}
        <CardShell>
          <SectionTitle>Spend Concentration (Top 8 Vendors)</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={1}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [formatINR(v), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-muted-foreground mt-1">
            Top 8 vendors = {((top8Total / totalSpend) * 100).toFixed(1)}% of total spend
          </div>
        </CardShell>
      </div>

      {/* Risk insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.risk_insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4" data-testid={`vendor-insight-${i}`}>
            <span className="mt-0.5 shrink-0 text-amber-500"><AlertCircle size={16} /></span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{insight.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">{insight.type}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
