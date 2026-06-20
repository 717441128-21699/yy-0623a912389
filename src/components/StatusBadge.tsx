import type { PlanStatus, RiskType } from '../types';

interface StatusBadgeProps {
  status: PlanStatus;
}

const statusConfig: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: '待编制', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending_review: { label: '待审核', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_argument: { label: '待论证', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  disclosed: { label: '已交底', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

interface RiskTypeBadgeProps {
  type: RiskType;
  severity?: 'high' | 'medium' | 'low';
}

const riskConfig: Record<RiskType, { label: string; className: string }> = {
  expert_incomplete: { label: '专家论证未完成', className: 'bg-red-50 text-risk-red border-red-200' },
  approval_overdue: { label: '审批超期风险', className: 'bg-orange-50 text-risk-orange border-orange-200' },
  disclosure_missing: { label: '交底未上传', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

export function RiskTypeBadge({ type, severity }: RiskTypeBadgeProps) {
  const cfg = riskConfig[type];
  const severityDot =
    severity === 'high'
      ? 'bg-risk-red'
      : severity === 'medium'
      ? 'bg-risk-orange'
      : 'bg-risk-yellow';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${severityDot}`}></span>
      {cfg.label}
    </span>
  );
}

interface EngineeringBadgeProps {
  type: string;
}

const engColorMap: Record<string, string> = {
  '深基坑': 'bg-blue-50 text-blue-700 border-blue-200',
  '高支模': 'bg-purple-50 text-purple-700 border-purple-200',
  '起重吊装': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '脚手架': 'bg-teal-50 text-teal-700 border-teal-200',
  '拆除爆破': 'bg-rose-50 text-rose-700 border-rose-200',
  '其他': 'bg-slate-50 text-slate-700 border-slate-200',
};

export function EngineeringBadge({ type }: EngineeringBadgeProps) {
  const className = engColorMap[type] || engColorMap['其他'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${className}`}>
      {type}
    </span>
  );
}
