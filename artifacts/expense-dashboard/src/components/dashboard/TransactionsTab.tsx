import { useState, useCallback } from "react";
import {
  useListExpenses,
  getListExpensesQueryKey,
  useGetSpendByDepartment,
  useGetSpendByCategory,
  getGetSpendByDepartmentQueryKey,
  getGetSpendByCategoryQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/format";
import { Search, ChevronLeft, ChevronRight, Filter, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 25;

export default function TransactionsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPersonal, setFilterPersonal] = useState<"" | "true" | "false">("");
  const [filterFlagged, setFilterFlagged] = useState<"" | "true" | "false">("");

  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const { data: deptData } = useGetSpendByDepartment({ query: { queryKey: getGetSpendByDepartmentQueryKey() } });
  const { data: categoryData } = useGetSpendByCategory({ query: { queryKey: getGetSpendByCategoryQueryKey() } });

  const params = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(filterDept ? { department: filterDept } : {}),
    ...(filterCategory ? { category: filterCategory } : {}),
    ...(filterPersonal ? { is_personal: filterPersonal === "true" } : {}),
    ...(filterFlagged ? { is_flagged: filterFlagged === "true" } : {}),
  };

  const { data, isLoading } = useListExpenses(params, {
    query: { queryKey: getListExpensesQueryKey(params) },
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSearchInput("");
    setFilterDept("");
    setFilterCategory("");
    setFilterPersonal("");
    setFilterFlagged("");
    setPage(1);
  }, []);

  const activeFilterCount = [search, filterDept, filterCategory, filterPersonal, filterFlagged].filter(Boolean).length;

  const handleExport = useCallback(() => {
    if (!data?.data) return;
    const headers = ["TXN ID", "Date", "Vendor", "Department", "Amount INR", "Category", "Currency", "Submitted By", "Personal", "Flagged"];
    const rows = data.data.map((r) => [
      r.txn_id, r.txn_date ?? "", r.vendor_canonical, r.department,
      r.amount_inr.toFixed(2), r.category ?? "", r.original_currency ?? "",
      r.submitted_by ?? "", r.is_personal ? "Yes" : "No", r.is_flagged ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${data.data.length} rows downloaded as CSV.` });
  }, [data, page, toast]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search vendor, TXN ID, employee…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              data-testid="input-search"
            />
          </div>
          <Button size="sm" onClick={handleSearch} className="h-8 gap-1.5" data-testid="button-search">
            <Search size={12} />
            Search
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs bg-primary text-primary-foreground font-bold">{activeFilterCount}</span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={clearFilters} data-testid="button-clear-filters">
              <X size={12} /> Clear
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExport} data-testid="button-export">
            <Download size={12} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
            <select
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
              data-testid="select-dept"
            >
              <option value="">All departments</option>
              {deptData?.slice(0, 30).map((d) => (
                <option key={d.department} value={d.department}>{d.department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
            <select
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              data-testid="select-category"
            >
              <option value="">All categories</option>
              {categoryData?.slice(0, 30).map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Personal</label>
            <select
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              value={filterPersonal}
              onChange={(e) => { setFilterPersonal(e.target.value as "" | "true" | "false"); setPage(1); }}
              data-testid="select-personal"
            >
              <option value="">All</option>
              <option value="true">Personal only</option>
              <option value="false">Business only</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Flagged</label>
            <select
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              value={filterFlagged}
              onChange={(e) => { setFilterFlagged(e.target.value as "" | "true" | "false"); setPage(1); }}
              data-testid="select-flagged"
            >
              <option value="">All</option>
              <option value="true">Flagged only</option>
              <option value="false">Clean only</option>
            </select>
          </div>
        </div>
      )}

      {/* Results count */}
      {data && (
        <div className="text-xs text-muted-foreground">
          Showing {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, data.total).toLocaleString()} of {data.total.toLocaleString()} transactions
          {activeFilterCount > 0 && <span className="ml-2 text-primary font-medium">({activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active)</span>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["TXN ID", "Date", "Vendor", "Department", "Amount (INR)", "Category", "Currency", "Submitted By", "Status"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="py-2 px-3"><Skeleton className="h-3 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    No transactions match the current filters.
                  </td>
                </tr>
              ) : (
                data?.data.map((row, i) => (
                  <tr key={row.txn_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`txn-row-${i}`}>
                    <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">{row.txn_id}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.txn_date || row.submission_date || "—"}</td>
                    <td className="py-2 px-3 max-w-[140px]">
                      <div className="truncate font-medium text-foreground">{row.vendor_canonical}</div>
                      {row.vendor_raw && row.vendor_raw !== row.vendor_canonical && (
                        <div className="text-muted-foreground truncate text-[10px]">{row.vendor_raw}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.department}</td>
                    <td className="py-2 px-3 font-semibold tabular-nums whitespace-nowrap text-right">
                      <span className={row.amount_inr < 0 ? "text-red-500" : ""}>{formatINR(row.amount_inr)}</span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{row.category || "—"}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{row.original_currency || "INR"}</td>
                    <td className="py-2 px-3 text-muted-foreground max-w-[100px] truncate">{row.submitted_by || "—"}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {row.is_personal && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20 whitespace-nowrap">Personal</span>
                        )}
                        {row.is_flagged && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">Flagged</span>
                        )}
                        {row.is_duplicate && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20 whitespace-nowrap">Duplicate</span>
                        )}
                        {!row.is_personal && !row.is_flagged && !row.is_duplicate && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">Clean</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="gap-1.5"
            data-testid="button-prev-page"
          >
            <ChevronLeft size={13} />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) p = i + 1;
              else if (page <= 4) p = i + 1;
              else if (page >= totalPages - 3) p = totalPages - 6 + i;
              else p = page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  data-testid={`page-btn-${p}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="gap-1.5"
            data-testid="button-next-page"
          >
            Next
            <ChevronRight size={13} />
          </Button>
        </div>
      )}
    </div>
  );
}
