import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, AlertTriangle, FileCheck, Users, Plus, ChevronRight } from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';
import StatCard from '../components/StatCard';
import RiskItemCard from '../components/RiskItemCard';
import NewPlanModal from '../components/NewPlanModal';
import { useState } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getStats, getRiskItems, plans } = usePlanStore();
  const stats = getStats();
  const riskItems = getRiskItems();
  const [showNewPlan, setShowNewPlan] = useState(false);

  const expertRisks = riskItems.filter((r) => r.type === 'expert_incomplete');
  const overdueRisks = riskItems.filter((r) => r.type === 'approval_overdue');
  const disclosureRisks = riskItems.filter((r) => r.type === 'disclosure_missing');

  const riskGroups = [
    { key: 'expert', title: '专家论证未完成', items: expertRisks, color: 'risk-red', icon: AlertTriangle },
    { key: 'overdue', title: '审批超期/临近开工', items: overdueRisks, color: 'risk-orange', icon: Clock },
    { key: 'disclosure', title: '交底记录未上传', items: disclosureRisks, color: 'risk-yellow', icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">提醒看板</h2>
          <p className="mt-1 text-sm text-slate-500">按开工日期倒排，实时追踪危大工程方案进度</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/plans')}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4" />
            方案台账
          </button>
          <button
            onClick={() => setShowNewPlan(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新建方案
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard label="方案总数" value={stats.total} icon={ClipboardList} color="blue" delay={0} />
        <StatCard label="审批中" value={stats.pendingReview} icon={Users} color="slate" delay={80} />
        <StatCard label="审批超期" value={stats.overdue} icon={Clock} color="orange" delay={160} />
        <StatCard label="论证未完成" value={stats.expertIncomplete} icon={AlertTriangle} color="red" delay={240} />
        <StatCard label="交底未上传" value={stats.disclosureMissing} icon={FileCheck} color="green" delay={320} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {riskGroups.map((group, gIdx) => {
          const Icon = group.icon;
          const plansWithDate = group.items.map((item) => {
            const plan = plans.find((p) => p.id === item.planId);
            return { item, startDate: plan?.planStartDate || '' };
          });
          return (
            <div
              key={group.key}
              className="bg-white rounded-lg border border-slate-200 shadow-card opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${gIdx * 100 + 300}ms` }}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      group.color === 'risk-red'
                        ? 'bg-red-50 text-risk-red'
                        : group.color === 'risk-orange'
                        ? 'bg-orange-50 text-risk-orange'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{group.title}</h3>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      group.color === 'risk-red'
                        ? 'bg-red-50 text-risk-red'
                        : group.color === 'risk-orange'
                        ? 'bg-orange-50 text-risk-orange'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {group.items.length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-2 max-h-[440px] overflow-auto">
                {plansWithDate.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    暂无此类风险事项
                  </div>
                ) : (
                  plansWithDate.map(({ item, startDate }, idx) => (
                    <RiskItemCard
                      key={item.id}
                      item={item}
                      index={idx}
                      planStartDate={startDate}
                    />
                  ))
                )}
              </div>

              {group.items.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100">
                  <button
                    onClick={() => navigate('/plans')}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                  >
                    查看全部
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NewPlanModal open={showNewPlan} onClose={() => setShowNewPlan(false)} />
    </div>
  );
}
