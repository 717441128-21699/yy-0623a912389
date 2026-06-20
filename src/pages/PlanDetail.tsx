import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  FileCheck,
  Shield,
  Upload,
  History,
  PenLine,
  AlertCircle,
  Edit2,
  Send,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';
import { StatusBadge, EngineeringBadge } from '../components/StatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';
import AttachmentList from '../components/AttachmentList';
import RejectModal from '../components/RejectModal';
import PlanForm, { type PlanFormData } from '../components/PlanForm';
import type { Attachment, AttachmentCategory } from '../types';
import { formatDate, formatDateTime, daysUntil } from '../utils/dateUtils';

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const plan = usePlanStore((s) => (id ? s.getPlan(id) : undefined));
  const user = usePlanStore((s) => s.user);
  const getCurrentNode = usePlanStore((s) => s.getCurrentNode);
  const approveNode = usePlanStore((s) => s.approveNode);
  const rejectNode = usePlanStore((s) => s.rejectNode);
  const uploadExpertReview = usePlanStore((s) => s.uploadExpertReview);
  const uploadDisclosure = usePlanStore((s) => s.uploadDisclosure);
  const submitForReview = usePlanStore((s) => s.submitForReview);
  const addAttachment = usePlanStore((s) => s.addAttachment);
  const removeAttachment = usePlanStore((s) => s.removeAttachment);
  const updatePlan = usePlanStore((s) => s.updatePlan);

  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [approveOpinion, setApproveOpinion] = useState('');
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <div className="mt-4 text-slate-500">方案不存在或已被删除</div>
        <button onClick={() => navigate('/plans')} className="mt-4 text-sm text-brand-600 hover:text-brand-700">
          返回方案列表
        </button>
      </div>
    );
  }

  const currentNode = getCurrentNode(plan);
  const days = daysUntil(plan.planStartDate);
  const isUrgent = days <= 7;
  const isDraft = plan.status === 'draft';
  const isDisclosed = plan.status === 'disclosed';
  const canEditDraft = isDraft;
  const canUploadAttachments = isDraft;
  const isResubmit = !!plan.lastRejection;

  const lastRejection = plan.lastRejection;
  const lastResubmitLog = [...plan.modificationLogs].reverse().find((l) => l.isResubmit);
  const recentChanges = [...plan.modificationLogs].reverse().find((l) => !l.description.includes('退回修改'));

  const canAct = () => {
    if (!currentNode || isDisclosed || isDraft) return false;
    if (currentNode.role === '专家论证') return user.role === 'tech_lead' || user.role === 'project_manager';
    const roleMap: Record<string, string> = {
      '项目经理': 'project_manager',
      '总监理工程师': 'supervisor',
      '建设单位代表': 'owner_rep',
      '项目技术负责人': 'tech_lead',
    };
    return roleMap[currentNode.role] === user.role;
  };

  const canUploadDisclosure =
    !isDraft &&
    !isDisclosed &&
    !plan.disclosureUploaded &&
    (user.role === 'tech_lead' || user.role === 'project_manager') &&
    plan.approvalNodes.filter((n) => n.action === 'pending' && n.role !== '专家论证').length === 0 &&
    (!plan.needExpertReview || plan.expertReviewDone);

  const handleApprove = () => {
    if (!pendingNodeId) return;
    const opinion = approveOpinion.trim() || '审批通过。';
    approveNode(plan.id, pendingNodeId, opinion, user.name);
    setShowApprove(false);
    setApproveOpinion('');
    setPendingNodeId(null);
  };

  const handleReject = (opinion: string) => {
    if (!pendingNodeId) return;
    rejectNode(plan.id, pendingNodeId, opinion, user.name);
    setShowReject(false);
    setPendingNodeId(null);
  };

  const openApprove = (nodeId: string) => {
    setPendingNodeId(nodeId);
    setShowApprove(true);
  };

  const openReject = (nodeId: string) => {
    setPendingNodeId(nodeId);
    setShowReject(true);
  };

  const handleUploadAttachment = (fileMeta: { fileName: string; fileType: string; fileSize: number; category: AttachmentCategory }) => {
    addAttachment(plan.id, fileMeta);
  };

  const handleRemoveAttachment = (attId: string) => {
    if (confirm('确定移除该附件？')) removeAttachment(plan.id, attId);
  };

  const handleEditSubmit = (originalAtts: Attachment[], data: PlanFormData) => {
    const removedIds = data.removedAttachmentIds || [];
    const addedNames = data.addedAttachmentNames || [];

    const attachmentChanges: string[] = [];
    const removedNames = originalAtts.filter((a) => removedIds.includes(a.id)).map((a) => `删除附件"${a.fileName}"`);
    attachmentChanges.push(...removedNames);
    addedNames.forEach((n) => attachmentChanges.push(`新增附件"${n}"`));

    removedIds.forEach((attId) => removeAttachment(plan.id, attId));

    updatePlan(
      plan.id,
      {
        projectName: data.projectName,
        engineeringType: data.engineeringType,
        location: data.location,
        scaleParams: data.scaleParams,
        planStartDate: data.planStartDate,
        needExpertReview: data.needExpertReview,
        attachmentChanges,
        resubmitNote: data.resubmitNote,
      },
      user.name
    );
    const existingNames = new Set(originalAtts.map((a) => a.fileName));
    data.attachments.forEach((att) => {
      if (!existingNames.has(att.fileName)) {
        addAttachment(plan.id, { fileName: att.fileName, fileType: att.fileType, fileSize: att.fileSize, category: 'plan' });
      }
    });
    setShowEdit(false);
  };

  const handleResubmit = (resubmitNote: string) => {
    submitForReview(plan.id, plan.authorName, resubmitNote);
    setShowResubmit(false);
  };

  const handleSubmit = () => {
    if (isResubmit) {
      setShowResubmit(true);
    } else {
      if (confirm('确认提交审核？提交后将进入审批流程。')) {
        submitForReview(plan.id, plan.authorName);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-700 border border-transparent hover:border-slate-200 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{plan.projectName}</h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <EngineeringBadge type={plan.engineeringType} />
              <StatusBadge status={plan.status} />
              {isUrgent && !isDisclosed && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    days < 0
                      ? 'bg-red-50 text-risk-red border border-red-200'
                      : 'bg-orange-50 text-risk-orange border border-orange-200'
                  }`}
                >
                  {days < 0 ? `已超期 ${Math.abs(days)} 天` : `距开工 ${days} 天`}
                </span>
              )}
            </div>
          </div>
        </div>
        {isDraft && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" />
              编辑方案
            </button>
            <button
              onClick={handleSubmit}
              className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {isResubmit ? '重新提交' : '提交审核'}
            </button>
          </div>
        )}
      </div>

      {lastRejection && (
        <div className="bg-white rounded-lg border border-red-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-risk-red" />
            审批意见对比
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="text-xs font-semibold text-risk-red mb-2 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                退回意见
              </div>
              <div className="text-xs text-slate-500 mb-1">
                {lastRejection.rejecterName}（{lastRejection.role}）· {formatDateTime(lastRejection.timestamp)}
              </div>
              <div className="text-sm text-slate-800 mt-1">{lastRejection.opinion}</div>
            </div>
            <div className="rounded-md border border-brand-200 bg-brand-50 p-3">
              <div className="text-xs font-semibold text-brand-700 mb-2 flex items-center gap-1">
                <PenLine className="w-3 h-3" />
                修改说明
              </div>
              {lastResubmitLog ? (
                <div className="text-sm text-slate-800">{lastResubmitLog.description}</div>
              ) : (
                <div className="text-sm text-slate-400 italic">尚未重新提交</div>
              )}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <History className="w-3 h-3" />
                字段变化
              </div>
              {recentChanges ? (
                <div className="text-sm text-slate-700">{recentChanges.description}</div>
              ) : (
                <div className="text-sm text-slate-400 italic">暂无变更</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-600" />
              方案基本信息
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-0.5">工程部位</div>
                <div className="text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {plan.location}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">计划施工日期</div>
                <div className="text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(plan.planStartDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">规模参数</div>
                <div className="text-slate-800">{plan.scaleParams}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">编制人</div>
                <div className="text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {plan.authorName}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">创建时间</div>
                <div className="text-slate-800">{formatDateTime(plan.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">更新时间</div>
                <div className="text-slate-800">{formatDateTime(plan.updatedAt)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500 mb-0.5">专家论证</div>
                <div className="text-slate-800">
                  {plan.needExpertReview
                    ? plan.expertReviewDone
                      ? <span className="text-risk-green">✓ 已完成专家论证</span>
                      : <span className="text-risk-orange">⚠ 需组织专家论证（未完成）</span>
                    : '无需专家论证'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500 mb-0.5">安全交底</div>
                <div className="text-slate-800">
                  {plan.disclosureUploaded
                    ? <span className="text-risk-green">✓ 交底记录已上传</span>
                    : <span className="text-slate-500">交底记录暂未上传</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <PenLine className="w-4 h-4 text-brand-600" />
              审批流程
            </h3>
            <ApprovalTimeline nodes={plan.approvalNodes} />
          </div>

          {plan.modificationLogs.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-600" />
                修改记录
              </h3>
              <div className="space-y-3">
                {plan.modificationLogs.map((log, idx) => (
                  <div key={log.id} className="pl-4 border-l-2 border-slate-200 py-1" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{log.modifierName}</span>
                      <span>·</span>
                      <span>{formatDateTime(log.timestamp)}</span>
                      {log.isResubmit && (
                        <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-xs font-medium">重新提交</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{log.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5 sticky top-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              审批操作
            </h3>

            {isDraft ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 border border-slate-200">
                  当前状态：<span className="font-medium text-slate-800">{isResubmit ? '退回修改中' : '待编制'}</span>
                  {isResubmit && lastRejection && (
                    <div className="mt-1 text-xs text-risk-red">
                      {lastRejection.role}退回：{lastRejection.opinion}
                    </div>
                  )}
                  {!isResubmit && (
                    <div className="mt-1 text-xs text-slate-500">可编辑方案内容并提交审核</div>
                  )}
                </div>
                {isResubmit && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-4 h-4" />
                    编辑修改
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  {isResubmit ? '重新提交审核' : '提交审核'}
                </button>
              </div>
            ) : isDisclosed ? (
              <div className="text-sm text-risk-green py-4 text-center bg-emerald-50 rounded-md">
                ✓ 方案已完成全部流程并归档
              </div>
            ) : canAct() && currentNode ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 border border-slate-200">
                  当前节点：<span className="font-medium text-slate-800">{currentNode.role}</span>
                  <div className="mt-1 text-xs text-slate-500">处理人：{currentNode.userName}</div>
                  {currentNode.round && currentNode.round > 1 && (
                    <div className="mt-1 text-xs text-brand-600">第 {currentNode.round} 轮审批</div>
                  )}
                </div>

                {lastRejection && (
                  <div className="text-xs bg-red-50 border border-red-100 rounded-md p-2.5 text-risk-red">
                    上次退回：{lastRejection.opinion}
                  </div>
                )}

                {currentNode.role === '专家论证' ? (
                  <button
                    onClick={() => uploadExpertReview(plan.id, user.name)}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    上传专家论证报告
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => openApprove(currentNode.id)}
                      className="w-full px-4 py-2.5 text-sm font-medium text-white bg-risk-green rounded-md hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileCheck className="w-4 h-4" />
                      审批通过
                    </button>
                    <button
                      onClick={() => openReject(currentNode.id)}
                      className="w-full px-4 py-2.5 text-sm font-medium text-risk-red bg-white border border-red-200 rounded-md hover:bg-red-50 active:scale-[0.98] transition-all"
                    >
                      退回修改
                    </button>
                  </>
                )}
              </div>
            ) : currentNode ? (
              <div className="space-y-2 text-sm">
                <div className="text-slate-600 bg-slate-50 rounded-md p-3 border border-slate-200">
                  当前等待：<span className="font-medium text-slate-800">{currentNode.role}</span>
                  <div className="mt-1 text-xs text-slate-500">处理人：{currentNode.userName}</div>
                  {currentNode.round && currentNode.round > 1 && (
                    <div className="mt-1 text-xs text-brand-600">第 {currentNode.round} 轮审批</div>
                  )}
                </div>
                <div className="text-xs text-slate-400 text-center">
                  当前身份「{user.roleName}」暂无此节点审批权限，可在左下角切换身份。
                </div>
              </div>
            ) : null}

            {canUploadDisclosure && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => uploadDisclosure(plan.id, user.name)}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-risk-orange rounded-md hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  上传安全交底记录
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-600" />
              方案附件
              <span className="ml-auto text-xs text-slate-400 font-normal">{plan.attachments.length} 个</span>
            </h3>
            <AttachmentList
              attachments={plan.attachments}
              canEdit={canUploadAttachments}
              onUpload={canUploadAttachments ? handleUploadAttachment : undefined}
              onRemove={canUploadAttachments ? handleRemoveAttachment : undefined}
            />
          </div>
        </div>
      </div>

      <RejectModal open={showReject} onClose={() => setShowReject(false)} onConfirm={handleReject} />

      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-up">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800">审批通过</h2>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">审批意见（可选）</label>
              <textarea
                value={approveOpinion}
                onChange={(e) => setApproveOpinion(e.target.value)}
                rows={3}
                placeholder="请填写审批意见..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
              />
              <div className="mt-2 text-xs text-slate-400">
                将以「<span className="text-brand-700 font-medium">{user.name}</span>」身份签名确认。
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => { setShowApprove(false); setApproveOpinion(''); setPendingNodeId(null); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 text-sm font-medium text-white bg-risk-green rounded-md hover:bg-emerald-700 active:scale-[0.98] transition-all"
              >
                确认通过
              </button>
            </div>
          </div>
        </div>
      )}

      {showResubmit && (
        <ResubmitModal
          rejection={lastRejection}
          onConfirm={handleResubmit}
          onCancel={() => setShowResubmit(false)}
        />
      )}

      {showEdit && (
        <PlanForm
          title={isResubmit ? '编辑修改方案' : '编辑方案'}
          submitLabel="保存修改"
          initialData={{
            projectName: plan.projectName,
            engineeringType: plan.engineeringType,
            location: plan.location,
            scaleParams: plan.scaleParams,
            planStartDate: plan.planStartDate,
            authorName: plan.authorName,
            needExpertReview: plan.needExpertReview,
            resubmitNote: '',
          }}
          existingAttachments={plan.attachments.filter((a) => a.category === 'plan')}
          readOnlyAuthor
          showResubmitNote={isResubmit}
          onSubmit={(data) => handleEditSubmit(plan.attachments, data)}
          onCancel={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

function ResubmitModal({
  rejection,
  onConfirm,
  onCancel,
}: {
  rejection: { role: string; opinion: string; rejecterName: string } | undefined;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-up">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">重新提交审核</h2>
        </div>
        <div className="p-5">
          {rejection && (
            <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-100 text-sm text-risk-red">
              <div className="font-medium mb-1">上次退回意见（{rejection.role}）</div>
              <div>{rejection.opinion}</div>
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            修改说明 <span className="text-risk-orange">*</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="请简要说明针对退回意见做了哪些修改..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(note.trim() || '已按退回意见修改完成。')}
            disabled={!note.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认重新提交
          </button>
        </div>
      </div>
    </div>
  );
}
