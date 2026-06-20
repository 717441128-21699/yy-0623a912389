import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import type { RiskItem } from '../types';
import { RiskTypeBadge, EngineeringBadge } from './StatusBadge';
import { formatDate } from '../utils/dateUtils';

interface RiskItemCardProps {
  item: RiskItem;
  index: number;
  planStartDate: string;
}

export default function RiskItemCard({ item, index, planStartDate }: RiskItemCardProps) {
  const navigate = useNavigate();
  const isUrgent = item.daysRemaining <= 3;
  const isOverdue = item.daysRemaining < 0;

  return (
    <div
      onClick={() => navigate(`/plans/${item.planId}`)}
      className={`group bg-white rounded-lg border p-4 shadow-card hover:shadow-hover transition-all duration-200 cursor-pointer hover:-translate-y-0.5 opacity-0 animate-fade-in-up ${
        isUrgent || isOverdue ? 'border-l-4 border-l-risk-red' : 'border-slate-200'
      }`}
      style={{ animationDelay: `${index * 60 + 200}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <RiskTypeBadge type={item.type} severity={item.severity} />
            <EngineeringBadge type={item.engineeringType} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-brand-700 transition-colors">
            {item.planName}
          </h3>
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {item.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              计划开工：{formatDate(planStartDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={`text-lg font-bold ${
              isOverdue
                ? 'text-risk-red'
                : isUrgent
                ? 'text-risk-orange'
                : 'text-slate-700'
            }`}
          >
            {isOverdue
              ? `超期 ${Math.abs(item.daysRemaining)} 天`
              : item.daysRemaining === 0
              ? '今日到期'
              : `剩 ${item.daysRemaining} 天`}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}
