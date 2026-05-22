import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, XCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { formatINR, formatPercent } from "@/lib/format";

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

interface PipelineStep {
  step: string;
  status: "ok" | "warn" | "error";
  detail: string;
  rows_affected?: number;
}

interface ExclusionReason {
  reason: string;
  count: number;
  severity: "CRITICAL" | "WARNING";
}

interface CleanSummary {
  total_spend_inr: number;
  unique_vendors: number;
  unique_departments: number;
  date_range: string;
  currencies_detected: number;
  personal_flagged: number;
  missing_receipts: number;
  missing_receipt_pct: number;
}

interface SampleIssue {
  row: number;
  field: string;
  issue: string;
  value: string;
}

interface PipelineResult {
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
  message?: string;
}

type Stage = "idle" | "processing" | "done" | "error";

const STEP_ICONS: Record<string, "ok" | "warn" | "error"> = {};

function StepIcon({ status }: { status: "ok" | "warn" | "error" }) {
  if (status === "ok") return <CheckCircle size={14} className="text-emerald-500 shrink-0" />;
  if (status === "warn") return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
  return <XCircle size={14} className="text-red-500 shrink-0" />;
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "green" | "amber" }) {
  const color = highlight === "red" ? "text-red-500" : highlight === "green" ? "text-emerald-500" : highlight === "amber" ? "text-amber-500" : "text-foreground";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export default function UploadDialog({ open, onClose }: UploadDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      toast({ title: "Unsupported file type", description: "Please upload a .csv, .xls, or .xlsx file.", variant: "destructive" });
      return;
    }
    setFile(f);
    setStage("idle");
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setStage("processing");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data: PipelineResult = await res.json();
      if (!res.ok || !data.success) {
        setStage("error");
        setResult(data);
        toast({ title: "Pipeline failed", description: data.message ?? "An error occurred.", variant: "destructive" });
      } else {
        setStage("done");
        setResult(data);
      }
    } catch {
      setStage("error");
      toast({ title: "Upload failed", description: "Could not reach the server.", variant: "destructive" });
    }
  }, [file, toast]);

  function handleClose() {
    setFile(null);
    setStage("idle");
    setResult(null);
    onClose();
  }

  const isWide = stage === "done" || stage === "error";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className={isWide ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stage === "processing" && <Loader2 size={15} className="animate-spin text-primary" />}
            {stage === "done" && <CheckCircle size={15} className="text-emerald-500" />}
            {stage === "error" && <XCircle size={15} className="text-red-500" />}
            {stage === "idle" || stage === "processing" ? "Upload Expense Data" : stage === "done" ? "Pipeline Complete" : "Pipeline Failed"}
          </DialogTitle>
        </DialogHeader>

        {/* IDLE / PROCESSING — file picker */}
        {(stage === "idle" || stage === "processing") && (
          <div className="mt-2 flex flex-col gap-4">
            <div
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                stage === "processing" ? "opacity-60 pointer-events-none" :
                dragging ? "border-primary bg-primary/5 cursor-copy" : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => stage === "idle" && fileInputRef.current?.click()}
              data-testid="upload-dropzone"
            >
              {stage === "processing" ? (
                <>
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Running cleaning pipeline…</p>
                    <p className="text-xs text-muted-foreground mt-1">Parsing, normalising, validating rows</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Drag & drop your dirty expense file</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xls, .xlsx — up to 100 MB</p>
                  </div>
                </>
              )}
              {file && stage === "idle" && (
                <div className="flex items-center gap-2 text-xs text-primary font-medium mt-1 bg-primary/8 px-3 py-1.5 rounded-md border border-primary/20">
                  <FileText size={12} />
                  {file.name}
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>

            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              data-testid="input-file"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} data-testid="button-cancel-upload">Cancel</Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file || stage === "processing"}
                data-testid="button-confirm-upload"
                className="gap-1.5"
              >
                {stage === "processing" ? (
                  <><Loader2 size={12} className="animate-spin" />Processing…</>
                ) : (
                  <><Upload size={12} />Run Pipeline</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* DONE — pipeline results */}
        {stage === "done" && result && (
          <div className="mt-2 flex flex-col gap-4">
            {/* Hero stats */}
            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-4">
              <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle size={13} />
                Pipeline complete · {result.filename} · {result.processing_time_ms}ms
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-foreground tabular-nums">{result.total_source_rows.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total source rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-500 tabular-nums">{result.clean_rows.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Clean rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-red-500 tabular-nums">{result.excluded_rows.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Excluded rows</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Clean rate</span>
                  <span className="font-semibold text-emerald-500">{formatPercent(100 - result.exclusion_rate)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${100 - result.exclusion_rate}%` }} />
                  <div className="h-full bg-red-500 transition-all" style={{ width: `${result.exclusion_rate}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Pipeline steps */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pipeline Steps</div>
                <div className="flex flex-col gap-1.5">
                  {result.pipeline_steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2" data-testid={`pipeline-step-${i}`}>
                      <StepIcon status={step.status} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground">{step.step}</div>
                        <div className="text-xs text-muted-foreground leading-tight">{step.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean summary */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Clean Data Summary</div>
                <div className="rounded-md border border-border bg-card p-3">
                  <StatRow label="Total Spend (INR)" value={formatINR(result.clean_summary.total_spend_inr)} highlight="green" />
                  <StatRow label="Unique Vendors" value={result.clean_summary.unique_vendors.toLocaleString()} />
                  <StatRow label="Unique Departments" value={result.clean_summary.unique_departments.toLocaleString()} />
                  <StatRow label="Date Range" value={result.clean_summary.date_range} />
                  <StatRow label="Currencies" value={result.clean_summary.currencies_detected.toLocaleString()} />
                  <StatRow label="Personal Flagged" value={result.clean_summary.personal_flagged.toLocaleString()} highlight="amber" />
                  <StatRow label="Missing Receipts" value={`${result.clean_summary.missing_receipts.toLocaleString()} (${formatPercent(result.clean_summary.missing_receipt_pct)})`} highlight="red" />
                </div>
              </div>
            </div>

            {/* Exclusion reasons */}
            {result.exclusion_reasons.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Exclusion Reasons</div>
                <div className="flex flex-col gap-1">
                  {result.exclusion_reasons.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-1.5" data-testid={`exclusion-reason-${i}`}>
                      <div className="flex items-center gap-2">
                        {r.severity === "CRITICAL"
                          ? <XCircle size={11} className="text-red-500 shrink-0" />
                          : <AlertTriangle size={11} className="text-amber-500 shrink-0" />}
                        <span className="text-xs text-foreground">{r.reason}</span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${r.severity === "CRITICAL" ? "text-red-500" : "text-amber-500"}`}>
                        {r.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample issues */}
            {result.sample_issues.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sample Issues</div>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Row</th>
                        <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Field</th>
                        <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Issue</th>
                        <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Raw Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sample_issues.map((issue, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 px-3 font-mono text-muted-foreground">{issue.row}</td>
                          <td className="py-1.5 px-3 font-mono text-foreground">{issue.field}</td>
                          <td className="py-1.5 px-3 text-amber-600 dark:text-amber-400">{issue.issue}</td>
                          <td className="py-1.5 px-3 font-mono text-muted-foreground max-w-[120px] truncate">{issue.value || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" onClick={handleClose} data-testid="button-done" className="gap-1.5">
                <CheckCircle size={12} />
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ERROR state */}
        {stage === "error" && (
          <div className="mt-2 flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/8 p-4">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-foreground mb-1">Pipeline failed</div>
                <p className="text-xs text-muted-foreground">{result?.message ?? "The server could not process this file. Ensure it is a valid .csv or .xlsx expense report."}</p>
              </div>
            </div>
            {result?.pipeline_steps && result.pipeline_steps.length > 0 && (
              <div className="flex flex-col gap-1">
                {result.pipeline_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <StepIcon status={step.status} />
                    <div>
                      <span className="text-xs font-medium text-foreground">{step.step}: </span>
                      <span className="text-xs text-muted-foreground">{step.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setStage("idle"); setResult(null); }} data-testid="button-retry">Try Again</Button>
              <Button variant="outline" size="sm" onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
