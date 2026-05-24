import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Upload, FileText, CheckCircle2, Zap, AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSessionStore } from '@/store/useSessionStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';

const PROCESSING_STAGES = [
  'Reading File',
  'Cleaning Data',
  'Validating Rows',
  'Normalizing Vendors',
  'AI Classification',
  'Generating Analytics',
];

export default function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const setFileUploaded = useSessionStore(state => state.setFileUploaded);
  const setProcessingStage = useSessionStore(state => state.setProcessingStage);
  const setProcessingProgress = useSessionStore(state => state.setProcessingProgress);
  const processingStages = useSessionStore(state => state.processingStages);
  const processingProgress = useSessionStore(state => state.processingProgress);
  const initStages = useSessionStore(state => state.initStages);

  useEffect(() => {
    // Reset stages to the compact list when mounting
    initStages(PROCESSING_STAGES);
  }, [initStages]);

  const simulateProcessing = async () => {
    for (let i = 0; i < PROCESSING_STAGES.length; i++) {
      setProcessingStage(i, 'in-progress');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
      
      setProcessingStage(i, 'completed');
      setProcessingProgress(((i + 1) / PROCESSING_STAGES.length) * 100);
    }
    setProcessingProgress(100);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel (.xlsx, .xls) or CSV file.',
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setShowPipeline(true);
    setProcessingProgress(0);
    initStages(PROCESSING_STAGES);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload`,  {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Start processing simulation
      await simulateProcessing();

      // Store result in session
      setFileUploaded(result, file.name);

      // Navigate to summary
      setTimeout(() => {
        navigate('/summary');
      }, 500);

      toast({
        title: 'Upload successful!',
        description: `${file.name} has been processed and cleaned.`,
      });
    } catch (error) {
      setIsProcessing(false);
      // Wait before hiding pipeline on error
      setTimeout(() => setShowPipeline(false), 2000);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <AppLayout
      activeNav="upload"
      title="Upload Data"
      description="Upload your expense sheets to begin cleaning, validating, and normalizing data."
      hideSidebar={true}
    >
      <div className="max-w-5xl mx-auto py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Zap size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">
            AI-Powered Expense Intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload dirty expense sheets to automatically clean, classify, validate, normalize, and generate enterprise-grade analytics.
          </p>
        </div>

        {/* Upload Area */}
        {!showPipeline && (
          <div className="max-w-3xl mx-auto mb-16">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                transition-all duration-300 bg-card
                ${isDragging
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                disabled={isProcessing}
              />

              <div className="flex flex-col items-center">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
                  ${isDragging
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  }
                `}>
                  <Upload size={32} />
                </div>

                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  Drag & drop your file here
                </h3>
                <p className="text-muted-foreground mb-6">
                  or click to browse
                </p>

                <div className="text-sm text-muted-foreground mb-6">
                  Supported formats: <span className="text-foreground font-medium">.xlsx, .xls, .csv</span>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  variant="default"
                  className="gap-2"
                >
                  <Upload size={16} />
                  Select File
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Processing Pipeline */}
        {showPipeline && (
          <div className="max-w-3xl mx-auto mb-16 bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-primary" size={24} />
                <h3 className="text-xl font-bold text-foreground">Processing File</h3>
              </div>
              <p className="text-sm text-muted-foreground">{fileName || 'Your file'} is being analyzed</p>
            </div>

            <div className="space-y-6">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Overall Progress</span>
                  <span className="text-sm font-semibold text-primary">{Math.round(processingProgress)}%</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </div>

              {/* Stages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processingStages.map((stage, idx) => {
                  const isActive = stage.status === 'in-progress';
                  const isCompleted = stage.status === 'completed';
                  const isPending = stage.status === 'pending';

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                        isActive
                          ? 'bg-primary/5 border-primary/30'
                          : isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        ) : isActive ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Loader2 size={14} className="text-primary-foreground animate-spin" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-muted-foreground/30"></div>
                        )}
                      </div>
                      <span
                        className={`flex-1 text-sm font-medium ${
                          isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isActive
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {stage.stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-center mb-8 text-foreground">What we do for you</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle2, title: 'Data Cleaning', desc: 'Remove corrupted & invalid entries' },
              { icon: AlertCircle, title: 'Duplicate Detection', desc: 'Identify & eliminate duplicates' },
              { icon: Zap, title: 'AI Classification', desc: 'LLM-powered categorization' },
              { icon: FileText, title: 'Vendor Normalization', desc: 'Standardize vendor names' },
              { icon: AlertCircle, title: 'Fraud Detection', desc: 'AI-powered anomaly detection' },
              { icon: CheckCircle2, title: 'Insights', desc: 'Executive summary & KPIs' },
              { icon: Zap, title: 'Analytics', desc: 'Interactive dashboards' },
              { icon: ArrowRight, title: 'Export', desc: 'Multiple export formats' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-card border border-border transition-colors hover:border-primary/30"
              >
                <item.icon className="text-primary mb-2" size={24} />
                <h3 className="font-semibold text-foreground mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
