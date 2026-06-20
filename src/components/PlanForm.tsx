import { useRef, useState } from 'react';
import { Upload, X, FileText, FileSpreadsheet, File } from 'lucide-react';
import type { Attachment, EngineeringType } from '../types';
import { formatFileSize } from '../utils/dateUtils';

export interface PlanFormData {
  projectName: string;
  engineeringType: EngineeringType;
  location: string;
  scaleParams: string;
  planStartDate: string;
  authorName: string;
  needExpertReview: boolean;
  attachments: { fileName: string; fileType: string; fileSize: number }[];
  resubmitNote?: string;
  removedAttachmentIds?: string[];
  addedAttachmentNames?: string[];
}

export interface PlanFormErrors {
  projectName?: string;
  location?: string;
  scaleParams?: string;
  planStartDate?: string;
}

const engineeringTypes: EngineeringType[] = ['深基坑', '高支模', '起重吊装', '脚手架', '拆除爆破', '其他'];

function FileTypeIcon({ fileType }: { fileType: string }) {
  if (fileType === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType === 'xlsx' || fileType === 'xls') return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  return <File className="w-4 h-4 text-slate-500" />;
}

interface PlanFormProps {
  initialData?: Partial<PlanFormData>;
  existingAttachments?: Attachment[];
  onSubmit: (data: PlanFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  title?: string;
  readOnlyAuthor?: boolean;
  showResubmitNote?: boolean;
}

export default function PlanForm({
  initialData,
  existingAttachments = [],
  onSubmit,
  onCancel,
  submitLabel = '保存',
  title = '新建危大工程方案',
  readOnlyAuthor = false,
  showResubmitNote = false,
}: PlanFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PlanFormData>({
    projectName: initialData?.projectName ?? '',
    engineeringType: initialData?.engineeringType ?? '深基坑',
    location: initialData?.location ?? '',
    scaleParams: initialData?.scaleParams ?? '',
    planStartDate: initialData?.planStartDate ?? '',
    authorName: initialData?.authorName ?? '',
    needExpertReview: initialData?.needExpertReview ?? true,
    attachments: initialData?.attachments ?? [],
    resubmitNote: initialData?.resubmitNote ?? '',
    removedAttachmentIds: [],
    addedAttachmentNames: [],
  });
  const [existing, setExisting] = useState<Attachment[]>(existingAttachments);
  const [errors, setErrors] = useState<PlanFormErrors>({});

  const validate = () => {
    const e: PlanFormErrors = {};
    if (!form.projectName.trim()) e.projectName = '请输入工程名称';
    if (!form.location.trim()) e.location = '请输入工程部位';
    if (!form.scaleParams.trim()) e.scaleParams = '请输入规模参数';
    if (!form.planStartDate) e.planStartDate = '请选择计划开工日期';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newOnes = files.map((f) => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'file';
      return { fileName: f.name, fileType: ext, fileSize: f.size };
    });
    setForm({
      ...form,
      attachments: [...form.attachments, ...newOnes],
      addedAttachmentNames: [...(form.addedAttachmentNames || []), ...newOnes.map((n) => n.fileName)],
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePending = (idx: number) => {
    const removed = form.attachments[idx];
    setForm({
      ...form,
      attachments: form.attachments.filter((_, i) => i !== idx),
      addedAttachmentNames: (form.addedAttachmentNames || []).filter((n) => n !== removed.fileName),
    });
  };

  const removeExisting = (attId: string, attName: string) => {
    setExisting(existing.filter((a) => a.id !== attId));
    setForm({
      ...form,
      removedAttachmentIds: [...(form.removedAttachmentIds || []), attId],
    });
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const finalAttachments = [...existing.map((a) => ({ fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize })), ...form.attachments];
    onSubmit({
      ...form,
      attachments: finalAttachments,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">工程类型 <span className="text-risk-red">*</span></label>
              <select
                value={form.engineeringType}
                onChange={(e) => setForm({ ...form, engineeringType: e.target.value as EngineeringType })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
              >
                {engineeringTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">编制人</label>
              <input
                type="text"
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                readOnly={readOnlyAuthor}
                className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 ${readOnlyAuthor ? 'bg-slate-50 text-slate-500' : ''}`}
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

            {showResubmitNote && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  修改说明 <span className="text-risk-orange">*</span>
                </label>
                <textarea
                  value={form.resubmitNote || ''}
                  onChange={(e) => setForm({ ...form, resubmitNote: e.target.value })}
                  rows={2}
                  placeholder="请简要说明针对退回意见做了哪些修改..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">方案附件</label>
              <div
                onClick={handleFilePick}
                className="border-2 border-dashed border-slate-300 rounded-md p-5 text-center text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50/30 transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                点击选择 PDF / Excel 文档上传
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xls,.xlsx"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {(existing.length > 0 || form.attachments.length > 0) && (
                <div className="mt-3 space-y-2">
                  {existing.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-2.5 rounded-md border border-slate-200 bg-slate-50">
                      <FileTypeIcon fileType={att.fileType} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 truncate">{att.fileName}</div>
                        <div className="text-xs text-slate-500">{formatFileSize(att.fileSize)}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeExisting(att.id, att.fileName); }}
                        className="p-1 text-slate-400 hover:text-risk-red hover:bg-red-50 rounded transition-colors"
                        title="移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {form.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-md border border-brand-200 bg-brand-50">
                      <FileTypeIcon fileType={att.fileType} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 truncate">{att.fileName}</div>
                        <div className="text-xs text-slate-500">{formatFileSize(att.fileSize)} · 新上传</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removePending(idx); }}
                        className="p-1 text-slate-400 hover:text-risk-red hover:bg-red-50 rounded transition-colors"
                        title="移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
