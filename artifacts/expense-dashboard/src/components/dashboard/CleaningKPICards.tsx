import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Users, Package, Zap } from 'lucide-react';
import { formatINR } from '@/lib/format';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'cyan';
  animated?: boolean;
}

const colorClasses = {
  green: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-900 dark:text-emerald-100',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-800/50',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-900 dark:text-blue-100',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-800/50',
    icon: 'text-purple-600 dark:text-purple-400',
    text: 'text-purple-900 dark:text-purple-100',
  },
  orange: {
    bg: 'bg-orange-500/10 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-800/50',
    icon: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-900 dark:text-orange-100',
  },
  red: {
    bg: 'bg-red-500/10 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-800/50',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-800/50',
    icon: 'text-cyan-600 dark:text-cyan-400',
    text: 'text-cyan-900 dark:text-cyan-100',
  },
};

const KPICard = ({ title, value, subtitle, trend, icon, color, animated = true }: KPICardProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animated || typeof value !== 'number') {
      setDisplayValue(typeof value === 'number' ? value : 0);
      return;
    }

    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = stepValue * step;
      if (step >= steps) {
        current = value;
        clearInterval(interval);
      }
      setDisplayValue(Math.floor(current));
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value, animated]);

  const colors = colorClasses[color];
  const displayText = typeof value === 'string' ? value : (
    title.includes('Score') ? displayValue : 
    title.includes('Spend') ? formatINR(displayValue) :
    title.includes('Average') ? formatINR(displayValue) :
    displayValue.toLocaleString()
  );

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-6 bg-card text-card-foreground
        transition-all duration-300 hover:shadow-md hover:scale-[1.02]
        ${colors.border} border-t-4 border-t-${color}-500
      `}
      style={{ borderTopColor: `var(--${color}-500)` }}
    >
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <h3 className={`text-3xl font-bold tracking-tight ${colors.text}`}>
              {displayText}
            </h3>
          </div>
          <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
            <div className={`${colors.icon} text-xl`}>
              {icon}
            </div>
          </div>
        </div>

        {subtitle && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
            {trend && (
              <div className={trend === 'up' ? 'text-emerald-600 dark:text-emerald-500' : trend === 'down' ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground'}>
                {trend === 'up' ? <TrendingUp size={14} /> : trend === 'down' ? <TrendingDown size={14} /> : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface CleaningKPIGridProps {
  totalRows: number;
  cleanedRows: number;
  removedRows: number;
  duplicateRows: number;
  invalidRows: number;
  missingReceipts: number;
  flaggedPersonal: number;
  uniqueVendors: number;
  uniqueDepartments: number;
  totalSpend: number;
  avgTransaction: number;
  riskScore: number;
  cleaningAccuracy: number;
  processingTime: number;
}

export const CleaningKPIGrid = ({
  totalRows,
  cleanedRows,
  removedRows,
  duplicateRows,
  invalidRows,
  missingReceipts,
  flaggedPersonal,
  uniqueVendors,
  uniqueDepartments,
  totalSpend,
  avgTransaction,
  riskScore,
  cleaningAccuracy,
  processingTime,
}: CleaningKPIGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {/* Row 1: Main metrics */}
      <KPICard
        title="Total Rows"
        value={totalRows}
        subtitle="Source dataset"
        icon={<CheckCircle2 size={20} />}
        color="blue"
        animated
      />
      <KPICard
        title="Cleaned Rows"
        value={cleanedRows}
        subtitle="Valid records"
        trend="up"
        icon={<CheckCircle2 size={20} />}
        color="green"
        animated
      />
      <KPICard
        title="Duplicate Rows"
        value={duplicateRows}
        subtitle="Removed"
        trend="down"
        icon={<AlertCircle size={20} />}
        color="orange"
        animated
      />
      <KPICard
        title="Invalid Rows"
        value={invalidRows}
        subtitle="Corrupted/malformed"
        trend="down"
        icon={<AlertCircle size={20} />}
        color="red"
        animated
      />

      {/* Row 2: Quality metrics */}
      <KPICard
        title="Missing Receipts"
        value={missingReceipts}
        subtitle="Transactions"
        icon={<Package size={20} />}
        color="cyan"
        animated
      />
      <KPICard
        title="Personal Expenses"
        value={flaggedPersonal}
        subtitle="Flagged"
        icon={<AlertCircle size={20} />}
        color="orange"
        animated
      />
      <KPICard
        title="Vendors Normalized"
        value={uniqueVendors}
        subtitle="Unique entities"
        icon={<Zap size={20} />}
        color="purple"
        animated
      />
      <KPICard
        title="Departments"
        value={uniqueDepartments}
        subtitle="Identified"
        icon={<Users size={20} />}
        color="blue"
        animated
      />

      {/* Row 3: Financial & Score */}
      <KPICard
        title="Total Spend"
        value={formatINR(totalSpend)}
        subtitle="All transactions"
        icon={<TrendingUp size={20} />}
        color="green"
        animated={false}
      />
      <KPICard
        title="Avg Transaction"
        value={formatINR(avgTransaction)}
        subtitle="Average value"
        icon={<TrendingUp size={20} />}
        color="blue"
        animated={false}
      />
      <KPICard
        title="Risk Score"
        value={`${Math.round(riskScore)} / 100`}
        subtitle="Anomaly level"
        icon={<AlertCircle size={20} />}
        color={riskScore > 75 ? 'red' : riskScore > 50 ? 'orange' : 'green'}
        animated={false}
      />
      <KPICard
        title="Data Accuracy"
        value={`${cleaningAccuracy.toFixed(1)}%`}
        subtitle="Cleaning score"
        trend="up"
        icon={<CheckCircle2 size={20} />}
        color="green"
        animated={false}
      />
    </div>
  );
};
