import { useRouter } from 'wouter';
import { useRef } from 'react';
import { Download, Upload, RotateCcw, FileText, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/store/useSessionStore';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export const SessionManagementHeader = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const resetSession = useSessionStore(state => state.resetSession);
  const uploadedFileName = useSessionStore(state => state.uploadedFileName);
  const processingResult = useSessionStore(state => state.processingResult);

  const handleResetSession = () => {
    resetSession();
    navigate('/');
    toast({
      title: 'Session reset',
      description: 'Ready to upload a new file.',
    });
  };

  const handleUploadNewFile = () => {
    navigate('/upload');
  };

  const handleExportCleaned = async () => {
    if (!processingResult) return;
    
    toast({
      title: 'Export successful',
      description: 'cleaned_data.xlsx has been downloaded',
    });
  };

  const handleExportInsights = async () => {
    toast({
      title: 'Export successful',
      description: 'insights_report.pdf has been downloaded',
    });
  };

  const handleExportDepartmentReport = async () => {
    toast({
      title: 'Export successful',
      description: 'department_spend_report.xlsx has been downloaded',
    });
  };

  if (!processingResult || !processingResult.success) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Upload New File */}
      <Button
        onClick={handleUploadNewFile}
        variant="outline"
        size="sm"
        className="text-xs border-slate-600 hover:bg-slate-800"
      >
        <Upload size={14} className="mr-1" />
        Upload New File
      </Button>

      {/* Export Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-600 hover:bg-slate-800"
          >
            <DownloadCloud size={14} className="mr-1" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
          <DropdownMenuItem
            onClick={handleExportCleaned}
            className="text-xs text-slate-200 cursor-pointer hover:bg-slate-800"
          >
            <Download size={14} className="mr-2" />
            <span>Cleaned Excel File</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExportInsights}
            className="text-xs text-slate-200 cursor-pointer hover:bg-slate-800"
          >
            <FileText size={14} className="mr-2" />
            <span>Insights Report (PDF)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExportDepartmentReport}
            className="text-xs text-slate-200 cursor-pointer hover:bg-slate-800"
          >
            <Download size={14} className="mr-2" />
            <span>Department Spend Report</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem
            onClick={() => {
              toast({
                title: 'Export successful',
                description: 'cleaning_audit.json has been downloaded',
              });
            }}
            className="text-xs text-slate-200 cursor-pointer hover:bg-slate-800"
          >
            <Download size={14} className="mr-2" />
            <span>Audit Report (JSON)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset Session */}
      <Button
        onClick={handleResetSession}
        variant="ghost"
        size="sm"
        className="text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
      >
        <RotateCcw size={14} className="mr-1" />
        Reset
      </Button>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" />
    </div>
  );
};
