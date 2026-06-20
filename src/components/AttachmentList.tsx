import { FileText, Download, FileSpreadsheet, File } from 'lucide-react';
import type { Attachment } from '../types';
import { formatDateTime, formatFileSize } from '../utils/dateUtils';

interface AttachmentListProps {
  attachments: Attachment[];
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === 'pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (fileType === 'xlsx' || fileType === 'xls') {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  return <File className="w-5 h-5 text-slate-500" />;
}

export default function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-md">
        暂无附件
      </div>
    );
  }

  return (
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
          <button className="p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
