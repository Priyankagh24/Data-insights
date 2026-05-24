import { Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface ProcessingStage {
  stage: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface UploadProgressProps {
  isOpen: boolean;
  isProcessing: boolean;
  progress: number;
  stages: ProcessingStage[];
  fileName: string;
}

export const UploadProgress = ({
  isOpen,
  progress,
  stages,
  fileName,
}: UploadProgressProps) => {
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = stages.length;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="animate-spin text-primary" size={20} />
            Processing File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Info */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground">Processing file:</p>
            <p className="text-lg font-semibold text-foreground truncate mt-1">{fileName}</p>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stages */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Pipeline Stages</p>
            <div className="space-y-2">
              {stages.map((stage, idx) => {
                const isActive = stage.status === 'in-progress';
                const isCompleted = stage.status === 'completed';
                const isPending = stage.status === 'pending';

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors border ${
                      isActive
                        ? 'bg-primary/5 border-primary/30'
                        : isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-transparent border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Loader2 size={16} className="text-primary-foreground animate-spin" />
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
                    {isCompleted && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded">
                        Complete
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage Counter */}
          <div className="text-center text-sm text-muted-foreground">
            Completed {completedStages} of {totalStages} stages
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
