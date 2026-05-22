import {
  useGetSpendByDepartment,
  useGetSpendByCostCenter,
  getGetSpendByDepartmentQueryKey,
  getGetSpendByCostCenterQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatPercent } from "@/lib/format";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981", "#6366f1", "#f97316", "#06b6d4", "#a855f7", "#84cc16"];

export default function DepartmentsTab() {
  const { data: depts, isLoading: deptsLoading } = useGetSpendByDepartment({
    query: { queryKey: getGetSpendByDepartmentQueryKey() },
  });
  const { data: costCenters, isLoading: ccLoading } = useGetSpendByCostCenter({
    query: { queryKey: getGetSpendByCostCenterQueryKey() },
  });

  if (deptsLoading || ccLoading || !depts || !costCenters) {
    return (
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
      </div>
    );
  }

  const totalSpend = depts.reduce((s, d) => s + d.spend_inr, 0);
  const sortedDepts = [...depts].sort((a, b) => b.spend_inr - a.spend_inr);
  const top10Depts = sortedDepts.slice(0, 10);
  const top8DeptsPie = sortedDepts.slice(0, 8);
  const otherSpend = totalSpend - top8DeptsPie.reduce((s, d) => s + d.spend_inr, 0);

  const pieData = [
    ...top8DeptsPie.map((d, i) => ({ name: d.department, value: d.spend_inr, color: COLORS[i] })),
    { name: "Others", value: otherSpend, color: "#6b7280" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department donut */}
        <CardShell>
          <SectionTitle>Spend by Department</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [formatINR(v), ""]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardShell>

        {/* Cost center bar */}
        <CardShell>
          <SectionTitle>Spend by Cost Center (Top 15)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costCenters.slice(0, 15).map((c) => ({ ...c, spend_cr: parseFloat((c.spend_inr / 10000000).toFixed(2)) }))} layout="vertical" margin={{ top: 0, right: 8, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
              <YAxis type="category" dataKey="cost_center" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                formatter={(v: number) => [`₹${v}Cr`, "Spend"]}
              />
              <Bar dataKey="spend_cr" fill="#14b8a6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardShell>
      </div>

      {/* Department table */}
      <CardShell>
        <SectionTitle>Department Spend Table</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Department</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Spend (INR)</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Transactions</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">% of Total</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Personal</th>
                <th className="py-2 px-3 text-muted-foreground font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {sortedDepts.map((dept, i) => {
                const pct = (dept.spend_inr / totalSpend) * 100;
                return (
                  <tr key={dept.department} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-dept-${i}`}>
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{dept.department}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{formatINR(dept.spend_inr)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{dept.transaction_count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatPercent(pct)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-red-500">{(dept.personal_count ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-3 w-24">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, pct * 5)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  );
}
