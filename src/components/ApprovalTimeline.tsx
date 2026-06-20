import { CheckCircle2, XCircle, Clock, PenLine } from 'lucide-react';
import type { ApprovalNode, ApprovalAction } from '../types';
import { formatDateTime } from '../utils/dateUtils';

interface ApprovalTimelineProps {
  nodes: ApprovalNode[];
}

const nodeColor: Record<ApprovalAction, { dot: string; line: string; icon: string }> = {
  approved: { dot: 'bg-risk-green border-risk-green', line: 'bg-risk-green', icon: 'text-risk-green' },
  rejected: { dot: 'bg-risk-red border-risk-red', line: 'bg-risk-red', icon: 'text-risk-red' },
  pending: { dot: 'bg-white border-slate-300', line: 'bg-slate-200', icon: 'text-slate-400' },
};

const actionLabel: Record<ApprovalAction, string> = {
  approved: '已通过',
  rejected: '已退回',
  pending: '待处理',
};

export default function ApprovalTimeline({ nodes }: ApprovalTimelineProps) {
  return (
    <div className="relative">
      {nodes.map((node, idx) => {
        const colors = nodeColor[node.action];
        const isLast = idx === nodes.length - 1;
        return (
          <div key={node.id} className="relative flex gap-4 pb-6">
            <div className="flex flex-col items-center">
              <div
                className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${colors.dot}`}
              >
                {node.action === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : node.action === 'rejected' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 mt-1 ${colors.line} opacity-40`}></div>
              )}
            </div>

            <div className="flex-1 pb-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{node.role}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      node.action === 'approved'
                        ? 'bg-emerald-50 text-risk-green'
                        : node.action === 'rejected'
                        ? 'bg-red-50 text-risk-red'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {actionLabel[node.action]}
                  </span>
                </div>
                {node.timestamp && (
                  <span className="text-xs text-slate-500">{formatDateTime(node.timestamp)}</span>
                )}
              </div>

              <div className="mt-1 text-sm text-slate-600">
                <span className="font-medium">{node.userName}</span>
                {node.signature && node.action !== 'pending' && (
                  <span className="inline-flex items-center gap-1 ml-2 text-xs text-slate-500">
                    <PenLine className="w-3 h-3" />
                    已签名
                  </span>
                )}
              </div>

              {node.opinion && (
                <div
                  className={`mt-3 text-sm rounded-md border px-3 py-2 ${
                    node.action === 'rejected'
                      ? 'bg-red-50 border-red-100 text-risk-red'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {node.opinion}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
