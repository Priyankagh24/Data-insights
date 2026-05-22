import { useGetExpenseSummary } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import { TrendingUp, Users, AlertTriangle, Clock, Receipt, BarChart2 } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  variant: "blue" | "red" | "orange" | "green" | "default";
  testId: string;
}

function KpiCard({ label, value, sub, icon, variant, testId }: KpiCardProps) {
  const colors: Record<string, string> = {
    blue: "border-l-blue-500 bg-blue-500/5",
    red: "border-l-red-500 bg-red-500/5",
    orange: "border-l-amber-500 bg-amber-500/5",
    green: "border-l-emerald-500 bg-emerald-500/5",
    default: "border-l-primary bg-primary/5",
  };
  const iconColors: Record<string, string> = {
    blue: "text-blue-500",
    red: "text-red-500",
    orange: "text-amber-500",
    green: "text-emerald-500",
    default: "text-primary",
  };

  return (
    <div
      className={`rounded-lg border border-border border-l-4 ${colors[variant]} p-4 flex flex-col gap-2`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={iconColors[variant]}>{icon}</span>
      </div>
      <div className="font-bold text-2xl text-foreground tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-muted p-4 flex flex-col gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export default function KpiCards() {
  const { data, isLoading } = useGetExpenseSummary();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  const cards: KpiCardProps[] = [
    {
      label: "Total Spend",
      value: formatINR(data.total_spend_inr),
      sub: `${data.total_transactions.toLocaleString()} transactions`,
      icon: <BarChart2 size={16} />,
      variant: "blue",
      testId: "kpi-total-spend",
    },
    {
      label: "Total Transactions",
      value: data.total_transactions.toLocaleString(),
      sub: `${data.unique_vendors} unique vendors`,
      icon: <TrendingUp size={16} />,
      variant: "default",
      testId: "kpi-total-transactions",
    },
    {
      label: "Personal Expenses",
      value: formatINR(data.personal_expense_inr),
      sub: `${data.personal_expense_count.toLocaleString()} flagged (${((data.personal_expense_count / data.total_transactions) * 100).toFixed(1)}%)`,
      icon: <Users size={16} />,
      variant: "red",
      testId: "kpi-personal-expenses",
    },
    {
      label: "Flagged",
      value: data.flagged_count.toLocaleString(),
      sub: `${((data.flagged_count / data.total_transactions) * 100).toFixed(1)}% of transactions`,
      icon: <AlertTriangle size={16} />,
      variant: "red",
      testId: "kpi-flagged",
    },
    {
      label: "Under Review",
      value: data.under_review_count.toLocaleString(),
      sub: "Pending approval",
      icon: <Clock size={16} />,
      variant: "orange",
      testId: "kpi-under-review",
    },
    {
      label: "Avg Transaction",
      value: formatINR(data.avg_transaction_inr),
      sub: `Missing receipts: ${data.missing_receipt_count.toLocaleString()}`,
      icon: <Receipt size={16} />,
      variant: "green",
      testId: "kpi-avg-transaction",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.testId} {...card} />
      ))}
    </div>
  );
}
