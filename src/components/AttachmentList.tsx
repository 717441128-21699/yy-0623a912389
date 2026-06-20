import { useRef } from 'react';
import { FileText, Download, FileSpreadsheet, File, Upload, X, Shield, FileCheck, ClipboardCheck } from 'lucide-react';
import type { Attachment, AttachmentCategory } from '../types';
import { formatDateTime, formatFileSize } from '../utils/dateUtils';

interface AttachmentListProps {
  attachments: Attachment[];
  onUpload?: (fileMeta: { fileName: string; fileType: string; fileSize: number; category: AttachmentCategory }) => void;
  onRemove?: (attachmentId: string) => void;
  canEdit?: boolean;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (fileType === 'xlsx' || fileType === 'xls') return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  return <File className="w-5 h-5 text-slate-500" />;
}

const categoryConfig: Record<AttachmentCategory, { label: string; icon: typeof FileCheck; color: string; bgColor: string; borderColor: string }> = {
  plan: { label: '方案附件', icon: FileCheck, color: 'text-brand-600', bgColor: 'bg-brand-50', borderColor: 'border-brand-200' },
  expert_review: { label: '论证报告', icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  disclosure: { label: '交底记录', icon: ClipboardCheck, color: 'text-risk-orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
};

export default function AttachmentList({ attachments, onUpload, onRemove, canEdit = false }: AttachmentListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grouped = {
    plan: attachments.filter((a) => a.category === 'plan'),
    expert_review: attachments.filter((a) => a.category === 'expert_review'),
    disclosure: attachments.filter((a) => a.category === 'disclosure'),
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUpload) return;
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'file';
      onUpload({ fileName: f.name, fileType: ext, fileSize: f.size, category: 'plan' });
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalAttachments = attachments.length;

  return (
    <div>
      {totalAttachments === 0 && !canEdit && (
        <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-md">
          暂无附件
        </div>
      )}

      {(grouped.plan.length > 0 || (canEdit && totalAttachments === 0)) && (
        <AttachmentGroup
          category="plan"
          items={grouped.plan}
          canEdit={canEdit}
          onRemove={onRemove}
        />
      )}

      {grouped.expert_review.length > 0 && (
        <AttachmentGroup
          category="expert_review"
          items={grouped.expert_review}
          canEdit={false}
          onRemove={onRemove}
        />
      )}

      {grouped.disclosure.length > 0 && (
        <AttachmentGroup
          category="disclosure"
          items={grouped.disclosure}
          canEdit={false}
          onRemove={onRemove}
        />
      )}

      {canEdit && onUpload && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border-2 border-dashed border-slate-300 rounded-md text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/30 transition-colors"
          >
            <Upload className="w-4 h-4" />
            上传方案附件（PDF / Excel）
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xls,.xlsx"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}

function AttachmentGroup({
  category,
  items,
  canEdit,
  onRemove,
}: {
  category: AttachmentCategory;
  items: Attachment[];
  canEdit: boolean;
  onRemove?: (id: string) => void;
}) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <div className={category !== 'plan' ? 'mt-4' : ''}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
          <Icon className={`w-3 h-3 ${config.color}`} />
        </div>
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{config.label}</span>
        <span className="text-xs text-slate-400">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 py-2 pl-7">暂无</div>
      ) : (
        <div className="space-y-1.5">
          {items.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-200 transition-colors group"
            >
              <FileIcon fileType={att.fileType} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{att.fileName}</div>
                <div className="text-xs text-slate-500">
                  {formatFileSize(att.fileSize)} · {formatDateTime(att.uploadedAt)}
                </div>
              </div>
              {canEdit && onRemove && (
                <button
                  onClick={() => onRemove(att.id)}
                  className="p-1.5 rounded text-slate-400 hover:text-risk-red hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="移除附件"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {!canEdit && (
                <button className="p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
