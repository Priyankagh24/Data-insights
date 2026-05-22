import {
  useGetCurrencyAnalysis,
  getGetCurrencyAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatPercent } from "@/lib/format";
import { Info } from "lucide-react";
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

const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981", "#6366f1", "#f97316"];

export default function CurrencyTab() {
  const { data, isLoading } = useGetCurrencyAnalysis({ query: { queryKey: getGetCurrencyAnalysisQueryKey() } });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
      </div>
    );
  }

  const top10 = data.currency_breakdown.slice(0, 10);
  const pieTop8 = data.currency_breakdown.slice(0, 8);
  const pieOther = data.currency_breakdown.slice(8).reduce((s, c) => s + c.spend_inr, 0);
  const pieData = [
    ...pieTop8.map((c, i) => ({ name: c.currency, value: c.spend_inr, color: COLORS[i] })),
    ...(pieOther > 0 ? [{ name: "Others", value: pieOther, color: "#6b7280" }] : []),
  ];

  const inrVsForeign = [
    { name: "INR", spend_cr: parseFloat(((data.currency_breakdown.find((c) => c.currency === "INR")?.spend_inr ?? 0) / 10000000).toFixed(2)), color: "#14b8a6" },
    { name: "Foreign", spend_cr: parseFloat(((data.currency_breakdown.filter((c) => c.currency !== "INR").reduce((s, c) => s + c.spend_inr, 0)) / 10000000).toFixed(2)), color: "#ef4444" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardShell className="border-l-4 border-l-blue-500 bg-blue-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Currencies Used</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-currencies">{data.currency_breakdown.length}</div>
        </CardShell>
        <CardShell className="border-l-4 border-l-teal-500 bg-teal-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">INR Share</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-inr-pct">{formatPercent(data.inr_pct)}</div>
        </CardShell>
        <CardShell className="border-l-4 border-l-red-500 bg-red-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Foreign Exposure</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-foreign-pct">{formatPercent(data.foreign_pct)}</div>
        </CardShell>
        <CardShell className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Missing Rates</div>
          <div className="text-2xl font-bold text-foreground" data-testid="kpi-missing-rates">{data.missing_exchange_rate_count.toLocaleString()}</div>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Currency pie */}
        <CardShell>
          <SectionTitle>Currency Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [formatINR(v), ""]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardShell>

        {/* INR vs Foreign bar */}
        <CardShell>
          <SectionTitle>INR vs Foreign Spend (Cr INR)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inrVsForeign} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
              />
              <Bar dataKey="spend_cr" radius={[4, 4, 0, 0]}>
                {inrVsForeign.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardShell>
      </div>

      {/* Currency breakdown table */}
      <CardShell>
        <SectionTitle>Currency Breakdown</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Currency</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Transactions</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Spend (INR)</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data.currency_breakdown.map((c, i) => {
                const totalSpend = data.currency_breakdown.reduce((s, x) => s + x.spend_inr, 0);
                const pct = (c.spend_inr / totalSpend) * 100;
                return (
                  <tr key={c.currency} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-currency-${i}`}>
                    <td className="py-2 px-3 font-mono font-semibold text-foreground">{c.currency}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{c.count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{formatINR(c.spend_inr)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatPercent(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardShell>

      {/* Insights */}
      <div className="flex flex-col gap-2">
        {data.insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/8 px-3 py-2 text-xs text-blue-700 dark:text-blue-400" data-testid={`currency-insight-${i}`}>
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>{insight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
