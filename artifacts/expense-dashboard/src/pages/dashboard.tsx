import { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, Upload, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import OverviewTab from "@/components/dashboard/OverviewTab";
import PersonalExpensesTab from "@/components/dashboard/PersonalExpensesTab";
import VendorAnalysisTab from "@/components/dashboard/VendorAnalysisTab";
import DepartmentsTab from "@/components/dashboard/DepartmentsTab";
import CurrencyTab from "@/components/dashboard/CurrencyTab";
import DataQualityTab from "@/components/dashboard/DataQualityTab";
import FraudTab from "@/components/dashboard/FraudTab";
import ExecutiveSummaryTab from "@/components/dashboard/ExecutiveSummaryTab";
import UploadDialog from "@/components/dashboard/UploadDialog";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
    toast({ title: "Data refreshed", description: "All dashboard data has been updated." });
  }, [queryClient, toast]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top navbar */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
            <Activity size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-foreground">ExpenseIQ</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                FY 2024–26 · ERP Migration Audit
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="button-refresh"
            className="gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadOpen(true)}
            data-testid="button-upload"
            className="gap-1.5"
          >
            <Upload size={13} />
            Upload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border bg-card px-6">
            <TabsList className="bg-transparent h-11 p-0 gap-0">
              {[
                { value: "overview", label: "Overview" },
                { value: "personal", label: "Personal Expenses" },
                { value: "vendors", label: "Vendor Analysis" },
                { value: "departments", label: "Departments" },
                { value: "currency", label: "Currency" },
                { value: "quality", label: "Data Quality" },
                { value: "fraud", label: "Fraud & Anomalies" },
                { value: "executive", label: "Executive Summary" },
              ].map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  data-testid={`tab-${value}`}
                  className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-4 text-sm font-medium text-muted-foreground data-[state=active]:font-semibold transition-colors"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="overview" className="m-0">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="personal" className="m-0">
              <PersonalExpensesTab />
            </TabsContent>
            <TabsContent value="vendors" className="m-0">
              <VendorAnalysisTab />
            </TabsContent>
            <TabsContent value="departments" className="m-0">
              <DepartmentsTab />
            </TabsContent>
            <TabsContent value="currency" className="m-0">
              <CurrencyTab />
            </TabsContent>
            <TabsContent value="quality" className="m-0">
              <DataQualityTab />
            </TabsContent>
            <TabsContent value="fraud" className="m-0">
              <FraudTab />
            </TabsContent>
            <TabsContent value="executive" className="m-0">
              <ExecutiveSummaryTab />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
