import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";

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
  message?: string;
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: PipelineResult) => void;
}

export default function UploadDialog({ open, onClose, onSuccess }: UploadDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      toast({ title: "Unsupported file type", description: "Please upload a .csv, .xls, or .xlsx file.", variant: "destructive" });
      return;
    }
    setFile(f);
    setErrorMsg(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data: PipelineResult = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message ?? "Pipeline failed — check the file format.");
        setProcessing(false);
      } else {
        setProcessing(false);
        setFile(null);
        setErrorMsg(null);
        onClose();
        onSuccess(data);
      }
    } catch {
      setErrorMsg("Could not reach the server. Is the API running?");
      setProcessing(false);
    }
  }, [file, onClose, onSuccess]);

  function handleClose() {
    if (processing) return;
    setFile(null);
    setErrorMsg(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={15} className="text-primary" />
            Upload Expense Data
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          {/* Drop zone */}
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              processing
                ? "opacity-60 pointer-events-none border-border"
                : dragging
                ? "border-primary bg-primary/5 cursor-copy"
                : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !processing && fileInputRef.current?.click()}
            data-testid="upload-dropzone"
          >
            {processing ? (
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

            {file && !processing && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/8 px-3 py-1.5 rounded-md border border-primary/20">
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

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/8 px-3 py-2">
              <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={processing} data-testid="button-cancel-upload">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={!file || processing}
              data-testid="button-confirm-upload"
              className="gap-1.5"
            >
              {processing ? (
                <><Loader2 size={12} className="animate-spin" />Processing…</>
              ) : (
                <><Upload size={12} />Run Pipeline</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
