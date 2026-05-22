import {
  useGetExecutiveSummary,
  getGetExecutiveSummaryQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, XCircle, Info, ArrowRight } from "lucide-react";

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const GOVERNANCE_META: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CRITICAL: { color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500", icon: <XCircle size={18} /> },
  "HIGH RISK": { color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500", icon: <AlertTriangle size={18} /> },
  MODERATE: { color: "#6366f1", bg: "bg-purple-500/10", border: "border-purple-500", icon: <Info size={18} /> },
  ACCEPTABLE: { color: "#10b981", bg: "bg-green-500/10", border: "border-green-500", icon: <CheckCircle size={18} /> },
};

const RISK_TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  COMPLIANCE: { color: "#ef4444", bg: "bg-red-500/8", label: "Compliance" },
  FRAUD: { color: "#f59e0b", bg: "bg-amber-500/8", label: "Fraud Risk" },
  GOVERNANCE: { color: "#8b5cf6", bg: "bg-purple-500/8", label: "Governance" },
  DATA: { color: "#3b82f6", bg: "bg-blue-500/8", label: "Data Quality" },
};

const PRIORITY_META: Record<string, { color: string; bg: string; border: string }> = {
  IMMEDIATE: { color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/40" },
  HIGH: { color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/40" },
  MEDIUM: { color: "#6366f1", bg: "bg-purple-500/10", border: "border-purple-500/40" },
};

function RiskScore({ score, status }: { score: number; status: string }) {
  const meta = GOVERNANCE_META[status] ?? GOVERNANCE_META["MODERATE"];
  return (
    <div className={`rounded-lg border-2 p-6 flex flex-col items-center gap-3 ${meta.border} ${meta.bg}`}>
      <div className="flex items-center gap-2" style={{ color: meta.color }}>{meta.icon}<span className="font-bold text-sm tracking-widest uppercase">{status}</span></div>
      <div className="text-6xl font-black" style={{ color: meta.color }}>{score.toFixed(0)}</div>
      <div className="text-xs text-muted-foreground">Overall Risk Score / 100</div>
    </div>
  );
}

export default function ExecutiveSummaryTab() {
  const { data, isLoading } = useGetExecutiveSummary({ query: { queryKey: getGetExecutiveSummaryQueryKey() } });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk score */}
        <RiskScore score={data.overall_risk_score} status={data.governance_status} />

        {/* Key findings */}
        <div className="lg:col-span-2">
          <CardShell className="h-full">
            <SectionTitle>Key Findings</SectionTitle>
            <ul className="flex flex-col gap-2">
              {data.key_findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground" data-testid={`finding-${i}`}>
                  <ArrowRight size={12} className="mt-0.5 shrink-0 text-primary" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </CardShell>
        </div>
      </div>

      {/* Major risks */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Major Risk Areas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.major_risks.map((risk, i) => {
            const meta = RISK_TYPE_META[risk.type] ?? RISK_TYPE_META["DATA"];
            return (
              <div key={i} className={`rounded-lg border border-border p-4 ${meta.bg}`} data-testid={`risk-${i}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${meta.color}20`, color: meta.color }}>{meta.label}</span>
                  <span className="text-sm font-semibold text-foreground">{risk.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <CardShell>
        <SectionTitle>Recommendations</SectionTitle>
        <ul className="flex flex-col gap-2">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground py-1 border-b border-border/50 last:border-0" data-testid={`rec-${i}`}>
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </CardShell>

      {/* Action items */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Action Items</h3>
        <div className="flex flex-col gap-3">
          {data.action_items.map((item, i) => {
            const meta = PRIORITY_META[item.priority] ?? PRIORITY_META["MEDIUM"];
            return (
              <div key={i} className={`flex items-start gap-3 rounded-lg border p-4 bg-card ${meta.border}`} data-testid={`action-${i}`}>
                <span className="px-2 py-1 rounded text-xs font-bold border shrink-0" style={{ color: meta.color, background: `${meta.color}15`, borderColor: `${meta.color}40` }}>
                  {item.priority}
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">{item.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
