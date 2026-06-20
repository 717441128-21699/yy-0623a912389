import { useRef } from 'react';
import { FileText, Download, FileSpreadsheet, File, Upload, X } from 'lucide-react';
import type { Attachment } from '../types';
import { formatDateTime, formatFileSize } from '../utils/dateUtils';

interface AttachmentListProps {
  attachments: Attachment[];
  onUpload?: (fileMeta: { fileName: string; fileType: string; fileSize: number }) => void;
  onRemove?: (attachmentId: string) => void;
  canEdit?: boolean;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (fileType === 'xlsx' || fileType === 'xls') return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  return <File className="w-5 h-5 text-slate-500" />;
}

export default function AttachmentList({ attachments, onUpload, onRemove, canEdit = false }: AttachmentListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUpload) return;
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'file';
      onUpload({ fileName: f.name, fileType: ext, fileSize: f.size });
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {attachments.length === 0 && !canEdit && (
        <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-md">
          暂无附件
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-200 transition-colors group"
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

      {canEdit && onUpload && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border-2 border-dashed border-slate-300 rounded-md text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/30 transition-colors"
          >
            <Upload className="w-4 h-4" />
            上传 PDF / Excel 附件
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
