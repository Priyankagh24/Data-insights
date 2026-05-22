import * as XLSX from "xlsx";
import { logger } from "../lib/logger";

export interface PipelineResult {
  success: boolean;
  filename: string;
  total_source_rows: number;
  clean_rows: number;
  excluded_rows: number;
  exclusion_rate: number;
  processing_time_ms: number;
  pipeline_steps: PipelineStep[];
  exclusion_reasons: ExclusionReason[];
  clean_summary: CleanSummary;
  sample_issues: SampleIssue[];
}

export interface PipelineStep {
  step: string;
  status: "ok" | "warn" | "error";
  detail: string;
  rows_affected?: number;
}

export interface ExclusionReason {
  reason: string;
  count: number;
  severity: "CRITICAL" | "WARNING";
}

export interface CleanSummary {
  total_spend_inr: number;
  unique_vendors: number;
  unique_departments: number;
  date_range: string;
  currencies_detected: number;
  personal_flagged: number;
  missing_receipts: number;
  missing_receipt_pct: number;
}

export interface SampleIssue {
  row: number;
  field: string;
  issue: string;
  value: string;
}

type RawRow = Record<string, unknown>;

const AMOUNT_FIELDS = ["amount_inr", "amount", "amount_numeric", "value", "spend", "cost"];
const DATE_FIELDS = ["txn_date", "transaction_date", "date", "submission_date", "submitted_date"];
const VENDOR_FIELDS = ["vendor_canonical", "vendor", "vendor_raw", "merchant", "payee"];
const DEPT_FIELDS = ["department", "dept", "division", "bu", "business_unit"];
const SUBMITTER_FIELDS = ["submitted_by", "employee", "submitter", "name", "emp_name"];
const CURRENCY_FIELDS = ["original_currency", "currency", "cur", "ccy"];
const RECEIPT_FIELDS = ["receipt_attached", "receipt", "has_receipt"];

const PERSONAL_KEYWORDS = [
  "amazon", "flipkart", "swiggy", "zomato", "ola", "uber eats", "netflix",
  "hotstar", "prime video", "youtube premium", "spotify", "personal", "home",
  "family", "groceries", "grocery", "medicine", "medical", "pharmacy",
  "myntra", "ajio", "meesho", "bigbasket", "blinkit", "zepto"
];

function findCol(row: RawRow, candidates: string[]): string | null {
  const keys = Object.keys(row).map((k) => k.toLowerCase().trim());
  for (const c of candidates) {
    const idx = keys.indexOf(c);
    if (idx !== -1) return Object.keys(row)[idx];
  }
  // partial match
  for (const c of candidates) {
    const idx = keys.findIndex((k) => k.includes(c) || c.includes(k));
    if (idx !== -1) return Object.keys(row)[idx];
  }
  return null;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    // Excel serial date
    try {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    } catch {
      return null;
    }
  }
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "null") return null;
  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // M/D/YY
  ];
  for (const fmt of formats) {
    if (fmt.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const s = String(v).replace(/[₹$€£,\s]/g, "").trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "null") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function normalizeVendor(v: unknown): string {
  if (!v) return "Unknown";
  return String(v).trim().replace(/\s+/g, " ").replace(/[^\w\s\-&.]/g, "").trim() || "Unknown";
}

function normalizeDept(v: unknown): string {
  if (!v) return "Unknown";
  return String(v).trim() || "Unknown";
}

function detectPersonal(vendor: string, desc: string): boolean {
  const combined = `${vendor} ${desc}`.toLowerCase();
  return PERSONAL_KEYWORDS.some((kw) => combined.includes(kw));
}

export function runCleaningPipeline(fileBuffer: Buffer, filename: string): PipelineResult {
  const start = Date.now();
  const steps: PipelineStep[] = [];
  const sampleIssues: SampleIssue[] = [];

  // Step 1: Parse file
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: false, raw: false });
    steps.push({ step: "File Parsed", status: "ok", detail: `Workbook loaded: ${wb.SheetNames.length} sheet(s) found` });
  } catch (err) {
    logger.error({ err }, "Failed to parse uploaded file");
    return {
      success: false,
      filename,
      total_source_rows: 0,
      clean_rows: 0,
      excluded_rows: 0,
      exclusion_rate: 0,
      processing_time_ms: Date.now() - start,
      pipeline_steps: [{ step: "File Parsed", status: "error", detail: "Could not parse file — ensure it is a valid .xlsx or .csv" }],
      exclusion_reasons: [],
      clean_summary: { total_spend_inr: 0, unique_vendors: 0, unique_departments: 0, date_range: "—", currencies_detected: 0, personal_flagged: 0, missing_receipts: 0, missing_receipt_pct: 0 },
      sample_issues: [],
    };
  }

  // Step 2: Extract rows
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });

  const totalSourceRows = rawRows.length;
  steps.push({ step: "Sheet Read", status: "ok", detail: `Sheet "${sheetName}" — ${totalSourceRows.toLocaleString()} data rows extracted` });

  if (totalSourceRows === 0) {
    return {
      success: false,
      filename,
      total_source_rows: 0,
      clean_rows: 0,
      excluded_rows: 0,
      exclusion_rate: 0,
      processing_time_ms: Date.now() - start,
      pipeline_steps: [...steps, { step: "Validation", status: "error", detail: "No data rows found in the sheet" }],
      exclusion_reasons: [],
      clean_summary: { total_spend_inr: 0, unique_vendors: 0, unique_departments: 0, date_range: "—", currencies_detected: 0, personal_flagged: 0, missing_receipts: 0, missing_receipt_pct: 0 },
      sample_issues: [],
    };
  }

  // Step 3: Detect column mapping
  const sample = rawRows[0];
  const amountCol = findCol(sample, AMOUNT_FIELDS);
  const dateCol = findCol(sample, DATE_FIELDS);
  const vendorCol = findCol(sample, VENDOR_FIELDS);
  const deptCol = findCol(sample, DEPT_FIELDS);
  const submitterCol = findCol(sample, SUBMITTER_FIELDS);
  const currencyCol = findCol(sample, CURRENCY_FIELDS);
  const receiptCol = findCol(sample, RECEIPT_FIELDS);

  const mappedCols = [amountCol, dateCol, vendorCol].filter(Boolean).length;
  steps.push({
    step: "Column Mapping",
    status: mappedCols >= 2 ? "ok" : "warn",
    detail: `Mapped: amount→${amountCol ?? "?"}, date→${dateCol ?? "?"}, vendor→${vendorCol ?? "?"}, dept→${deptCol ?? "?"}, submitter→${submitterCol ?? "?"}`,
  });

  // Step 4: Parse and clean each row
  const exclusionMap = new Map<string, number>();
  function exclude(reason: string) {
    exclusionMap.set(reason, (exclusionMap.get(reason) ?? 0) + 1);
  }

  let cleanCount = 0;
  let totalSpend = 0;
  let minDate = "9999-12-31";
  let maxDate = "0000-01-01";
  const vendors = new Set<string>();
  const depts = new Set<string>();
  const currencies = new Set<string>();
  let personalCount = 0;
  let missingReceiptCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // +2 for 1-based + header
    let excluded = false;

    // Parse amount
    const rawAmount = amountCol ? row[amountCol] : null;
    const amount = parseAmount(rawAmount);
    if (amount === null) {
      exclude("Missing or unparseable amount");
      if (sampleIssues.length < 8) sampleIssues.push({ row: rowNum, field: amountCol ?? "amount", issue: "Unparseable amount", value: String(rawAmount ?? "") });
      excluded = true;
    }

    // Parse date
    const rawDate = dateCol ? row[dateCol] : null;
    const date = parseDate(rawDate);
    if (!date) {
      exclude("Missing or unparseable date");
      if (sampleIssues.length < 8) sampleIssues.push({ row: rowNum, field: dateCol ?? "date", issue: "Unparseable date", value: String(rawDate ?? "") });
      excluded = true;
    }

    // Vendor
    const rawVendor = vendorCol ? row[vendorCol] : null;
    const vendor = normalizeVendor(rawVendor);
    if (vendor === "Unknown" || vendor === "") {
      exclude("Missing vendor");
      if (sampleIssues.length < 8 && !excluded) sampleIssues.push({ row: rowNum, field: vendorCol ?? "vendor", issue: "Missing vendor", value: "" });
      excluded = true;
    }

    if (excluded) continue;

    // Row is clean — compute stats
    cleanCount++;
    totalSpend += amount!;

    if (date! < minDate) minDate = date!;
    if (date! > maxDate) maxDate = date!;

    vendors.add(vendor);

    const dept = normalizeDept(deptCol ? row[deptCol] : null);
    depts.add(dept);

    const currency = currencyCol ? String(row[currencyCol] ?? "INR").trim().toUpperCase() || "INR" : "INR";
    currencies.add(currency);

    const desc = String((row["description"] ?? row["desc"] ?? row["narration"] ?? "")).toLowerCase();
    if (detectPersonal(vendor, desc)) personalCount++;

    const receipt = String(receiptCol ? row[receiptCol] : "").toLowerCase().trim();
    if (!receipt || receipt === "false" || receipt === "no" || receipt === "0") missingReceiptCount++;
  }

  const excludedCount = totalSourceRows - cleanCount;

  // Step 5: Date normalisation
  const dateIssueRows = rawRows.filter((r) => {
    const raw = dateCol ? r[dateCol] : null;
    return raw && parseDate(raw) !== null;
  }).length;
  steps.push({ step: "Date Normalisation", status: "ok", detail: `${dateIssueRows.toLocaleString()} dates successfully normalised`, rows_affected: dateIssueRows });

  // Step 6: Amount parsing
  const amountParsed = cleanCount;
  steps.push({ step: "Amount Parsing", status: "ok", detail: `${amountParsed.toLocaleString()} amounts parsed successfully`, rows_affected: amountParsed });

  // Step 7: Vendor canonicalisation
  steps.push({ step: "Vendor Canonicalisation", status: "ok", detail: `${vendors.size} unique vendors resolved`, rows_affected: vendors.size });

  // Step 8: Personal expense detection
  steps.push({ step: "Personal Expense Detection", status: personalCount > 0 ? "warn" : "ok", detail: `${personalCount.toLocaleString()} personal transactions detected via keyword matching`, rows_affected: personalCount });

  // Step 9: Row exclusion
  const totalExcluded = excludedCount;
  steps.push({
    step: "Row Exclusion",
    status: totalExcluded > totalSourceRows * 0.3 ? "warn" : "ok",
    detail: `${totalExcluded.toLocaleString()} rows excluded (${((totalExcluded / totalSourceRows) * 100).toFixed(1)}%)`,
    rows_affected: totalExcluded,
  });

  // Build exclusion reasons
  const exclusionReasons: ExclusionReason[] = Array.from(exclusionMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([reason, count]) => ({
      reason,
      count,
      severity: count > totalSourceRows * 0.05 ? "CRITICAL" : "WARNING",
    }));

  const dateRange = cleanCount > 0 ? `${minDate} to ${maxDate}` : "—";
  const missingReceiptPct = cleanCount > 0 ? (missingReceiptCount / cleanCount) * 100 : 0;

  return {
    success: true,
    filename,
    total_source_rows: totalSourceRows,
    clean_rows: cleanCount,
    excluded_rows: excludedCount,
    exclusion_rate: (excludedCount / totalSourceRows) * 100,
    processing_time_ms: Date.now() - start,
    pipeline_steps: steps,
    exclusion_reasons: exclusionReasons,
    clean_summary: {
      total_spend_inr: totalSpend,
      unique_vendors: vendors.size,
      unique_departments: depts.size,
      date_range: dateRange,
      currencies_detected: currencies.size,
      personal_flagged: personalCount,
      missing_receipts: missingReceiptCount,
      missing_receipt_pct: missingReceiptPct,
    },
    sample_issues: sampleIssues,
  };
}
