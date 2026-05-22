import {
  useGetDataQuality,
  getGetDataQualityQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { AlertTriangle, XCircle, Info, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const SEVERITY_META: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CRITICAL: { color: "#ef4444", bg: "bg-red-500/8", border: "border-red-500/30", icon: <XCircle size={14} className="text-red-500" /> },
  WARNING: { color: "#f59e0b", bg: "bg-amber-500/8", border: "border-amber-500/30", icon: <AlertTriangle size={14} className="text-amber-500" /> },
  INFO: { color: "#3b82f6", bg: "bg-blue-500/8", border: "border-blue-500/30", icon: <Info size={14} className="text-blue-500" /> },
};

function ScoreGauge({ score }: { score: number }) {
  const color = score > 80 ? "#10b981" : score > 60 ? "#f59e0b" : "#ef4444";
  const label = score > 80 ? "ERP Ready" : score > 60 ? "Needs Work" : "Not Ready";
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
          <circle
            cx="64" cy="64" r="52"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${(score / 100) * 327} 327`}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold text-foreground">{score.toFixed(0)}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function DataQualityTab() {
  const { data, isLoading } = useGetDataQuality({ query: { queryKey: getGetDataQualityQueryKey() } });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
      </div>
    );
  }

  const missingChartData = data.missing_values_by_field.map((f) => ({
    field: f.field,
    missing: f.missing_count,
    pct: parseFloat(f.missing_pct.toFixed(1)),
  }));

  const issueColors = missingChartData.map((d) =>
    d.pct > 30 ? "#ef4444" : d.pct > 10 ? "#f59e0b" : "#3b82f6"
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ERP score */}
        <CardShell className="flex flex-col items-center justify-center">
          <SectionTitle>ERP Readiness Score</SectionTitle>
          <ScoreGauge score={data.erp_readiness_score} />
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {data.rows_excluded.toLocaleString()} rows excluded from {data.total_source_rows.toLocaleString()} source
          </div>
        </CardShell>

        {/* Issue severity breakdown */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          {[
            { key: "CRITICAL", count: data.critical_issues, label: "Critical Issues" },
            { key: "WARNING", count: data.warning_issues, label: "Warnings" },
            { key: "INFO", count: data.info_issues, label: "Info Items" },
          ].map(({ key, count, label }) => {
            const meta = SEVERITY_META[key];
            return (
              <CardShell key={key} className={`border-2 ${meta.border} ${meta.bg}`}>
                <div className="flex items-center gap-2 mb-2">{meta.icon}<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{key}</span></div>
                <div className="text-3xl font-bold text-foreground" style={{ color: meta.color }} data-testid={`issue-${key.toLowerCase()}`}>{count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </CardShell>
            );
          })}

          <CardShell className="col-span-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-green-500" />
                <span className="text-muted-foreground">Rows Loaded:</span>
                <span className="font-semibold text-foreground">{data.rows_loaded.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={12} className="text-red-500" />
                <span className="text-muted-foreground">Rows Excluded:</span>
                <span className="font-semibold text-red-500">{data.rows_excluded.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Info size={12} className="text-blue-500" />
                <span className="text-muted-foreground">Exclusion Rate:</span>
                <span className="font-semibold text-foreground">{formatPercent((data.rows_excluded / data.total_source_rows) * 100)}</span>
              </div>
            </div>
          </CardShell>
        </div>
      </div>

      {/* Missing values per field */}
      <CardShell>
        <SectionTitle>Missing Values by Field</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={missingChartData} layout="vertical" margin={{ top: 0, right: 60, left: 120, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="field" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }} tickLine={false} axisLine={false} width={120} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
              formatter={(v: number, name: string) => [name === "missing" ? v.toLocaleString() : `${v}%`, name === "missing" ? "Missing rows" : "Missing %"]}
            />
            <Bar dataKey="missing" radius={[0, 3, 3, 0]}>
              {missingChartData.map((_, i) => <Cell key={i} fill={issueColors[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardShell>

      {/* Top issues */}
      <CardShell>
        <SectionTitle>Top Data Issues</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Issue Type</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Count</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {data.top_issues.map((issue, i) => {
                const meta = SEVERITY_META[issue.severity] ?? SEVERITY_META["INFO"];
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30" data-testid={`issue-row-${i}`}>
                    <td className="py-2 px-3 font-mono text-foreground">{issue.issue_type}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-foreground">{issue.count.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium border ${meta.border} ${meta.bg}`} style={{ color: meta.color }}>
                        {meta.icon}
                        {issue.severity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  );
}
