import {
  useGetFraudAnomalies,
  getGetFraudAnomaliesQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import { ShieldAlert, AlertTriangle } from "lucide-react";

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const TYPE_META: Record<string, { color: string; bg: string; border: string }> = {
  HIGH_VALUE: { color: "#ef4444", bg: "bg-red-500/8", border: "border-red-500/30" },
  REFUND_RISK: { color: "#f59e0b", bg: "bg-amber-500/8", border: "border-amber-500/30" },
  MISSING_APPROVER: { color: "#8b5cf6", bg: "bg-purple-500/8", border: "border-purple-500/30" },
  DUPLICATE_RISK: { color: "#3b82f6", bg: "bg-blue-500/8", border: "border-blue-500/30" },
};

function RiskScoreGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const color = clamped > 70 ? "#ef4444" : clamped > 40 ? "#f59e0b" : "#10b981";
  const label = clamped > 70 ? "HIGH RISK" : clamped > 40 ? "ELEVATED" : "LOW";
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg width="112" height="112" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="46" fill="none" stroke="hsl(var(--border))" strokeWidth="9" />
          <circle cx="56" cy="56" r="46" fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${(clamped / 100) * 289} 289`} strokeLinecap="round" transform="rotate(-90 56 56)" />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>{clamped.toFixed(0)}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className="text-xs font-bold tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

export default function FraudTab() {
  const { data, isLoading } = useGetFraudAnomalies({ query: { queryKey: getGetFraudAnomaliesQueryKey() } });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <CardShell className="flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Score</div>
          <RiskScoreGauge score={data.risk_score} />
        </CardShell>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.anomaly_insights.map((insight, i) => {
            const meta = TYPE_META[insight.type] ?? TYPE_META["HIGH_VALUE"];
            return (
              <div key={i} className={`flex items-start gap-3 rounded-lg border p-4 ${meta.bg} ${meta.border}`} data-testid={`anomaly-insight-${i}`}>
                <span className="mt-0.5 shrink-0" style={{ color: meta.color }}>
                  <ShieldAlert size={16} />
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{insight.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium border" style={{ color: meta.color, background: `${meta.color}20`, borderColor: `${meta.color}40` }}>{insight.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* High-value outliers table */}
      <CardShell>
        <SectionTitle>High-Value Outliers (Top 20)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {["TXN ID", "Date", "Vendor", "Department", "Submitted By", "Amount (INR)", "Flags"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.high_value_outliers.map((row, i) => (
                <tr key={row.txn_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`outlier-row-${i}`}>
                  <td className="py-2 px-3 font-mono text-muted-foreground">{row.txn_id}</td>
                  <td className="py-2 px-3">{row.txn_date || "—"}</td>
                  <td className="py-2 px-3 max-w-[120px] truncate">{row.vendor_canonical}</td>
                  <td className="py-2 px-3">{row.department}</td>
                  <td className="py-2 px-3 text-muted-foreground">{row.submitted_by || "Unknown"}</td>
                  <td className="py-2 px-3 font-bold tabular-nums text-foreground">{formatINR(row.amount_inr)}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {row.is_personal && <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-500 border border-red-500/20">Personal</span>}
                      {row.is_flagged && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20">Flagged</span>}
                      {row.under_review && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/10 text-purple-600 border border-purple-500/20">Review</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>

      {/* Refund transactions table */}
      <CardShell>
        <SectionTitle>Refund / Negative Transactions</SectionTitle>
        {data.refund_transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No refund transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["TXN ID", "Date", "Vendor", "Department", "Amount (INR)", "Reason"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.refund_transactions.map((row, i) => (
                  <tr key={row.txn_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`refund-row-${i}`}>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{row.txn_id}</td>
                    <td className="py-2 px-3">{row.txn_date || "—"}</td>
                    <td className="py-2 px-3 max-w-[120px] truncate">{row.vendor_canonical}</td>
                    <td className="py-2 px-3">{row.department}</td>
                    <td className="py-2 px-3 font-bold tabular-nums text-red-500">{formatINR(row.amount_inr)}</td>
                    <td className="py-2 px-3 text-muted-foreground max-w-[180px] truncate">{row.flag_reason || row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardShell>
    </div>
  );
}
