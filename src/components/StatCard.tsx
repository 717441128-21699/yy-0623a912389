import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'orange' | 'red' | 'green' | 'slate';
  delay?: number;
}

const colorMap = {
  blue: {
    bg: 'bg-brand-50',
    icon: 'bg-brand-100 text-brand-600',
    text: 'text-brand-700',
    border: 'border-brand-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    text: 'text-orange-700',
    border: 'border-orange-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-700',
    border: 'border-red-100',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'bg-slate-100 text-slate-600',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export default function StatCard({ label, value, icon: Icon, color, delay = 0 }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`bg-white rounded-lg border ${c.border} p-5 shadow-card hover:shadow-hover transition-all duration-300 hover:-translate-y-0.5 opacity-0 animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className={`mt-2 text-3xl font-bold ${c.text}`}>{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-lg ${c.icon} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
