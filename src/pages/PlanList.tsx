import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';
import type { PlanStatus } from '../types';
import { StatusBadge, EngineeringBadge } from '../components/StatusBadge';
import NewPlanModal from '../components/NewPlanModal';
import { formatDate } from '../utils/dateUtils';

type TabKey = 'all' | PlanStatus;

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '待编制' },
  { key: 'pending_review', label: '待审核' },
  { key: 'pending_argument', label: '待论证' },
  { key: 'disclosed', label: '已交底' },
];

export default function PlanList() {
  const navigate = useNavigate();
  const { plans, getPlansByStatus, submitForReview, user } = usePlanStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [keyword, setKeyword] = useState('');
  const [showNewPlan, setShowNewPlan] = useState(false);

  const filteredPlans = activeTab === 'all' ? plans : getPlansByStatus(activeTab);
  const searchedPlans = filteredPlans.filter(
    (p) =>
      p.projectName.includes(keyword) ||
      p.location.includes(keyword) ||
      p.engineeringType.includes(keyword)
  );

  const sortedPlans = [...searchedPlans].sort(
    (a, b) => new Date(a.planStartDate).getTime() - new Date(b.planStartDate).getTime()
  );

  const getTabCount = (key: TabKey) =>
    key === 'all' ? plans.length : getPlansByStatus(key).length;

  const handleSubmit = (planId: string) => {
    if (confirm('确认提交审核？提交后将进入审批流程。')) {
      submitForReview(planId);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">方案台账</h2>
          <p className="mt-1 text-sm text-slate-500">管理项目所有危大工程专项方案</p>
        </div>
        <button
          onClick={() => setShowNewPlan(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新建方案
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = getTabCount(tab.key);
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索工程名称、部位..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64 pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  工程信息
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  规模参数
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  计划开工
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  编制人
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">
                    暂无方案数据
                  </td>
                </tr>
              ) : (
                sortedPlans.map((plan, idx) => (
                  <tr
                    key={plan.id}
                    className={`hover:bg-brand-50/30 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-slate-800">{plan.projectName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{plan.location}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <EngineeringBadge type={plan.engineeringType} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[220px] truncate">
                      {plan.scaleParams}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {formatDate(plan.planStartDate)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{plan.authorName}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/plans/${plan.id}`)}
                          className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {plan.status === 'draft' && plan.authorName === user.name && (
                          <>
                            <button
                              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSubmit(plan.id)}
                              className="ml-1 px-2.5 py-1 text-xs font-medium text-white bg-brand-600 rounded hover:bg-brand-700 transition-colors"
                            >
                              提交审核
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewPlanModal open={showNewPlan} onClose={() => setShowNewPlan(false)} />
    </div>
  );
}
