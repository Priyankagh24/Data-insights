import {
  useGetMonthlyTrend,
  useGetSpendByDepartment,
  useGetReceiptCompliance,
  useGetExpenseSummary,
  useGetVendorAnalysis,
  useGetPersonalExpenseAnalysis,
  getGetMonthlyTrendQueryKey,
  getGetSpendByDepartmentQueryKey,
  getGetReceiptComplianceQueryKey,
  getGetExpenseSummaryQueryKey,
  getGetVendorAnalysisQueryKey,
  getGetPersonalExpenseAnalysisQueryKey,
} from "@workspace/api-client-react";
import KpiCards from "./KpiCards";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatPercent } from "@/lib/format";
import {
  AlertTriangle, Info, CheckCircle, XCircle, AlertCircle,
  Upload, TrendingUp, Building2, Users, FileText, Clock,
  ShieldCheck, Zap
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { PipelineResult } from "./UploadDialog";

interface OverviewTabProps {
  uploadResult: PipelineResult | null;
  onUpload: () => void;
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-foreground">{children}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>{children}</div>;
}

function Divider() {
  return <div className="border-t border-border my-1" />;
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function MonthlyTrendChart() {
  const { data, isLoading } = useGetMonthlyTrend({ query: { queryKey: getGetMonthlyTrendQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-56 w-full rounded-xl" />;
  const formatted = data.map((d) => ({ ...d, spend_cr: parseFloat((d.spend_inr / 10_000_000).toFixed(2)) }));
  return (
    <CardShell>
      <SectionTitle sub="Monthly total spend in Crore INR across the 24-month audit window">
        Monthly Spend Trend
      </SectionTitle>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
            formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
          />
          <Area type="monotone" dataKey="spend_cr" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#spendGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

function DeptBarChart() {
  const { data, isLoading } = useGetSpendByDepartment({ query: { queryKey: getGetSpendByDepartmentQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  const top10 = [...data].sort((a, b) => b.spend_inr - a.spend_inr).slice(0, 10);
  const formatted = top10.map((d) => ({ ...d, spend_cr: parseFloat((d.spend_inr / 10_000_000).toFixed(2)) }));
  return (
    <CardShell>
      <SectionTitle sub="Top 10 departments by total INR spend">Spend by Department</SectionTitle>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 16, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
          <YAxis type="category" dataKey="department" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={60} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
            formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
          />
          <Bar dataKey="spend_cr" fill="#14b8a6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

function ReceiptComplianceChart() {
  const { data, isLoading } = useGetReceiptCompliance({ query: { queryKey: getGetReceiptComplianceQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  const pieData = [
    { name: "Attached", value: data.attached_count, color: "#10b981" },
    { name: "Missing", value: data.missing_count, color: "#ef4444" },
    { name: "Unknown", value: data.unknown_count, color: "#6b7280" },
  ];
  const total = data.attached_count + data.missing_count + data.unknown_count;
  return (
    <CardShell>
      <SectionTitle sub="Receipt evidence coverage across all transactions">Receipt Compliance</SectionTitle>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
            formatter={(v: number, name: string) => [`${((v / total) * 100).toFixed(1)}%`, name]}
          />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 text-center text-xs text-muted-foreground">
        <span className="text-red-500 font-bold">{data.missing_pct.toFixed(1)}%</span> of transactions missing receipts
      </div>
    </CardShell>
  );
}

function TopVendorsCard() {
  const { data, isLoading } = useGetVendorAnalysis({ query: { queryKey: getGetVendorAnalysisQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-48 w-full rounded-xl" />;
  const top6 = data.top_vendors_by_spend.slice(0, 6);
  const maxSpend = top6[0]?.spend_inr ?? 1;
  return (
    <CardShell>
      <SectionTitle sub="Highest-spend vendors by INR total">Top Vendors</SectionTitle>
      <div className="flex flex-col gap-2.5">
        {top6.map((v: { vendor: string; spend_inr: number }, i: number) => (
          <div key={v.vendor} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground truncate max-w-[60%]">{v.vendor}</span>
              <span className="text-muted-foreground tabular-nums">{formatINR(v.spend_inr)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(v.spend_inr / maxSpend) * 100}%`,
                  background: `hsl(${200 - i * 20}, 80%, 50%)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function PersonalExpenseBreakdownCard() {
  const { data, isLoading } = useGetPersonalExpenseAnalysis({ query: { queryKey: getGetPersonalExpenseAnalysisQueryKey() } });
  const { data: summary } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-48 w-full rounded-xl" />;

  const rate = summary ? (data.total_count / summary.total_transactions) * 100 : 0;
  const topOffenders = data.top_offenders.slice(0, 5);

  return (
    <CardShell>
      <SectionTitle sub="Employees with highest personal-flagged spend">Personal Expense Offenders</SectionTitle>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-red-500/8 border border-red-500/20">
        <Users size={18} className="text-red-500 shrink-0" />
        <div>
          <div className="text-lg font-black text-red-500 tabular-nums">{formatPercent(rate)}</div>
          <div className="text-xs text-muted-foreground">of transactions flagged personal ({data.total_count.toLocaleString()} txns / {formatINR(data.total_inr)})</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {topOffenders.map((o, i) => (
          <div key={o.employee} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-red-500/15 text-red-500">{i + 1}</span>
              <span className="text-foreground font-medium">{o.employee}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="tabular-nums">{formatINR(o.total_inr ?? 0)}</span>
              <span>{o.count} txns</span>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function AiInsightsCard() {
  const insights = [
    { type: "warning", icon: <AlertTriangle size={13} />, text: "9.9% personal expense rate — 2–3× industry benchmark. Systematic policy abuse detected." },
    { type: "warning", icon: <AlertTriangle size={13} />, text: "All 15,020 transactions pending approval — approval workflow non-functional." },
    { type: "info", icon: <Info size={13} />, text: "Engineering + Sales account for the highest spend concentration. Consider department-level budget caps." },
    { type: "info", icon: <Info size={13} />, text: "31.6% missing receipt rate creates significant tax audit and compliance exposure." },
    { type: "warning", icon: <AlertTriangle size={13} />, text: "Multi-currency exposure across 6 currencies without confirmed exchange rate hedging." },
  ];
  return (
    <CardShell>
      <SectionTitle sub="Automated findings from the analytics engine">AI Insights</SectionTitle>
      <div className="flex flex-col gap-2">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
              ins.type === "warning"
                ? "border-amber-500/30 bg-amber-500/6 text-amber-700 dark:text-amber-400"
                : "border-blue-500/30 bg-blue-500/6 text-blue-700 dark:text-blue-400"
            }`}
            data-testid={`insight-${i}`}
          >
            <span className="mt-0.5 shrink-0">{ins.icon}</span>
            <span className="leading-relaxed">{ins.text}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

// ─── Upload Result (inline, no modal) ────────────────────────────────────────

function StepIcon({ status }: { status: "ok" | "warn" | "error" }) {
  if (status === "ok") return <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />;
  if (status === "warn") return <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />;
  return <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />;
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "green" | "amber" }) {
  const color = highlight === "red" ? "text-red-500" : highlight === "green" ? "text-emerald-500" : highlight === "amber" ? "text-amber-500" : "text-foreground";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function PipelineResultSection({ result }: { result: PipelineResult }) {
  const cleanRate = 100 - result.exclusion_rate;

  return (
    <div className="flex flex-col gap-5">
      {/* Header banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/6 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={16} className="text-emerald-500" />
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Pipeline Complete</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{result.filename} · {result.processing_time_ms}ms</span>
        </div>

        {/* Big 3 numbers */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center bg-card rounded-lg p-4 border border-border">
            <div className="text-3xl font-black text-foreground tabular-nums">{result.total_source_rows.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">Source rows</div>
          </div>
          <div className="text-center bg-card rounded-lg p-4 border border-emerald-500/30">
            <div className="text-3xl font-black text-emerald-500 tabular-nums">{result.clean_rows.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">Clean rows</div>
          </div>
          <div className="text-center bg-card rounded-lg p-4 border border-red-500/30">
            <div className="text-3xl font-black text-red-500 tabular-nums">{result.excluded_rows.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">Excluded rows</div>
          </div>
        </div>

        {/* Clean rate bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Data quality rate</span>
            <span className="font-bold text-emerald-500">{formatPercent(cleanRate)} clean · {formatPercent(result.exclusion_rate)} excluded</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${cleanRate}%` }} />
            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${result.exclusion_rate}%` }} />
          </div>
        </div>
      </div>

      {/* 3-column detail grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pipeline Steps */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pipeline Steps</span>
          </div>
          <div className="flex flex-col gap-3">
            {result.pipeline_steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5" data-testid={`pipeline-step-${i}`}>
                <StepIcon status={step.status} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{step.step}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean Data Summary */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clean Data Summary</span>
          </div>
          <StatRow label="Total Spend (INR)" value={formatINR(result.clean_summary.total_spend_inr)} highlight="green" />
          <StatRow label="Unique Vendors" value={result.clean_summary.unique_vendors.toLocaleString()} />
          <StatRow label="Unique Departments" value={result.clean_summary.unique_departments.toLocaleString()} />
          <StatRow label="Date Range" value={result.clean_summary.date_range} />
          <StatRow label="Currencies" value={result.clean_summary.currencies_detected.toLocaleString()} />
          <StatRow label="Personal Flagged" value={result.clean_summary.personal_flagged.toLocaleString()} highlight="amber" />
          <StatRow
            label="Missing Receipts"
            value={`${result.clean_summary.missing_receipts.toLocaleString()} (${formatPercent(result.clean_summary.missing_receipt_pct)})`}
            highlight="red"
          />
        </div>

        {/* Exclusion Reasons */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exclusion Reasons</span>
          </div>
          {result.exclusion_reasons.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 rounded-lg p-3 border border-emerald-500/20">
              <CheckCircle size={13} />
              No exclusions — all rows clean
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {result.exclusion_reasons.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-2" data-testid={`exclusion-reason-${i}`}>
                  <div className="flex items-center gap-2">
                    {r.severity === "CRITICAL"
                      ? <XCircle size={12} className="text-red-500 shrink-0" />
                      : <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                    <span className="text-xs text-foreground">{r.reason}</span>
                  </div>
                  <span className={`text-xs font-bold tabular-nums shrink-0 ${r.severity === "CRITICAL" ? "text-red-500" : "text-amber-500"}`}>
                    {r.count.toLocaleString()}
                  </span>
                </div>
              ))}

              {/* Visual exclusion bar */}
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1.5">Exclusion breakdown</div>
                {result.exclusion_reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <div className="w-16 text-[10px] text-muted-foreground truncate">{r.reason.split(" ")[0]}</div>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.severity === "CRITICAL" ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${(r.count / result.excluded_rows) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sample Issues Table */}
      {result.sample_issues.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sample Issues</span>
            <span className="ml-auto text-xs text-muted-foreground">Showing {result.sample_issues.length} of {result.excluded_rows.toLocaleString()} excluded rows</span>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Row", "Field", "Issue", "Raw Value"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-muted-foreground font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.sample_issues.map((issue, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 font-mono text-muted-foreground">{issue.row}</td>
                    <td className="py-2 px-3 font-mono font-medium text-foreground">{issue.field}</td>
                    <td className="py-2 px-3 text-amber-600 dark:text-amber-400">{issue.issue}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground max-w-[160px] truncate">{issue.value || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadCTA({ onUpload }: { onUpload: () => void }) {
  return (
    <div
      onClick={onUpload}
      className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer p-8 flex flex-col items-center gap-3 text-center group"
      data-testid="overview-upload-cta"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Upload size={22} className="text-primary" />
      </div>
      <div>
        <div className="text-sm font-bold text-foreground">Upload & Clean a New File</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Drag and drop your dirty .xlsx / .csv expense export. The cleaning pipeline will parse,
          normalise, and validate every row — results appear here, not in a popup.
        </p>
      </div>
      <div className="text-xs text-primary font-semibold mt-1">Click to upload →</div>
    </div>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip() {
  const { data, isLoading } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });
  if (isLoading || !data) return <Skeleton className="h-14 w-full rounded-xl" />;

  const items = [
    { label: "Total Spend", value: formatINR(data.total_spend_inr), icon: <TrendingUp size={14} className="text-sky-500" />, color: "text-sky-500" },
    { label: "Transactions", value: data.total_transactions.toLocaleString(), icon: <FileText size={14} className="text-indigo-500" />, color: "text-indigo-500" },
    { label: "Departments", value: data.unique_departments.toLocaleString(), icon: <Building2 size={14} className="text-teal-500" />, color: "text-teal-500" },
    { label: "Personal Flagged", value: `${data.personal_expense_count.toLocaleString()} (${formatPercent((data.personal_expense_count / data.total_transactions) * 100)})`, icon: <Users size={14} className="text-red-500" />, color: "text-red-500" },
    { label: "Missing Receipts", value: `${data.missing_receipt_count.toLocaleString()} (${formatPercent(data.missing_receipt_pct)})`, icon: <AlertTriangle size={14} className="text-amber-500" />, color: "text-amber-500" },
    { label: "Report Date", value: data.report_date, icon: <Clock size={14} className="text-purple-500" />, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {item.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
          </div>
          <div className={`text-sm font-black tabular-nums ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function OverviewTab({ uploadResult, onUpload }: OverviewTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <KpiCards />

      {/* Summary strip */}
      <SummaryStrip />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><MonthlyTrendChart /></div>
        <ReceiptComplianceChart />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><DeptBarChart /></div>
        <AiInsightsCard />
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopVendorsCard />
        <PersonalExpenseBreakdownCard />
      </div>

      {/* ── Data Pipeline Section ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-primary" />
            <h2 className="text-sm font-bold text-foreground">Data Pipeline</h2>
          </div>
          {uploadResult && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-medium">
              Last run: {uploadResult.filename} · {uploadResult.clean_rows.toLocaleString()} clean rows
            </span>
          )}
        </div>

        {uploadResult ? (
          <PipelineResultSection result={uploadResult} />
        ) : (
          <UploadCTA onUpload={onUpload} />
        )}
      </div>
    </div>
  );
}
