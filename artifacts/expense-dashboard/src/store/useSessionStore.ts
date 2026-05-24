import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface PipelineStep {
  step: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
  rows_affected?: number;
}

export interface ExclusionReason {
  reason: string;
  count: number;
  severity: 'CRITICAL' | 'WARNING';
}

export interface ProcessingResult {
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
  sample_issues: any[];
}

interface SessionState {
  // Session management
  isFileUploaded: boolean;
  currentStep: 'upload' | 'processing' | 'summary' | 'dashboard';
  processingResult: ProcessingResult | null;
  uploadedFileName: string;
  uploadedAt: string;

  // Processing state
  isProcessing: boolean;
  processingProgress: number;

  processingStages: {
    stage: string;
    status: 'pending' | 'in-progress' | 'completed';
  }[];

  // Actions
  setFileUploaded: (
    result: ProcessingResult,
    filename: string
  ) => void;

  setCurrentStep: (
    step: 'upload' | 'processing' | 'summary' | 'dashboard'
  ) => void;

  setProcessing: (processing: boolean) => void;

  setProcessingProgress: (progress: number) => void;

  setProcessingStage: (
    index: number,
    status: 'pending' | 'in-progress' | 'completed'
  ) => void;

  initStages: (stages: string[]) => void;

  resetSession: () => void;

  getCleaningStats: () => {
    totalRows: number;
    cleanedRows: number;
    removedRows: number;
    duplicateRows: number;
    invalidRows: number;
    missingReceipts: number;
    cleaningAccuracy: number;
  } | null;
}

const defaultProcessingStages = [
  { stage: 'Reading File', status: 'pending' as const },
  { stage: 'Cleaning Data', status: 'pending' as const },
  { stage: 'Validating Rows', status: 'pending' as const },
  { stage: 'Normalizing Vendors', status: 'pending' as const },
  { stage: 'AI Classification', status: 'pending' as const },
  { stage: 'Generating Analytics', status: 'pending' as const },
];

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      isFileUploaded: false,
      currentStep: 'upload',
      processingResult: null,
      uploadedFileName: '',
      uploadedAt: '',

      isProcessing: false,
      processingProgress: 0,

      processingStages: defaultProcessingStages,

      setFileUploaded: (result, filename) => {
        set({
          isFileUploaded: true,
          processingResult: result,
          uploadedFileName: filename,
          uploadedAt: new Date().toISOString(),
          currentStep: 'summary',
          isProcessing: false,
        });
      },

      setCurrentStep: (step) => {
        set({
          currentStep: step,
        });
      },

      setProcessing: (processing) => {
        set({
          isProcessing: processing,
        });
      },

      setProcessingProgress: (progress) => {
        set({
          processingProgress: Math.min(progress, 100),
        });
      },

      setProcessingStage: (index, status) => {
        set((state) => {
          const updatedStages = [...state.processingStages];

          if (updatedStages[index]) {
            updatedStages[index] = {
              ...updatedStages[index],
              status,
            };
          }

          return {
            processingStages: updatedStages,
          };
        });
      },

      initStages: (stages) => {
        set({
          processingStages: stages.map((stage) => ({
            stage,
            status: 'pending',
          })),
          processingProgress: 0,
        });
      },

      resetSession: () => {
        set({
          isFileUploaded: false,
          currentStep: 'upload',
          processingResult: null,
          uploadedFileName: '',
          uploadedAt: '',
          isProcessing: false,
          processingProgress: 0,
          processingStages: defaultProcessingStages,
        });
      },

      getCleaningStats: () => {
        const state = get();

        if (!state.processingResult) return null;

        const result = state.processingResult;

        const totalRows = result.total_source_rows;
        const cleanedRows = result.clean_rows;
        const removedRows = result.excluded_rows;

        const duplicateReason =
          result.exclusion_reasons.find((r) =>
            r.reason.includes('Duplicate')
          );

        const duplicateRows = duplicateReason?.count || 0;

        const invalidRows = Math.max(
          0,
          removedRows - duplicateRows
        );

        const missingReceipts =
          result.clean_summary.missing_receipts;

        const cleaningAccuracy =
          totalRows > 0
            ? (cleanedRows / totalRows) * 100
            : 0;

        return {
          totalRows,
          cleanedRows,
          removedRows,
          duplicateRows,
          invalidRows,
          missingReceipts,
          cleaningAccuracy,
        };
      },
    }),
    {
      name: 'expense-iq-session',
      version: 1,
    }
  )
);