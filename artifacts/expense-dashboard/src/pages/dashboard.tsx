import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useGetExpenseSummary, useGetFraudAnomalies, getGetExpenseSummaryQueryKey, getGetFraudAnomaliesQueryKey } from "@workspace/api-client-react";
import { useSessionStore } from "@/store/useSessionStore";
import { formatINR } from "@/lib/format";
import type { NavId } from "@/components/layout/Sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import type { PipelineResult } from "@/components/dashboard/UploadDialog";

import OverviewTab from "@/components/dashboard/OverviewTab";
import PersonalExpensesTab from "@/components/dashboard/PersonalExpensesTab";
import VendorAnalysisTab from "@/components/dashboard/VendorAnalysisTab";
import DepartmentsTab from "@/components/dashboard/DepartmentsTab";
import CurrencyTab from "@/components/dashboard/CurrencyTab";
import DataQualityTab from "@/components/dashboard/DataQualityTab";
import FraudTab from "@/components/dashboard/FraudTab";
import ExecutiveSummaryTab from "@/components/dashboard/ExecutiveSummaryTab";
import AlertsTab from "@/components/dashboard/AlertsTab";
import TransactionsTab from "@/components/dashboard/TransactionsTab";
import NotFound from "./not-found";

import { useLocation } from "wouter";

const PAGE_LABELS: Record<NavId, string> = {
  overview: "Overview",
  transactions: "Transaction Explorer",
  personal: "Personal Expenses",
  vendors: "Vendor Analysis",
  departments: "Departments",
  currency: "Currency",
  quality: "Data Quality",
  fraud: "Fraud & Anomalies",
  alerts: "Smart Alerts",
  executive: "Executive Summary",
  upload: "Upload",
  summary: "Cleaning Summary"
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [refreshing, setRefreshing] = useState(false);
  // Get session state
  const isFileUploaded = useSessionStore(state => state.isFileUploaded);
  const processingResult = useSessionStore(state => state.processingResult);

  // Redirect to upload if no file uploaded
  if (!isFileUploaded || !processingResult || !processingResult.success) {
    return <NotFound />;
  }

  const { data: summary } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });
  const { data: fraud } = useGetFraudAnomalies({ query: { queryKey: getGetFraudAnomaliesQueryKey() } });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
    toast({ title: "Data refreshed", description: "All metrics have been updated." });
  }, [queryClient, toast]);

  const handleNavigate = useCallback((id: NavId) => {
    if (id === "upload") {
      setLocation("/upload");
    } else if (id === "summary") {
      setLocation("/summary");
    } else {
      setActiveNav(id);
    }
  }, [setLocation]);

  const alertCount = 8; // static based on what AlertsTab generates

  const description = (
    <>
      {activeNav === "overview" && `${processingResult.clean_rows.toLocaleString()} transactions · ${formatINR(processingResult.clean_summary.total_spend_inr)} total spend`}
      {activeNav === "transactions" && "Search, filter, and export the full transaction ledger"}
      {activeNav === "personal" && "Personal expense policy compliance analysis"}
      {activeNav === "vendors" && "Vendor spend concentration and risk insights"}
      {activeNav === "departments" && "Department and cost center spend breakdown"}
      {activeNav === "currency" && "Multi-currency exposure and forex analysis"}
      {activeNav === "quality" && "Data quality scoring and ERP migration readiness"}
      {activeNav === "fraud" && "Anomaly detection and high-value transaction review"}
      {activeNav === "alerts" && "Live risk alerts requiring action — prioritised by severity"}
      {activeNav === "executive" && "C-suite governance summary and action items"}
    </>
  );

  return (
    <AppLayout
      activeNav={activeNav}
      onNavigate={handleNavigate}
      title={PAGE_LABELS[activeNav]}
      description={description}
      alertCount={alertCount}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      <div className={activeNav === "overview" ? "block" : "hidden"}><OverviewTab uploadResult={processingResult} /></div>
      <div className={activeNav === "transactions" ? "block" : "hidden"}><TransactionsTab /></div>
      <div className={activeNav === "personal" ? "block" : "hidden"}><PersonalExpensesTab /></div>
      <div className={activeNav === "vendors" ? "block" : "hidden"}><VendorAnalysisTab /></div>
      <div className={activeNav === "departments" ? "block" : "hidden"}><DepartmentsTab /></div>
      <div className={activeNav === "currency" ? "block" : "hidden"}><CurrencyTab /></div>
      <div className={activeNav === "quality" ? "block" : "hidden"}><DataQualityTab /></div>
      <div className={activeNav === "fraud" ? "block" : "hidden"}><FraudTab /></div>
      <div className={activeNav === "alerts" ? "block" : "hidden"}><AlertsTab /></div>
      <div className={activeNav === "executive" ? "block" : "hidden"}><ExecutiveSummaryTab /></div>
    </AppLayout>
  );
}
