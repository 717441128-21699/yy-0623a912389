import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileText, User, Building2, Bell } from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';

export default function Layout() {
  const { user, getStats } = usePlanStore();
  const stats = getStats();
  const navigate = useNavigate();
  const riskCount = stats.overdue + stats.expertIncomplete + stats.disclosureMissing;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 px-5 flex items-center gap-2 border-b border-slate-200">
          <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">危大工程审批</div>
            <div className="text-xs text-slate-500">专项方案管理平台</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            提醒看板
            {riskCount > 0 && (
              <span className="ml-auto text-xs bg-risk-red text-white px-1.5 py-0.5 rounded-full">
                {riskCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/plans"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <ClipboardList className="w-4 h-4" />
            方案台账
          </NavLink>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 truncate">{user.roleName}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400 px-2 pb-1">{user.organization}</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              滨江壹号院项目 · 危大工程专项方案管理
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {riskCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-risk-red rounded-full"></span>
              )}
            </button>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
