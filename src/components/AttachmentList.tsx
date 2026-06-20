import { useRef, useState } from 'react';
import { FileText, Download, FileSpreadsheet, File, Upload, X, Shield, FileCheck, ClipboardCheck, Archive, ChevronDown, ChevronUp, History } from 'lucide-react';
import type { Attachment, AttachmentCategory } from '../types';
import { formatDateTime, formatFileSize } from '../utils/dateUtils';

interface AttachmentListProps {
  attachments: Attachment[];
  planName?: string;
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

const categoryFilterOptions: { key: AttachmentCategory | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'plan', label: '方案附件' },
  { key: 'expert_review', label: '论证报告' },
  { key: 'disclosure', label: '交底记录' },
];

export default function AttachmentList({ attachments, planName, onUpload, onRemove, canEdit = false }: AttachmentListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<AttachmentCategory | 'all'>('all');
  const [showArchive, setShowArchive] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const activeAttachments = attachments.filter((a) => !a.supersededAt);
  const supersededAttachments = attachments.filter((a) => a.supersededAt);

  const filteredActive = filter === 'all' ? activeAttachments : activeAttachments.filter((a) => a.category === filter);

  const grouped = {
    plan: activeAttachments.filter((a) => a.category === 'plan'),
    expert_review: activeAttachments.filter((a) => a.category === 'expert_review'),
    disclosure: activeAttachments.filter((a) => a.category === 'disclosure'),
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

  const toggleVersion = (fileName: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName); else next.add(fileName);
      return next;
    });
  };

  const getVersionHistory = (fileName: string, category: AttachmentCategory) =>
    attachments.filter((a) => a.fileName === fileName && a.category === category).sort((a, b) => a.version - b.version);

  const generateArchiveText = () => {
    const lines: string[] = [];
    lines.push(`归档清单 - ${planName || '方案'}`);
    lines.push(`生成时间：${formatDateTime(new Date().toISOString())}`);
    lines.push('');
    const cats: AttachmentCategory[] = ['plan', 'expert_review', 'disclosure'];
    let totalActive = 0;
    let totalArchived = 0;
    cats.forEach((cat) => {
      const activeItems = attachments.filter((a) => a.category === cat && !a.supersededAt);
      const archivedItems = attachments.filter((a) => a.category === cat && a.supersededAt);
      if (activeItems.length === 0 && archivedItems.length === 0) return;
      lines.push(`【${categoryConfig[cat].label}】`);
      lines.push('');
      if (activeItems.length > 0) {
        lines.push('  ▶ 当前有效版本：');
        activeItems.forEach((att, i) => {
          const verLabel = att.version > 1 ? ` V${att.version}` : '';
          lines.push(`    ${i + 1}. ${att.fileName}${verLabel} - ${formatFileSize(att.fileSize)} - ${formatDateTime(att.uploadedAt)} [当前版]`);
        });
        totalActive += activeItems.length;
        lines.push('');
      }
      if (archivedItems.length > 0) {
        lines.push('  ◼ 已归档历史版本：');
        archivedItems.forEach((att, i) => {
          lines.push(`    ${i + 1}. ${att.fileName} V${att.version} - ${formatFileSize(att.fileSize)} - ${formatDateTime(att.uploadedAt)} [历史版，被替换于 ${formatDateTime(att.supersededAt!)}]`);
        });
        totalArchived += archivedItems.length;
        lines.push('');
      }
    });
    lines.push('────────────────────────');
    lines.push(`合计：${totalActive} 个当前有效文件，${totalArchived} 个已归档历史版本`);
    return lines.join('\n');
  };

  const handleExportArchive = () => {
    const text = generateArchiveText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `归档清单-${planName || '方案'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalAttachments = activeAttachments.length;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {categoryFilterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === opt.key
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
            {opt.key !== 'all' && (
              <span className="ml-1 opacity-70">{grouped[opt.key].length}</span>
            )}
          </button>
        ))}
        <button
          onClick={handleExportArchive}
          className="ml-auto px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-1"
        >
          <Archive className="w-3 h-3" />
          归档清单
        </button>
      </div>

      {totalAttachments === 0 && !canEdit && (
        <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-md">
          暂无附件
        </div>
      )}

      <div className="space-y-1.5">
        {filteredActive.map((att) => {
          const hasVersions = getVersionHistory(att.fileName, att.category).length > 1;
          const versions = hasVersions ? getVersionHistory(att.fileName, att.category) : [];
          const isExpanded = expandedVersions.has(att.fileName + att.category);
          const config = categoryConfig[att.category];

          return (
            <div key={att.id}>
              <div className="flex items-center gap-3 p-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-200 transition-colors group">
                <FileIcon fileType={att.fileType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-800 truncate">{att.fileName}</span>
                    {att.version > 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">V{att.version}</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color} font-medium`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatFileSize(att.fileSize)} · {formatDateTime(att.uploadedAt)}
                  </div>
                </div>
                {hasVersions && (
                  <button
                    onClick={() => toggleVersion(att.fileName + att.category)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="查看版本历史"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <History className="w-4 h-4" />}
                  </button>
                )}
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
              {isExpanded && versions.length > 1 && (
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                  {versions.map((v) => (
                    <div key={v.id} className={`flex items-center gap-2 text-xs py-1 ${v.supersededAt ? 'text-slate-400' : 'text-slate-700'}`}>
                      <span className="font-medium">V{v.version}</span>
                      <span>{formatFileSize(v.fileSize)}</span>
                      <span>{formatDateTime(v.uploadedAt)}</span>
                      {v.supersededAt && <span className="text-slate-400">（已被V{v.version + (versions.find(vv => vv.version > v.version && !vv.supersededAt) ? 1 : 0)}替换）</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {supersededAttachments.length > 0 && !showArchive && (
        <button
          onClick={() => setShowArchive(true)}
          className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
        >
          <Archive className="w-3 h-3" />
          {supersededAttachments.length} 个历史版本已归档
        </button>
      )}

      {showArchive && supersededAttachments.length > 0 && (
        <div className="mt-2 border border-dashed border-slate-200 rounded-md p-3 bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <Archive className="w-3 h-3" />
            已归档的旧版本
          </div>
          <div className="space-y-1">
            {supersededAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 text-xs text-slate-400">
                <FileIcon fileType={att.fileType} />
                <span className="truncate">{att.fileName}</span>
                <span>V{att.version}</span>
                <span>{formatDateTime(att.uploadedAt)}</span>
                <span>→ 被替换于 {formatDateTime(att.supersededAt!)}</span>
              </div>
            ))}
          </div>
        </div>
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
