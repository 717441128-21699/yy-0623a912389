import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Filter, ArrowRight, Shield, FileCheck, AlertTriangle, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';
import type { EngineeringType, PlanStatus } from '../types';
import { StatusBadge, EngineeringBadge } from '../components/StatusBadge';

type FilterKey = 'type' | 'node' | 'rejected' | 'expert' | 'disclosure' | 'status';

const statusLabels: Record<PlanStatus, string> = {
  draft: '待编制',
  pending_review: '待审核',
  pending_argument: '待论证',
  disclosed: '已交底',
};

export default function Statistics() {
  const navigate = useNavigate();
  const plans = usePlanStore((s) => s.plans);
  const getStatistics = usePlanStore((s) => s.getStatistics);
  const stats = getStatistics();

  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');

  const getFilteredPlans = () => {
    if (!activeFilter) return [];
    switch (activeFilter) {
      case 'type':
        return plans.filter((p) => p.engineeringType === filterValue);
      case 'node': {
        if (filterValue === '已归档') return plans.filter((p) => p.status === 'disclosed');
        return plans.filter((p) => p.approvalNodes.find((n) => n.action === 'pending')?.role === filterValue);
      }
      case 'rejected':
        return filterValue === 'yes' ? plans.filter((p) => p.rejectionHistory.length > 0) : plans.filter((p) => p.rejectionHistory.length === 0);
      case 'expert':
        return plans.filter((p) => p.needExpertReview && !p.expertReviewDone);
      case 'disclosure':
        return plans.filter((p) => p.status !== 'draft' && !p.disclosureUploaded);
      case 'status':
        return plans.filter((p) => p.status === filterValue);
      default:
        return [];
    }
  };

  const filteredPlans = getFilteredPlans();

  const handleFilterClick = (key: FilterKey, value: string) => {
    if (activeFilter === key && filterValue === value) {
      setActiveFilter(null);
      setFilterValue('');
    } else {
      setActiveFilter(key);
      setFilterValue(value);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">审批闭环统计</h2>
        <p className="mt-1 text-sm text-slate-500">按维度筛选统计，点击统计项查看对应方案</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatBlock
          icon={<BarChart3 className="w-5 h-5" />}
          label="方案总数"
          value={stats.total}
          color="blue"
          active={activeFilter === 'status'}
          onClick={() => handleFilterClick('status', '')}
        />
        <StatBlock
          icon={<RotateCcw className="w-5 h-5" />}
          label="曾被退回"
          value={stats.everRejected}
          color="red"
          active={activeFilter === 'rejected' && filterValue === 'yes'}
          onClick={() => handleFilterClick('rejected', 'yes')}
        />
        <StatBlock
          icon={<Shield className="w-5 h-5" />}
          label="缺论证报告"
          value={stats.missingExpertReview}
          color="orange"
          active={activeFilter === 'expert'}
          onClick={() => handleFilterClick('expert', '')}
        />
        <StatBlock
          icon={<FileCheck className="w-5 h-5" />}
          label="缺交底记录"
          value={stats.missingDisclosure}
          color="yellow"
          active={activeFilter === 'disclosure'}
          onClick={() => handleFilterClick('disclosure', '')}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-600" />
            按工程类型
          </h3>
          <div className="space-y-2">
            {stats.byType.map((item) => (
              <button
                key={item.type}
                onClick={() => handleFilterClick('type', item.type)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                  activeFilter === 'type' && filterValue === item.type
                    ? 'bg-brand-50 border border-brand-200 text-brand-700'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <EngineeringBadge type={item.type} />
                  <span>{item.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">{item.count}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            按当前节点
          </h3>
          <div className="space-y-2">
            {stats.byNode.map((item) => (
              <button
                key={item.node}
                onClick={() => handleFilterClick('node', item.node)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                  activeFilter === 'node' && filterValue === item.node
                    ? 'bg-brand-50 border border-brand-200 text-brand-700'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{item.node}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">{item.count}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-risk-red" />
            退回情况
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleFilterClick('rejected', 'yes')}
              className={`p-4 rounded-md border text-center transition-colors ${
                activeFilter === 'rejected' && filterValue === 'yes'
                  ? 'bg-red-50 border-red-200'
                  : 'border-slate-200 hover:border-red-200 hover:bg-red-50/30'
              }`}
            >
              <div className="text-2xl font-bold text-risk-red">{stats.everRejected}</div>
              <div className="text-xs text-slate-600 mt-1">曾被退回</div>
            </button>
            <button
              onClick={() => handleFilterClick('rejected', 'no')}
              className={`p-4 rounded-md border text-center transition-colors ${
                activeFilter === 'rejected' && filterValue === 'no'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
              }`}
            >
              <div className="text-2xl font-bold text-risk-green">{stats.neverRejected}</div>
              <div className="text-xs text-slate-600 mt-1">一次通过</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
            按状态分布
          </h3>
          <div className="space-y-2">
            {stats.byStatus.map((item) => (
              <button
                key={item.status}
                onClick={() => handleFilterClick('status', item.status)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                  activeFilter === 'status' && filterValue === item.status
                    ? 'bg-brand-50 border border-brand-200 text-brand-700'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium">{item.count}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeFilter && filteredPlans.length > 0 && (
        <div className="bg-white rounded-lg border border-brand-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-600" />
              筛选结果 · {filteredPlans.length} 个方案
            </h3>
            <button
              onClick={() => { setActiveFilter(null); setFilterValue(''); }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              清除筛选
            </button>
          </div>
          <div className="space-y-2">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => navigate(`/plans/${plan.id}`)}
                className="flex items-center justify-between px-4 py-3 rounded-md border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <EngineeringBadge type={plan.engineeringType} />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{plan.projectName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{plan.location} · {plan.authorName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {plan.rejectionHistory.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-risk-red font-medium">
                      退回{plan.rejectionHistory.length}次
                    </span>
                  )}
                  <StatusBadge status={plan.status} />
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFilter && filteredPlans.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm text-slate-500">没有匹配的方案</div>
          <button
            onClick={() => { setActiveFilter(null); setFilterValue(''); }}
            className="mt-2 text-xs text-brand-600 hover:text-brand-700"
          >
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'red' | 'orange' | 'yellow';
  active: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    blue: 'bg-brand-50 border-brand-200 text-brand-700',
    red: 'bg-red-50 border-red-200 text-risk-red',
    orange: 'bg-orange-50 border-orange-200 text-risk-orange',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };
  const activeMap = {
    blue: 'ring-2 ring-brand-400',
    red: 'ring-2 ring-red-400',
    orange: 'ring-2 ring-orange-400',
    yellow: 'ring-2 ring-yellow-400',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border shadow-card transition-all text-left ${colorMap[color]} ${active ? activeMap[color] : ''}`}
    >
      <div className="flex items-center gap-2 mb-2 opacity-70">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </button>
  );
}
