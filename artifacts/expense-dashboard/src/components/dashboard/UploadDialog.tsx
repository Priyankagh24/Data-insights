import { useState, useRef } from "react";
import { useUploadExpenseFile } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadDialog({ open, onClose }: UploadDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const mutation = useUploadExpenseFile();

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv") && !f.name.endsWith(".xlsx")) {
      toast({ title: "Unsupported file type", description: "Please upload a .csv or .xlsx file.", variant: "destructive" });
      return;
    }
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    mutation.mutate(
      { data: { filename: file.name } },
      {
        onSuccess: () => {
          toast({ title: "Upload successful", description: `${file.name} processed successfully.` });
          setFile(null);
          onClose();
        },
        onError: () => {
          toast({ title: "Upload failed", description: "An error occurred while uploading.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Expense Data</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-dropzone"
          >
            <Upload size={32} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Drag & drop your expense file</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv and .xlsx files up to 50MB</p>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium mt-1">
                <FileText size={13} />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <input
            type="file"
            accept=".csv,.xlsx"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            data-testid="input-file"
          />

          {mutation.status === "success" && (
            <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
              <CheckCircle size={13} />
              Upload complete
            </div>
          )}
          {mutation.status === "error" && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              <AlertCircle size={13} />
              Upload failed — please try again
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} data-testid="button-cancel-upload">Cancel</Button>
            <Button size="sm" onClick={handleUpload} disabled={!file || mutation.isPending} data-testid="button-confirm-upload" className="gap-1.5">
              {mutation.isPending ? "Uploading..." : "Upload"}
              {!mutation.isPending && <Upload size={12} />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
