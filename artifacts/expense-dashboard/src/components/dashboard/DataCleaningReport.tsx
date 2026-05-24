import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ExclusionReason, PipelineStep } from '@/store/useSessionStore';
import { useTheme } from '@/hooks/use-theme';

interface DataCleaningReportProps {
  totalRows: number;
  cleanedRows: number;
  removedRows: number;
  exclusionReasons: ExclusionReason[];
  cleaningAccuracy: number;
  processingTime: number;
  pipelineSteps: PipelineStep[];
}

export const DataCleaningReport = ({
  totalRows,
  cleanedRows,
  removedRows,
  exclusionReasons,
  cleaningAccuracy,
  processingTime,
  pipelineSteps,
}: DataCleaningReportProps) => {
  const { theme } = useTheme();
  const retentionRate = totalRows > 0 ? (cleanedRows / totalRows) * 100 : 0;
  const removalRate = totalRows > 0 ? (removedRows / totalRows) * 100 : 0;

  // Prepare pie chart data
  const pieData = [
    { name: 'Cleaned & Valid', value: cleanedRows, fill: '#10b981' },
    { name: 'Removed', value: removedRows, fill: '#ef4444' },
  ];

  // Prepare exclusion reasons chart
  const exclusionChartData = exclusionReasons
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(r => ({
      reason: r.reason.substring(0, 25) + (r.reason.length > 25 ? '...' : ''),
      count: r.count,
      severity: r.severity,
    }));

  const tooltipBg = theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const tooltipBorder = theme === 'dark' ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)';
  const tooltipText = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(71, 85, 105, 0.2)' : 'rgba(226, 232, 240, 0.8)';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Data Cleaning Report</h2>
              <p className="text-muted-foreground text-sm">Comprehensive analysis of data transformation and quality improvements</p>
            </div>
          </div>
          <div className="sm:text-right flex items-center sm:block gap-3">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{cleaningAccuracy.toFixed(1)}%</div>
            <p className="text-sm font-medium text-muted-foreground">Overall Accuracy</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground mb-2">
              {(totalRows ?? 0).toLocaleString()}
            </div>
            <p className="text-sm font-medium text-muted-foreground">Source rows</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Clean Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              {(cleanedRows ?? 0).toLocaleString()}
            </div>
            <p className="text-sm font-medium text-emerald-700/80 dark:text-emerald-500/80">{retentionRate.toFixed(1)}% retained</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-lg text-red-700 dark:text-red-400">Rows Removed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
              {(removedRows ?? 0).toLocaleString()}
            </div>
            <p className="text-sm font-medium text-red-700/80 dark:text-red-500/80">{removalRate.toFixed(1)}% removed</p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Retention */}
        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
            <CardDescription>Cleaned vs Removed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => value.toLocaleString()}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    color: tooltipText,
                  }}
                  itemStyle={{ color: tooltipText }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Exclusion Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Exclusion Reasons</CardTitle>
            <CardDescription>Why rows were removed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={exclusionChartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="reason"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12, fill: axisColor }}
                />
                <YAxis tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip
                  formatter={(value) => value.toLocaleString()}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    color: tooltipText,
                  }}
                  itemStyle={{ color: tooltipText }}
                  cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Exclusion Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            Exclusion Breakdown
          </CardTitle>
          <CardDescription>Detailed breakdown of removed rows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exclusionReasons.map((reason, idx) => {
            const percentage = totalRows > 0 ? (reason.count / totalRows) * 100 : 0;
            const severityColor = reason.severity === 'CRITICAL' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400';

            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      reason.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                    }`}>
                      {reason.severity}
                    </span>
                    <span className="text-sm font-medium text-foreground">{reason.reason}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${severityColor}`}>
                      {(reason?.count ?? 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground ml-2">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <Progress
                  value={percentage}
                  className="h-1.5"
                  indicatorColor={reason.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pipeline Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-500" />
            Processing Pipeline
          </CardTitle>
          <CardDescription>All transformation steps completed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipelineSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
              <div className={`mt-0.5 rounded-full p-1.5 ${
                step.status === 'ok'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : step.status === 'warn'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
              }`}>
                <CheckCircle2 size={14} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">{step.step}</h4>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{step.detail}</p>
                {step.rows_affected && step.rows_affected > 0 && (
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                    Rows affected: {(step?.rows_affected ?? 0).toLocaleString()}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                step.status === 'ok'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : step.status === 'warn'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
              }`}>
                {step.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-border">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Processing Time</p>
          <p className="text-xl font-bold text-foreground">
            {(processingTime / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Data Accuracy</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {cleaningAccuracy.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Records Retained</p>
          <p className="text-xl font-bold text-foreground">
            {retentionRate.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Records Removed</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {removalRate.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
