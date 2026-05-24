import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger";

const WORKSPACE_ROOT = join(process.cwd(), "../../");

export interface Expense {
  txn_id: string;
  submission_date: string | null;
  txn_date: string | null;
  amount_inr: number;
  original_currency: string | null;
  amount_numeric: number | null;
  exchange_rate_used: number | null;
  vendor_canonical: string;
  vendor_raw: string | null;
  description: string | null;
  department: string;
  cost_center: string | null;
  submitted_by: string | null;
  receipt_attached: string | null;
  approval_status: string | null;
  category: string | null;
  category_confidence: number | null;
  is_personal: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  is_duplicate: boolean;
  under_review: boolean;
  notes: string | null;
}

export interface AnalyticsSummary {
  report_date: string;
  source_file: string;
  total_rows_in_source: number;
  rows_loaded: number;
  rows_excluded: number;
  total_inr_spend: number;
  personal_expense_count: number;
  personal_expense_inr: number;
  duplicate_count: number;
  duplicate_value_inr: number;
  issue_summary: { CRITICAL: number; WARNING: number; INFO: number };
  spend_by_department: Record<string, number>;
  spend_by_vendor: Record<string, number>;
}

interface DataStore {
  expenses: Expense[];
  summary: AnalyticsSummary;
  loadedAt: Date;
}

let store: DataStore | null = null;

function normalizeBoolean(v: string): boolean {
  const s = (v || "").trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

function parseNumber(v: string): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function normalizeDept(dept: string): string {
  if (!dept) return "Unknown";
  const d = dept.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const map: Record<string, string> = {
    "engineering": "Engineering", "engg": "Engineering", "eng": "Engineering",
    "enginering": "Engineering", "engg team": "Engineering", "enginnering": "Engineering",
    "sales": "Sales", "saless": "Sales",
    "product": "Product", "prodct": "Product", "product mgmt": "Product Mgmt",
    "operations": "Operations", "operatons": "Operations",
    "finance": "Finance", "fiance": "Finance", "finace": "Finance",
    "hr": "HR", "h r": "HR", "hr ": "HR", "h.r.": "HR", "human resources": "HR",
    "marketing": "Marketing", "marketting": "Marketing", "mktg": "Marketing",
    "mktng": "Marketing", "markting": "Marketing",
    "devops": "DevOps", "dev ops": "DevOps", "dev-ops": "DevOps",
    "design": "Design",
    "legal": "Legal", "legals": "Legal",
    "data science": "Data Science",
    "customer success": "Customer Success",
    "security": "Security",
    "research": "Research",
    "qa": "QA",
    "it dept": "IT", "infotech": "IT", "i.t.": "IT",
  };
  return map[d] || dept.trim();
}

export function loadData(): DataStore {
  if (store) return store;

  logger.info("Loading expense data from CSV files...");

  const cleanCsvPath = join(WORKSPACE_ROOT, "attached_assets/clean_expenses_(1)_1779452414062.csv");
  const classifiedCsvPath = join(WORKSPACE_ROOT, "attached_assets/classified_expenses_1779452414064.csv");
  const summaryJsonPath = join(WORKSPACE_ROOT, "attached_assets/analytics_summary_1779452414063.json");

  const rawClean = readFileSync(cleanCsvPath, "utf-8").replace(/^\uFEFF/, "");
  const cleanRows = parse(rawClean, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

  const rawClassified = readFileSync(classifiedCsvPath, "utf-8").replace(/^\uFEFF/, "");
  const classifiedRows = parse(rawClassified, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

  const categoryMap = new Map<string, { category: string; confidence: number }>();
  for (const row of classifiedRows) {
    categoryMap.set(row["txn_id"], {
      category: row["category"] || "Miscellaneous",
      confidence: parseNumber(row["confidence"]) ?? 0.5,
    });
  }

  const summaryRaw = readFileSync(summaryJsonPath, "utf-8");
  const summary: AnalyticsSummary = JSON.parse(summaryRaw);

  const expenses: Expense[] = [];
  for (const row of cleanRows) {
    const amtInr = parseNumber(row["amount_inr"]);
    if (amtInr === null) continue;

    const cat = categoryMap.get(row["txn_id"]);
    const dept = normalizeDept(row["department"] || "");

    expenses.push({
      txn_id: row["txn_id"] || "",
      submission_date: row["submission_date"] || null,
      txn_date: row["txn_date"] || null,
      amount_inr: amtInr,
      original_currency: row["original_currency"] || null,
      amount_numeric: parseNumber(row["amount_numeric"]),
      exchange_rate_used: parseNumber(row["exchange_rate_used"]),
      vendor_canonical: row["vendor_canonical"] || "Unknown",
      vendor_raw: row["vendor_raw"] || null,
      description: row["description"] || null,
      department: dept,
      cost_center: row["cost_center"] || null,
      submitted_by: row["submitted_by"] || null,
      receipt_attached: row["receipt_attached"] || null,
      approval_status: row["approval_status"] || null,
      category: cat?.category ?? "Miscellaneous",
      category_confidence: cat?.confidence ?? 0.5,
      is_personal: normalizeBoolean(row["is_personal"]),
      is_flagged: normalizeBoolean(row["is_flagged"]),
      flag_reason: row["flag_reason"] || null,
      is_duplicate: normalizeBoolean(row["is_duplicate"]),
      under_review: normalizeBoolean(row["under_review"]),
      notes: row["notes"] || null,
    });
  }

  store = { expenses, summary, loadedAt: new Date() };
  logger.info({ count: expenses.length }, "Expense data loaded");
  return store;
}

export function getStore(): DataStore {
  return loadData();
}

export function setStore(expenses: Expense[], summary: AnalyticsSummary): void {
  store = {
    expenses,
    summary,
    loadedAt: new Date()
  };
  logger.info({ count: expenses.length }, "DataStore updated in memory");
}

