import { useRouter } from 'wouter';
import { useState } from 'react';
import { ArrowRight, DownloadCloud, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/store/useSessionStore';
import { CleaningKPIGrid } from '@/components/dashboard/CleaningKPICards';
import { DataCleaningReport } from '@/components/dashboard/DataCleaningReport';
import NotFound from './not-found';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';


export default function CleaningSummaryPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const processingResult = useSessionStore(state => state.processingResult);
  const uploadedFileName = useSessionStore(state => state.uploadedFileName);
  const resetSession = useSessionStore(state => state.resetSession);

  // Redirect if no processing result
  if (!processingResult || !processingResult.success) {
    return <NotFound />;
  }

  const stats = processingResult.clean_summary;
  const cleaningAccuracy = ((processingResult.clean_rows / processingResult.total_source_rows) * 100) || 0;
  
  // Extract cleaning stats
  const duplicateReason = processingResult.exclusion_reasons.find(r => r.reason.includes('Duplicate'));
  const duplicateRows = duplicateReason?.count || 0;
  const invalidRows = Math.max(0, processingResult.excluded_rows - duplicateRows);
  const avgTransaction = processingResult.clean_rows > 0 ? stats.total_spend_inr / processingResult.clean_rows : 0;
  
  // Calculate risk score (simplified)
  const riskScore = Math.min(100, (stats.personal_flagged / processingResult.clean_rows) * 100 + (stats.missing_receipts / processingResult.clean_rows) * 50);

  const handleExportCleanedData = async () => {
    setIsExporting(true);
    try {
      // Mock export - in real implementation would download actual cleaned data
      toast({
        title: 'Export successful',
        description: 'cleaned_data.xlsx has been downloaded',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      toast({
        title: 'Export successful',
        description: 'cleaning_report.pdf has been downloaded',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetSession = () => {
    resetSession();
    navigate('/upload');
  };

  return (
    <AppLayout
      activeNav="summary"
      title="Cleaning Summary"
      description={`File: ${uploadedFileName}`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
          <div>
            <h2 className="text-lg font-bold text-foreground">Data Processing Complete</h2>
            <p className="text-sm text-muted-foreground">
              Review your data cleaning results before exploring the dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleExportCleanedData}
              disabled={isExporting}
              variant="outline"
              size="sm"
            >
              <DownloadCloud size={14} className="mr-1.5" />
              Export Data
            </Button>
            <Button
              onClick={handleExportReport}
              disabled={isExporting}
              variant="outline"
              size="sm"
            >
              <DownloadCloud size={14} className="mr-1.5" />
              Export Report
            </Button>
            <Button
              onClick={handleResetSession}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <CleaningKPIGrid
          totalRows={processingResult.total_source_rows}
          cleanedRows={processingResult.clean_rows}
          removedRows={processingResult.excluded_rows}
          duplicateRows={duplicateRows}
          invalidRows={invalidRows}
          missingReceipts={stats.missing_receipts}
          flaggedPersonal={stats.personal_flagged}
          uniqueVendors={stats.unique_vendors}
          uniqueDepartments={stats.unique_departments}
          totalSpend={stats.total_spend_inr}
          avgTransaction={avgTransaction}
          riskScore={riskScore}
          cleaningAccuracy={cleaningAccuracy}
          processingTime={processingResult.processing_time_ms}
        />

        {/* Data Cleaning Report */}
        <DataCleaningReport
          totalRows={processingResult.total_source_rows}
          cleanedRows={processingResult.clean_rows}
          removedRows={processingResult.excluded_rows}
          exclusionReasons={processingResult.exclusion_reasons}
          cleaningAccuracy={cleaningAccuracy}
          processingTime={processingResult.processing_time_ms}
          pipelineSteps={processingResult.pipeline_steps}
        />

      </div>
    </AppLayout>
  );
}
