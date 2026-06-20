import { useState } from 'react';
import { X } from 'lucide-react';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (opinion: string) => void;
  title?: string;
}

export default function RejectModal({ open, onClose, onConfirm, title = '退回修改' }: RejectModalProps) {
  const [opinion, setOpinion] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (!opinion.trim()) {
      setError('请填写退回意见');
      return;
    }
    onConfirm(opinion);
    setOpinion('');
    setError('');
  };

  const handleClose = () => {
    setOpinion('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            退回意见 <span className="text-risk-red">*</span>
          </label>
          <textarea
            value={opinion}
            onChange={(e) => {
              setOpinion(e.target.value);
              if (error) setError('');
            }}
            rows={4}
            placeholder="请详细说明退回原因及修改要求..."
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none ${
              error ? 'border-risk-red' : 'border-slate-300'
            }`}
          />
          {error && <div className="mt-1 text-xs text-risk-red">{error}</div>}
          <div className="mt-3 text-xs text-slate-400">
            退回后方案将返回「待编制」状态，编制人可重新修改后提交。
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-risk-red rounded-md hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            确认退回
          </button>
        </div>
      </div>
    </div>
  );
}
