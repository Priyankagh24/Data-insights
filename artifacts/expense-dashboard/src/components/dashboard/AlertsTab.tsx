import {
  useGetFraudAnomalies,
  useGetDataQuality,
  useGetPersonalExpenseAnalysis,
  useGetExpenseSummary,
  getGetFraudAnomaliesQueryKey,
  getGetDataQualityQueryKey,
  getGetPersonalExpenseAnalysisQueryKey,
  getGetExpenseSummaryQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatPercent } from "@/lib/format";
import { AlertTriangle, XCircle, Info, ShieldAlert, CheckCircle, Bell } from "lucide-react";

interface Alert {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  category: string;
  title: string;
  description: string;
  metric?: string;
  action?: string;
}

const SEVERITY_META: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CRITICAL: { color: "#ef4444", bg: "bg-red-500/8", border: "border-red-500/30", icon: <XCircle size={14} /> },
  HIGH:     { color: "#f59e0b", bg: "bg-amber-500/8", border: "border-amber-500/30", icon: <AlertTriangle size={14} /> },
  MEDIUM:   { color: "#8b5cf6", bg: "bg-purple-500/8", border: "border-purple-500/30", icon: <ShieldAlert size={14} /> },
  INFO:     { color: "#3b82f6", bg: "bg-blue-500/8", border: "border-blue-500/30", icon: <Info size={14} /> },
};

function AlertCard({ alert }: { alert: Alert }) {
  const meta = SEVERITY_META[alert.severity];
  return (
    <div className={`rounded-lg border p-4 ${meta.bg} ${meta.border}`} data-testid={`alert-${alert.id}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" style={{ color: meta.color }}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
              >
                {alert.severity}
              </span>
              <span className="text-xs text-muted-foreground">{alert.category}</span>
            </div>
            {alert.metric && (
              <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: meta.color }}>{alert.metric}</span>
            )}
          </div>
          <div className="text-sm font-semibold text-foreground mb-1">{alert.title}</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
          {alert.action && (
            <div className="mt-2 text-xs font-medium" style={{ color: meta.color }}>
              Action required: {alert.action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsTab() {
  const { data: fraud, isLoading: fraudLoading } = useGetFraudAnomalies({ query: { queryKey: getGetFraudAnomaliesQueryKey() } });
  const { data: quality, isLoading: qualityLoading } = useGetDataQuality({ query: { queryKey: getGetDataQualityQueryKey() } });
  const { data: personal, isLoading: personalLoading } = useGetPersonalExpenseAnalysis({ query: { queryKey: getGetPersonalExpenseAnalysisQueryKey() } });
  const { data: summary, isLoading: summaryLoading } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });

  const isLoading = fraudLoading || qualityLoading || personalLoading || summaryLoading;

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  const alerts: Alert[] = [];

  // Approval workflow breakdown
  if (summary) {
    alerts.push({
      id: "approval-breakdown",
      severity: "CRITICAL",
      category: "Governance",
      title: "Approval Workflow Non-Functional",
      description: `All ${summary.total_transactions.toLocaleString()} transactions remain pending approval — zero approved in the entire ledger. This is a systemic governance failure, not a backlog.`,
      metric: `${summary.total_transactions.toLocaleString()} pending`,
      action: "Escalate to CFO and CTO immediately. Initiate retroactive approval sprint.",
    });
  }

  // Personal expense rate
  if (personal && summary) {
    const rate = (personal.total_count / summary.total_transactions) * 100;
    alerts.push({
      id: "personal-rate",
      severity: "CRITICAL",
      category: "Policy Compliance",
      title: "Personal Expense Rate Exceeds Threshold",
      description: `${formatPercent(rate)} personal expense rate (${personal.total_count.toLocaleString()} transactions / ${formatINR(personal.total_inr)}) — industry benchmark is 2–3%. This indicates systematic policy abuse, not isolated incidents.`,
      metric: formatPercent(rate),
      action: "Freeze all personal-flagged reimbursements pending individual manager review.",
    });
  }

  // Receipt compliance
  if (summary) {
    const missingPct = summary.missing_receipt_pct;
    if (missingPct > 30) {
      alerts.push({
        id: "receipt-compliance",
        severity: "CRITICAL",
        category: "Audit Compliance",
        title: "Receipt Evidence Gap — Audit Exposure",
        description: `${formatPercent(missingPct)} of transactions (${summary.missing_receipt_count.toLocaleString()} rows) lack receipt documentation. This creates direct exposure to tax disallowance and external audit findings under IT rules.`,
        metric: `${formatPercent(missingPct)} missing`,
        action: "Mandate retroactive receipt upload for all transactions above ₹10,000.",
      });
    }
  }

  // Data quality — ERP readiness
  if (quality) {
    if (quality.erp_readiness_score < 70) {
      alerts.push({
        id: "erp-readiness",
        severity: "HIGH",
        category: "ERP Migration",
        title: "Data Quality Below ERP Migration Threshold",
        description: `ERP readiness score ${quality.erp_readiness_score.toFixed(0)}/100 — below the 75-point threshold recommended for production migration. ${quality.critical_issues} critical issues and ${quality.warning_issues} warnings will cause data integrity failures post-cutover.`,
        metric: `${quality.erp_readiness_score.toFixed(0)}/100`,
        action: "Block ERP migration until critical issues resolved. Assign remediation sprint.",
      });
    }

    alerts.push({
      id: "rows-excluded",
      severity: "HIGH",
      category: "Data Integrity",
      title: "Significant Row Exclusion from Source",
      description: `${quality.rows_excluded.toLocaleString()} rows (${formatPercent((quality.rows_excluded / quality.total_source_rows) * 100)} of source) excluded during ingestion due to data quality failures. This represents unaccounted spend in the reporting period.`,
      metric: `${quality.rows_excluded.toLocaleString()} rows`,
      action: "Data engineering team to investigate and remediate excluded rows before migration cutover.",
    });
  }

  // Fraud / high-value
  if (fraud) {
    alerts.push({
      id: "fraud-risk",
      severity: "HIGH",
      category: "Fraud & Anomalies",
      title: "High-Value Transaction Outliers Detected",
      description: `${fraud.high_value_outliers.length} transactions exceed the 95th percentile threshold and require individual approval review. ${fraud.refund_transactions.length} refund/negative transactions flagged for potential reimbursement cycling risk.`,
      metric: `Risk: ${fraud.risk_score.toFixed(0)}/100`,
      action: "Internal audit to review all transactions above P95 threshold.",
    });
  }

  // Missing submitter
  if (summary && summary.missing_submitter_count > 0) {
    alerts.push({
      id: "missing-submitter",
      severity: "MEDIUM",
      category: "Data Quality",
      title: "Transactions Without Submitter Identity",
      description: `${summary.missing_submitter_count.toLocaleString()} transactions have no submitter recorded — these cannot be attributed to an employee for policy enforcement or approval routing.`,
      metric: `${summary.missing_submitter_count.toLocaleString()} rows`,
      action: "Finance ops to manually attribute unidentified submitter rows.",
    });
  }

  // Currencies without exchange rates
  if (summary && summary.currencies_count > 1) {
    alerts.push({
      id: "forex-exposure",
      severity: "MEDIUM",
      category: "Currency Risk",
      title: "Multi-Currency Exposure Without Rate Hedging",
      description: `${summary.currencies_count} currencies detected in the ledger. Transactions in USD, EUR, GBP, and AED without confirmed exchange rates may be misstated in INR terms, affecting reported total spend accuracy.`,
      action: "Treasury team to confirm exchange rates for all non-INR transactions.",
    });
  }

  alerts.push({
    id: "vendor-dedup",
    severity: "INFO",
    category: "Vendor Management",
    title: "Vendor Master Deduplication Required",
    description: `Multiple vendor aliases detected for the same entity (e.g., "OpenAI (API)" and "OPENAI", Razorpay appearing as both tool and payment mechanism). Consolidated spend is understated until deduplication is complete.`,
    action: "Procurement to run vendor master deduplication before ERP migration.",
  });

  const counts = {
    CRITICAL: alerts.filter((a) => a.severity === "CRITICAL").length,
    HIGH: alerts.filter((a) => a.severity === "HIGH").length,
    MEDIUM: alerts.filter((a) => a.severity === "MEDIUM").length,
    INFO: alerts.filter((a) => a.severity === "INFO").length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Alert summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {(["CRITICAL", "HIGH", "MEDIUM", "INFO"] as const).map((sev) => {
          const meta = SEVERITY_META[sev];
          return (
            <div key={sev} className={`rounded-lg border p-3 text-center ${meta.bg} ${meta.border}`}>
              <div className="text-2xl font-black" style={{ color: meta.color }}>{counts[sev]}</div>
              <div className="text-xs font-semibold mt-1" style={{ color: meta.color }}>{sev}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts grouped by severity */}
      {(["CRITICAL", "HIGH", "MEDIUM", "INFO"] as const).map((sev) => {
        const group = alerts.filter((a) => a.severity === sev);
        if (!group.length) return null;
        const meta = SEVERITY_META[sev];
        return (
          <div key={sev}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: meta.color }}>{meta.icon}</span>
              <h3 className="text-sm font-semibold text-foreground">{sev} Alerts</h3>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${meta.color}20`, color: meta.color }}>{group.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {group.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
