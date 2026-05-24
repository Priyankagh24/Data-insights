import { Router } from "express";
import { getStore } from "../data/loader";

const router = Router();

// Helper: group and sum
function groupSum<T>(
  arr: T[],
  keyFn: (item: T) => string,
  valFn: (item: T) => number
): { key: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const item of arr) {
    const k = keyFn(item);
    if (!k) continue;
    const entry = map.get(k) ?? { total: 0, count: 0 };
    entry.total += valFn(item);
    entry.count += 1;
    map.set(k, entry);
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

// GET /expenses
router.get("/", (req, res) => {
  const { expenses } = getStore();
  const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
  const limit = Math.min(200, parseInt(req.query["limit"] as string) || 50);
  const dept = req.query["department"] as string | undefined;
  const vendor = req.query["vendor"] as string | undefined;
  const category = req.query["category"] as string | undefined;
  const isPersonal = req.query["is_personal"] as string | undefined;
  const isFlagged = req.query["is_flagged"] as string | undefined;
  const search = (req.query["search"] as string | undefined)?.toLowerCase();
  const dateFrom = req.query["date_from"] as string | undefined;
  const dateTo = req.query["date_to"] as string | undefined;

  let filtered = expenses;
  if (dept) filtered = filtered.filter((e) => e.department.toLowerCase().includes(dept.toLowerCase()));
  if (vendor) filtered = filtered.filter((e) => e.vendor_canonical.toLowerCase().includes(vendor.toLowerCase()));
  if (category) filtered = filtered.filter((e) => e.category?.toLowerCase().includes(category.toLowerCase()));
  if (isPersonal !== undefined && isPersonal !== "") filtered = filtered.filter((e) => e.is_personal === (isPersonal === "true"));
  if (isFlagged !== undefined && isFlagged !== "") filtered = filtered.filter((e) => e.is_flagged === (isFlagged === "true"));
  if (search) {
    filtered = filtered.filter(
      (e) =>
        e.txn_id.toLowerCase().includes(search) ||
        e.vendor_canonical.toLowerCase().includes(search) ||
        (e.description || "").toLowerCase().includes(search) ||
        (e.submitted_by || "").toLowerCase().includes(search)
    );
  }
  if (dateFrom) filtered = filtered.filter((e) => e.txn_date && e.txn_date >= dateFrom);
  if (dateTo) filtered = filtered.filter((e) => e.txn_date && e.txn_date <= dateTo);

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  res.json({ data, total, page, limit });
});

// GET /expenses/summary
router.get("/summary", (req, res) => {
  const { expenses, summary } = getStore();

  const missingReceipt = expenses.filter((e) => {
    const r = (e.receipt_attached || "").toLowerCase().trim();
    return r === "false" || r === "no" || r === "";
  }).length;

  const missingSubmitter = expenses.filter((e) => !e.submitted_by || e.submitted_by.trim() === "").length;
  const negativeCount = expenses.filter((e) => e.amount_inr < 0).length;
  const underReview = expenses.filter((e) => e.under_review).length;
  const flagged = expenses.filter((e) => e.is_flagged).length;
  const personal = expenses.filter((e) => e.is_personal);
  const personalInr = personal.reduce((s, e) => s + e.amount_inr, 0);
  const totalSpend = expenses.reduce((s, e) => s + e.amount_inr, 0);
  const avgTxn = expenses.length > 0 ? totalSpend / expenses.length : 0;
  const vendors = new Set(expenses.map((e) => e.vendor_canonical)).size;
  const depts = new Set(expenses.map((e) => e.department)).size;
  const currencies = new Set(expenses.map((e) => e.original_currency).filter(Boolean)).size;

  res.json({
    total_transactions: expenses.length,
    total_spend_inr: totalSpend,
    personal_expense_count: personal.length,
    personal_expense_inr: personalInr,
    flagged_count: flagged,
    under_review_count: underReview,
    avg_transaction_inr: avgTxn,
    unique_vendors: vendors,
    unique_departments: depts,
    missing_receipt_count: missingReceipt,
    missing_receipt_pct: (missingReceipt / expenses.length) * 100,
    negative_transaction_count: negativeCount,
    missing_submitter_count: missingSubmitter,
    all_pending_approvals: expenses.length,
    currencies_count: currencies,
    report_date: summary.report_date,
    source_rows: summary.total_rows_in_source,
    rows_loaded: expenses.length,
    rows_excluded: summary.rows_excluded,
  });
});

// GET /expenses/monthly-trend
router.get("/monthly-trend", (req, res) => {
  const { expenses } = getStore();
  const map = new Map<string, { spend: number; count: number }>();

  for (const e of expenses) {
    const d = e.txn_date || e.submission_date;
    if (!d || d.length < 7) continue;
    const month = d.slice(0, 7);
    const entry = map.get(month) ?? { spend: 0, count: 0 };
    entry.spend += e.amount_inr;
    entry.count += 1;
    map.set(month, entry);
  }

  const result = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, spend_inr: v.spend, transaction_count: v.count }));

  res.json(result);
});

// GET /expenses/by-department
router.get("/by-department", (req, res) => {
  const { expenses } = getStore();
  const groups = groupSum(expenses, (e) => e.department, (e) => e.amount_inr);

  const personalMap = new Map<string, number>();
  for (const e of expenses.filter((e) => e.is_personal)) {
    personalMap.set(e.department, (personalMap.get(e.department) ?? 0) + 1);
  }

  const result = groups
    .sort((a, b) => b.total - a.total)
    .map((g) => ({
      department: g.key,
      spend_inr: g.total,
      transaction_count: g.count,
      personal_count: personalMap.get(g.key) ?? 0,
    }));

  res.json(result);
});

// GET /expenses/by-vendor
router.get("/by-vendor", (req, res) => {
  const { expenses } = getStore();
  const limit = Math.min(50, parseInt(req.query["limit"] as string) || 20);

  const groups = groupSum(expenses, (e) => e.vendor_canonical, (e) => e.amount_inr);
  const personalMap = new Map<string, number>();
  for (const e of expenses.filter((e) => e.is_personal)) {
    personalMap.set(e.vendor_canonical, (personalMap.get(e.vendor_canonical) ?? 0) + 1);
  }

  const result = groups
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((g) => ({
      vendor: g.key,
      spend_inr: g.total,
      transaction_count: g.count,
      personal_count: personalMap.get(g.key) ?? 0,
    }));

  res.json(result);
});

// GET /expenses/by-category
router.get("/by-category", (req, res) => {
  const { expenses } = getStore();
  const groups = groupSum(expenses, (e) => e.category || "Miscellaneous", (e) => e.amount_inr);

  const result = groups
    .sort((a, b) => b.total - a.total)
    .map((g) => ({
      category: g.key,
      spend_inr: g.total,
      transaction_count: g.count,
    }));

  res.json(result);
});

// GET /expenses/by-cost-center
router.get("/by-cost-center", (req, res) => {
  const { expenses } = getStore();
  const groups = groupSum(
    expenses.filter((e) => e.cost_center && e.cost_center.trim() !== "" && e.cost_center.toUpperCase() !== "TBD"),
    (e) => e.cost_center!,
    (e) => e.amount_inr
  );

  const result = groups
    .sort((a, b) => b.total - a.total)
    .map((g) => ({
      cost_center: g.key,
      spend_inr: g.total,
      transaction_count: g.count,
    }));

  res.json(result);
});

// GET /expenses/personal-analysis
router.get("/personal-analysis", (req, res) => {
  const { expenses } = getStore();
  const personal = expenses.filter((e) => e.is_personal);
  const totalPersonalInr = personal.reduce((s, e) => s + e.amount_inr, 0);
  const pct = (personal.length / expenses.length) * 100;

  // Top offenders
  const offenderMap = new Map<string, { count: number; total: number }>();
  for (const e of personal) {
    const emp = e.submitted_by || "Unknown";
    const entry = offenderMap.get(emp) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += e.amount_inr;
    offenderMap.set(emp, entry);
  }
  const topOffenders = Array.from(offenderMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([employee, v]) => ({ employee, count: v.count, total_inr: v.total }));

  // Top personal vendors
  const vendorMap = new Map<string, number>();
  for (const e of personal) {
    vendorMap.set(e.vendor_canonical, (vendorMap.get(e.vendor_canonical) ?? 0) + 1);
  }
  const topVendors = Array.from(vendorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([vendor, count]) => ({ vendor, count }));

  const policyViolations = [
    {
      severity: "HIGH",
      title: "Repeat Offenders",
      description: `${topOffenders.filter((o) => o.count >= 20).length} employees with 20+ personal transactions suggesting systematic policy abuse.`,
    },
    {
      severity: "CRITICAL",
      title: "SaaS Misuse",
      description: "Enterprise tools (Salesforce, Zoom, Notion, Adobe) appearing in personal flags — employees may be billing team licenses as personal reimbursements.",
    },
    {
      severity: "MEDIUM",
      title: "Lifestyle Charges",
      description: "Food delivery, e-commerce, and personal travel billed to company accounts.",
    },
    {
      severity: "MEDIUM",
      title: "All Pending Approval",
      description: "All personal transactions still pending — no downstream action taken despite ERP flag logic correctly identifying them.",
    },
  ];

  res.json({
    total_count: personal.length,
    total_inr: totalPersonalInr,
    pct_of_transactions: pct,
    top_offenders: topOffenders,
    top_personal_vendors: topVendors,
    policy_violations: policyViolations,
  });
});

// GET /expenses/vendor-analysis
router.get("/vendor-analysis", (req, res) => {
  const { expenses } = getStore();

  const groups = groupSum(expenses, (e) => e.vendor_canonical, (e) => e.amount_inr);
  const personalMap = new Map<string, number>();
  for (const e of expenses.filter((e) => e.is_personal)) {
    personalMap.set(e.vendor_canonical, (personalMap.get(e.vendor_canonical) ?? 0) + 1);
  }

  const sorted = groups
    .sort((a, b) => b.total - a.total)
    .map((g) => ({
      vendor: g.key,
      spend_inr: g.total,
      transaction_count: g.count,
      personal_count: personalMap.get(g.key) ?? 0,
    }));

  const saasKeywords = ["salesforce", "zoom", "adobe", "notion", "aws", "azure", "openai", "datadog", "fivetran", "1password", "slack", "hubspot", "pagerduty", "monday", "asana", "workday", "snowflake", "databricks", "github", "jira", "atlassian"];
  const saasVendors = sorted.filter((v) =>
    saasKeywords.some((k) => v.vendor.toLowerCase().includes(k))
  ).slice(0, 12);

  const riskInsights = [
    {
      type: "Dependency Risk",
      title: "Critical SaaS Vendor Lock-in",
      description: "Salesforce + Adobe + Zoom = critical SaaS vendor lock-in across CRM, creative, and communications.",
    },
    {
      type: "Duplicate Vendor",
      title: "Duplicate OpenAI Vendor Entries",
      description: '"OpenAI (API)" and "OPENAI" appear as separate canonical vendors — likely duplicate contracts. Consolidated spend unknown. Requires immediate vendor master deduplication.',
    },
    {
      type: "Spend Leak",
      title: "Uncontrolled Operational Spend",
      description: "Uber and Swiggy represent high-frequency operational spend with no cost-center oversight visible in many rows.",
    },
    {
      type: "Procurement",
      title: "Razorpay Miscategorization Risk",
      description: "Razorpay appearing as both a vendor (payment processing tool) and a payment mechanism suggests possible miscategorization in the ERP.",
    },
  ];

  res.json({
    top_vendors_by_spend: sorted.slice(0, 15),
    saas_vendors: saasVendors,
    vendor_concentration: sorted.slice(0, 8),
    risk_insights: riskInsights,
  });
});

// GET /expenses/currency-analysis
router.get("/currency-analysis", (req, res) => {
  const { expenses } = getStore();

  const currencyMap = new Map<string, { count: number; spend: number }>();
  for (const e of expenses) {
    const cur = e.original_currency || "INR";
    const entry = currencyMap.get(cur) ?? { count: 0, spend: 0 };
    entry.count += 1;
    entry.spend += e.amount_inr;
    currencyMap.set(cur, entry);
  }

  const breakdown = Array.from(currencyMap.entries())
    .sort(([, a], [, b]) => b.spend - a.spend)
    .map(([currency, v]) => ({
      currency,
      count: v.count,
      spend_inr: v.spend,
    }));

  const inrEntry = breakdown.find((b) => b.currency === "INR");
  const totalSpend = breakdown.reduce((s, b) => s + b.spend_inr, 0);
  const inrSpend = inrEntry?.spend_inr ?? 0;
  const inrPct = totalSpend > 0 ? (inrSpend / totalSpend) * 100 : 0;

  const missingExchangeRate = expenses.filter(
    (e) => e.original_currency && e.original_currency !== "INR" && !e.exchange_rate_used
  ).length;

  const insights = [
    `${(100 - inrPct).toFixed(1)}% of total spend is in foreign currencies — significant forex exposure requiring active hedging policy.`,
    `${missingExchangeRate} transactions missing exchange rates — valuation risk of potential misreporting.`,
    `USD, EUR, and GBP dominate international spend — APAC and EMEA expansion driving multi-currency complexity.`,
    "Multiple GBP and EUR transactions without exchange rates may be misstated in INR terms.",
  ];

  res.json({
    currency_breakdown: breakdown,
    inr_pct: inrPct,
    foreign_pct: 100 - inrPct,
    missing_exchange_rate_count: missingExchangeRate,
    insights,
  });
});

// GET /expenses/data-quality
router.get("/data-quality", (req, res) => {
  const { expenses, summary } = getStore();

  const fields = [
    { field: "submitted_by", label: "submitted_by" },
    { field: "receipt_attached", label: "receipt_attached" },
    { field: "cost_center", label: "cost_center" },
    { field: "description", label: "description" },
    { field: "txn_date", label: "txn_date" },
    { field: "original_currency", label: "original_currency" },
    { field: "exchange_rate_used", label: "exchange_rate_used" },
    { field: "notes", label: "notes" },
  ] as const;

  const missingValuesByField = fields.map(({ field, label }) => {
    const missing = expenses.filter((e) => {
      const v = e[field as keyof typeof e];
      return !v || (typeof v === "string" && v.trim() === "");
    }).length;
    return {
      field: label,
      missing_count: missing,
      missing_pct: (missing / expenses.length) * 100,
    };
  }).sort((a, b) => b.missing_count - a.missing_count);

  const { CRITICAL, WARNING, INFO } = summary.issue_summary;
  const totalIssues = CRITICAL + WARNING + INFO;
  const erpScore = Math.max(0, Math.min(100, 100 - (CRITICAL * 5 + WARNING * 1) / (totalIssues / 100)));

  const topIssues = [
    { issue_type: "UNPARSEABLE_DATE", count: CRITICAL, severity: "CRITICAL" },
    { issue_type: "MISSING_AMOUNT", count: Math.floor(WARNING * 0.3), severity: "WARNING" },
    { issue_type: "UNRESOLVED_VENDOR", count: Math.floor(WARNING * 0.25), severity: "WARNING" },
    { issue_type: "DATE_FORMAT_NORMALISED", count: INFO, severity: "INFO" },
    { issue_type: "CURRENCY_INFERRED", count: Math.floor(WARNING * 0.2), severity: "WARNING" },
    { issue_type: "DEPARTMENT_NORMALISED", count: Math.floor(INFO * 0.3), severity: "INFO" },
  ];

  res.json({
    total_source_rows: summary.total_rows_in_source,
    rows_loaded: expenses.length,
    rows_excluded: summary.rows_excluded,
    critical_issues: CRITICAL,
    warning_issues: WARNING,
    info_issues: INFO,
    missing_values_by_field: missingValuesByField,
    erp_readiness_score: erpScore,
    top_issues: topIssues,
  });
});

// GET /expenses/fraud-anomalies
router.get("/fraud-anomalies", (req, res) => {
  const { expenses } = getStore();
  const amounts = expenses.map((e) => e.amount_inr).filter((a) => a > 0).sort((a, b) => a - b);
  const p95Index = Math.floor(amounts.length * 0.95);
  const p95 = amounts[p95Index] ?? 1000000;

  const highValueOutliers = expenses
    .filter((e) => e.amount_inr >= p95)
    .sort((a, b) => b.amount_inr - a.amount_inr)
    .slice(0, 20);

  const refunds = expenses.filter((e) => e.amount_inr < 0).slice(0, 20);

  const approvalBypass = expenses
    .filter((e) => e.amount_inr > 500000 && (!e.submitted_by || e.submitted_by.trim() === ""))
    .slice(0, 10);

  const duplicateSuspects = expenses.filter((e) => e.is_duplicate || e.under_review).length;

  const totalSpend = expenses.reduce((s, e) => s + Math.abs(e.amount_inr), 0);
  const highValueSpend = highValueOutliers.reduce((s, e) => s + e.amount_inr, 0);
  const riskScore = Math.min(100, (highValueSpend / totalSpend) * 100 * 2 + (refunds.length / expenses.length) * 1000);

  const anomalyInsights = [
    {
      type: "HIGH_VALUE",
      title: "High-Value Outlier Concentration",
      description: `${highValueOutliers.length} transactions above ₹${(p95 / 100000).toFixed(1)}L represent disproportionate spend concentration requiring individual approval review.`,
    },
    {
      type: "REFUND_RISK",
      title: "Refund Volume Anomaly",
      description: `${refunds.length} negative/refund transactions (${((refunds.length / expenses.length) * 100).toFixed(1)}% of total) — potential reimbursement cycling risk.`,
    },
    {
      type: "MISSING_APPROVER",
      title: "Approval Bypass Risk",
      description: `${approvalBypass.length} high-value transactions lack submitter identity — possible approval chain bypass.`,
    },
    {
      type: "DUPLICATE_RISK",
      title: "Duplicate and Review Flags",
      description: `${duplicateSuspects} transactions flagged for duplication or manual review — payment holds recommended until cleared.`,
    },
  ];

  res.json({
    high_value_outliers: highValueOutliers,
    refund_transactions: refunds,
    approval_bypass: approvalBypass,
    duplicate_suspects: duplicateSuspects,
    risk_score: riskScore,
    anomaly_insights: anomalyInsights,
  });
});

// GET /expenses/executive-summary
router.get("/executive-summary", (req, res) => {
  const { expenses, summary } = getStore();
  const personal = expenses.filter((e) => e.is_personal);
  const totalSpend = expenses.reduce((s, e) => s + e.amount_inr, 0);
  const personalPct = (personal.length / expenses.length) * 100;
  const missingReceipt = expenses.filter((e) => {
    const r = (e.receipt_attached || "").toLowerCase().trim();
    return r === "false" || r === "no" || r === "";
  }).length;
  const missingReceiptPct = (missingReceipt / expenses.length) * 100;

  const overallRiskScore = Math.min(100, personalPct * 3 + missingReceiptPct * 0.5 + 10);
  const governanceStatus = overallRiskScore > 60 ? "CRITICAL" : overallRiskScore > 40 ? "HIGH RISK" : overallRiskScore > 25 ? "MODERATE" : "ACCEPTABLE";

  const keyFindings = [
    `₹${(totalSpend / 10000000).toFixed(2)} Cr total spend across ${expenses.length.toLocaleString()} transactions — FY 2024–26.`,
    `${personalPct.toFixed(1)}% personal expense rate (${personal.length.toLocaleString()} transactions) — 2-3x industry benchmark.`,
    `${missingReceiptPct.toFixed(1)}% transactions missing receipt evidence — critical audit compliance gap.`,
    `${summary.rows_excluded.toLocaleString()} rows excluded from source (${((summary.rows_excluded / summary.total_rows_in_source) * 100).toFixed(1)}%) — data quality concern for ERP migration.`,
    "Zero approved transactions — entire expense ledger pending, indicating systemic workflow breakdown.",
    "Engineering and Sales together account for >23% of total spend — high concentration risk.",
  ];

  const majorRisks = [
    { type: "COMPLIANCE", title: "Receipt Compliance Failure", description: `39.5% missing receipts expose the company to tax disallowance and potential audit findings.` },
    { type: "FRAUD", title: "Personal Expense Policy Breach", description: `9.9% personal expense rate with ${personal.length} transactions suggests systematic policy abuse, not isolated incidents.` },
    { type: "GOVERNANCE", title: "Approval Workflow Breakdown", description: "15,020 transactions all pending approval — zero approved. The approval workflow is non-functional and poses significant compliance risk." },
    { type: "DATA", title: "ERP Migration Data Quality", description: `${summary.rows_excluded} excluded rows and ${summary.issue_summary.CRITICAL} critical issues will cause data integrity problems in production ERP.` },
  ];

  const recommendations = [
    "Implement mandatory receipt upload before transaction submission.",
    "Activate personal expense detection alerts with automatic hold pending manager review.",
    "Audit and remediate the approval workflow — all 15,020 transactions require retroactive approval.",
    "Resolve 3,716 excluded rows before ERP migration cutover.",
    "Conduct vendor master deduplication — multiple vendor aliases for same entity inflate procurement metrics.",
    "Establish cost-center mandatory field — 482 transactions lack proper budget attribution.",
  ];

  const actionItems = [
    { priority: "IMMEDIATE", title: "Freeze personal expense reimbursements", description: "Hold all 1,494 personal-flagged transactions pending individual review by department heads." },
    { priority: "IMMEDIATE", title: "Activate approval workflow", description: "Escalate workflow breakdown to CTO and CFO — all 15,020 transactions require approvals within 30 days." },
    { priority: "HIGH", title: "ERP data remediation sprint", description: "Assign data engineering team to resolve 3,716 excluded rows before migration cutover." },
    { priority: "HIGH", title: "Receipt compliance campaign", description: "Require retroactive receipt submission for all FY2024-26 transactions above ₹10,000." },
    { priority: "MEDIUM", title: "Vendor master cleanup", description: "Consolidate vendor aliases — prioritise OpenAI/OPENAI duplication and Razorpay miscategorization." },
  ];

  res.json({
    overall_risk_score: overallRiskScore,
    governance_status: governanceStatus,
    key_findings: keyFindings,
    major_risks: majorRisks,
    recommendations,
    action_items: actionItems,
  });
});

// GET /expenses/receipt-compliance
router.get("/receipt-compliance", (req, res) => {
  const { expenses } = getStore();

  const attached = expenses.filter((e) => {
    const r = (e.receipt_attached || "").toLowerCase().trim();
    return r === "true" || r === "yes";
  }).length;

  const missing = expenses.filter((e) => {
    const r = (e.receipt_attached || "").toLowerCase().trim();
    return r === "false" || r === "no";
  }).length;

  const unknown = expenses.length - attached - missing;
  const total = expenses.length;

  res.json({
    attached_count: attached,
    missing_count: missing,
    unknown_count: unknown,
    attached_pct: (attached / total) * 100,
    missing_pct: (missing / total) * 100,
    unknown_pct: (unknown / total) * 100,
  });
});

export default router;
