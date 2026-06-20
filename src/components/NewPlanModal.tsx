import { useState } from 'react';
import { X } from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';
import type { EngineeringType } from '../types';

interface NewPlanModalProps {
  open: boolean;
  onClose: () => void;
}

const engineeringTypes: EngineeringType[] = ['深基坑', '高支模', '起重吊装', '脚手架', '拆除爆破', '其他'];

export default function NewPlanModal({ open, onClose }: NewPlanModalProps) {
  const { addPlan, user } = usePlanStore();
  const [form, setForm] = useState({
    projectName: '',
    engineeringType: '深基坑' as EngineeringType,
    location: '',
    scaleParams: '',
    planStartDate: '',
    authorName: user.name,
    needExpertReview: true,
    attachments: [] as File[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.projectName.trim()) e.projectName = '请输入工程名称';
    if (!form.location.trim()) e.location = '请输入工程部位';
    if (!form.scaleParams.trim()) e.scaleParams = '请输入规模参数';
    if (!form.planStartDate) e.planStartDate = '请选择计划开工日期';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    addPlan({
      projectName: form.projectName,
      engineeringType: form.engineeringType,
      location: form.location,
      scaleParams: form.scaleParams,
      planStartDate: form.planStartDate,
      authorName: form.authorName,
      needExpertReview: form.needExpertReview,
      attachments: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">新建危大工程方案</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                工程名称 <span className="text-risk-red">*</span>
              </label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                placeholder="例如：滨江壹号院3号楼深基坑工程"
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition ${
                  errors.projectName ? 'border-risk-red' : 'border-slate-300'
                }`}
              />
              {errors.projectName && <div className="mt-1 text-xs text-risk-red">{errors.projectName}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                工程类型 <span className="text-risk-red">*</span>
              </label>
              <select
                value={form.engineeringType}
                onChange={(e) => setForm({ ...form, engineeringType: e.target.value as EngineeringType })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
              >
                {engineeringTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                编制人
              </label>
              <input
                type="text"
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                工程部位 <span className="text-risk-red">*</span>
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="例如：3号楼地下车库区域"
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition ${
                  errors.location ? 'border-risk-red' : 'border-slate-300'
                }`}
              />
              {errors.location && <div className="mt-1 text-xs text-risk-red">{errors.location}</div>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                规模参数 <span className="text-risk-red">*</span>
              </label>
              <input
                type="text"
                value={form.scaleParams}
                onChange={(e) => setForm({ ...form, scaleParams: e.target.value })}
                placeholder="例如：开挖深度8.5m，面积约2400㎡"
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition ${
                  errors.scaleParams ? 'border-risk-red' : 'border-slate-300'
                }`}
              />
              {errors.scaleParams && <div className="mt-1 text-xs text-risk-red">{errors.scaleParams}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                计划施工日期 <span className="text-risk-red">*</span>
              </label>
              <input
                type="date"
                value={form.planStartDate}
                onChange={(e) => setForm({ ...form, planStartDate: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition ${
                  errors.planStartDate ? 'border-risk-red' : 'border-slate-300'
                }`}
              />
              {errors.planStartDate && <div className="mt-1 text-xs text-risk-red">{errors.planStartDate}</div>}
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.needExpertReview}
                  onChange={(e) => setForm({ ...form, needExpertReview: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">需组织专家论证</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                方案附件
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50/30 transition-colors cursor-pointer">
                点击上传或拖拽 PDF / Excel 文档到此处（演示功能）
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
