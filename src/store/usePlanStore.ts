import { create } from 'zustand';
import type { Plan, PlanStatus, User, RiskItem, ApprovalNode, Attachment, PlanUpdateData, AttachmentCategory, EngineeringType } from '../types';
import { mockPlans, currentUser, availableUsers } from '../data/mockPlans';
import { daysUntil, generateId, now } from '../utils/dateUtils';

interface PlanState {
  plans: Plan[];
  user: User;
  availableUsers: User[];
  selectedPlanId: string | null;
  setUser: (user: User) => void;
  getPlan: (id: string) => Plan | undefined;
  getPlansByStatus: (status: PlanStatus) => Plan[];
  getRiskItems: () => RiskItem[];
  getStats: () => {
    total: number;
    pendingReview: number;
    overdue: number;
    expertIncomplete: number;
    disclosureMissing: number;
  };
  getStatistics: () => StatisticsData;
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvalNodes' | 'modificationLogs' | 'expertReviewDone' | 'disclosureUploaded' | 'attachments' | 'lastRejection' | 'resubmitNote' | 'rejectionHistory'> & { attachments?: Attachment[] }) => string;
  updatePlan: (planId: string, data: PlanUpdateData, modifierName: string) => void;
  addAttachment: (planId: string, fileMeta: Omit<Attachment, 'id' | 'uploadedAt' | 'version' | 'supersededAt'>) => void;
  removeAttachment: (planId: string, attachmentId: string) => void;
  submitForReview: (planId: string, submitterName: string, resubmitNote?: string) => void;
  approveNode: (planId: string, nodeId: string, opinion: string, approverName: string) => void;
  rejectNode: (planId: string, nodeId: string, opinion: string, rejecterName: string) => void;
  uploadExpertReview: (planId: string, uploaderName: string, fileMeta?: { fileName: string; fileType: string; fileSize: number }) => void;
  uploadDisclosure: (planId: string, uploaderName: string, fileMeta?: { fileName: string; fileType: string; fileSize: number }) => void;
  getCurrentNode: (plan: Plan) => ApprovalNode | undefined;
}

export interface StatisticsData {
  byType: { type: EngineeringType; count: number }[];
  byNode: { node: string; count: number }[];
  everRejected: number;
  neverRejected: number;
  missingExpertReview: number;
  missingDisclosure: number;
  byStatus: { status: PlanStatus; count: number }[];
  total: number;
}

function determineStatus(nodes: ApprovalNode[], needExpert: boolean, expertDone: boolean, disclosed: boolean): PlanStatus {
  if (disclosed) return 'disclosed';
  const pending = nodes.find((n) => n.action === 'pending');
  if (!pending) return 'pending_argument';
  if (pending.orderIndex === 0 && nodes.every((n) => n.action === 'pending' || (n.action === 'rejected' && n.orderIndex === 0))) {
    if (!nodes.some((n) => n.action === 'approved')) return 'draft';
  }
  if (needExpert && !expertDone) {
    if (pending?.role === '专家论证') return 'pending_argument';
  }
  return 'pending_review';
}

function getCurrentRound(nodes: ApprovalNode[]): number {
  return Math.max(...nodes.map((n) => n.round || 1), 1);
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [...mockPlans],
  user: currentUser,
  availableUsers,
  selectedPlanId: null,

  setUser: (user) => set({ user }),

  getPlan: (id) => get().plans.find((p) => p.id === id),

  getPlansByStatus: (status) => get().plans.filter((p) => p.status === status),

  getRiskItems: () => {
    const plans = get().plans;
    const risks: RiskItem[] = [];
    plans.forEach((plan) => {
      const days = daysUntil(plan.planStartDate);
      if (plan.needExpertReview && !plan.expertReviewDone && plan.status !== 'disclosed') {
        risks.push({
          id: `r-exp-${plan.id}`, planId: plan.id, planName: plan.projectName, type: 'expert_incomplete',
          typeLabel: '专家论证未完成', daysRemaining: days, location: plan.location,
          engineeringType: plan.engineeringType, severity: days <= 7 ? 'high' : days <= 14 ? 'medium' : 'low',
        });
      }
      if (plan.status === 'pending_review' && days <= 3) {
        risks.push({
          id: `r-ovd-${plan.id}`, planId: plan.id, planName: plan.projectName, type: 'approval_overdue',
          typeLabel: days < 0 ? `审批已超期${Math.abs(days)}天` : `距离开工仅剩${days}天`, daysRemaining: days,
          location: plan.location, engineeringType: plan.engineeringType, severity: days < 0 ? 'high' : 'medium',
        });
      }
      if (plan.status !== 'draft' && plan.status !== 'disclosed' && !plan.disclosureUploaded && days <= 5) {
        if (!risks.some((r) => r.planId === plan.id && r.type === 'disclosure_missing')) {
          risks.push({
            id: `r-dis-${plan.id}`, planId: plan.id, planName: plan.projectName, type: 'disclosure_missing',
            typeLabel: '交底记录未上传', daysRemaining: days, location: plan.location,
            engineeringType: plan.engineeringType, severity: days <= 2 ? 'high' : 'low',
          });
        }
      }
    });
    return risks.sort((a, b) => a.daysRemaining - b.daysRemaining);
  },

  getStats: () => {
    const plans = get().plans;
    const riskItems = get().getRiskItems();
    return {
      total: plans.length,
      pendingReview: plans.filter((p) => p.status === 'pending_review' || p.status === 'pending_argument').length,
      overdue: riskItems.filter((r) => r.type === 'approval_overdue').length,
      expertIncomplete: riskItems.filter((r) => r.type === 'expert_incomplete').length,
      disclosureMissing: riskItems.filter((r) => r.type === 'disclosure_missing').length,
    };
  },

  getStatistics: () => {
    const plans = get().plans;
    const typeMap = new Map<EngineeringType, number>();
    const nodeMap = new Map<string, number>();
    const statusMap = new Map<PlanStatus, number>();
    let everRejected = 0;
    let neverRejected = 0;
    let missingExpert = 0;
    let missingDisclosure = 0;

    plans.forEach((p) => {
      typeMap.set(p.engineeringType, (typeMap.get(p.engineeringType) || 0) + 1);
      statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
      if (p.rejectionHistory.length > 0) everRejected++; else neverRejected++;
      if (p.needExpertReview && !p.expertReviewDone) missingExpert++;
      if (p.status !== 'draft' && !p.disclosureUploaded) missingDisclosure++;

      const pending = p.approvalNodes.find((n) => n.action === 'pending');
      if (pending) {
        const label = pending.role;
        nodeMap.set(label, (nodeMap.get(label) || 0) + 1);
      } else if (p.status === 'disclosed') {
        nodeMap.set('已归档', (nodeMap.get('已归档') || 0) + 1);
      }
    });

    return {
      byType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      byNode: Array.from(nodeMap.entries()).map(([node, count]) => ({ node, count })).sort((a, b) => b.count - a.count),
      everRejected,
      neverRejected,
      missingExpertReview: missingExpert,
      missingDisclosure,
      byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      total: plans.length,
    };
  },

  addPlan: (planData) => {
    const newId = generateId();
    const buildApprovalNodes = (needExpert: boolean) => {
      const base: ApprovalNode[] = [
        { id: generateId(), planId: newId, role: '项目技术负责人', userName: planData.authorName, action: 'pending', orderIndex: 0, round: 1 },
        { id: generateId(), planId: newId, role: '项目经理', userName: '张建国', action: 'pending', orderIndex: 1, round: 1 },
        { id: generateId(), planId: newId, role: '总监理工程师', userName: '王监理', action: 'pending', orderIndex: 2, round: 1 },
      ];
      if (needExpert) {
        base.push({ id: generateId(), planId: newId, role: '专家论证', userName: '专家组', action: 'pending', orderIndex: 3, round: 1 });
        base.push({ id: generateId(), planId: newId, role: '建设单位代表', userName: '陈总', action: 'pending', orderIndex: 4, round: 1 });
      } else {
        base.push({ id: generateId(), planId: newId, role: '建设单位代表', userName: '陈总', action: 'pending', orderIndex: 3, round: 1 });
      }
      return base;
    };
    const newPlan: Plan = {
      attachments: (planData.attachments || []).map((a) => ({ ...a, category: a.category || 'plan' as AttachmentCategory, version: a.version || 1 })),
      ...planData,
      id: newId,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
      expertReviewDone: false,
      disclosureUploaded: false,
      modificationLogs: [],
      approvalNodes: buildApprovalNodes(planData.needExpertReview),
      rejectionHistory: [],
    };
    set((state) => ({ plans: [...state.plans, newPlan] }));
    return newId;
  },

  updatePlan: (planId, data, modifierName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const changes: string[] = [];
        if (data.location && data.location !== p.location) changes.push(`工程部位从"${p.location}"改为"${data.location}"`);
        if (data.scaleParams && data.scaleParams !== p.scaleParams) changes.push(`规模参数从"${p.scaleParams}"改为"${data.scaleParams}"`);
        if (data.planStartDate && data.planStartDate !== p.planStartDate) changes.push(`计划施工日期从"${p.planStartDate}"改为"${data.planStartDate}"`);
        if (data.projectName && data.projectName !== p.projectName) changes.push(`工程名称改为"${data.projectName}"`);
        if (data.engineeringType && data.engineeringType !== p.engineeringType) changes.push(`工程类型从"${p.engineeringType}"改为"${data.engineeringType}"`);
        if (typeof data.needExpertReview === 'boolean' && data.needExpertReview !== p.needExpertReview) changes.push(data.needExpertReview ? '新增需专家论证要求' : '取消专家论证要求');
        if (data.attachmentChanges && data.attachmentChanges.length > 0) changes.push(...data.attachmentChanges);

        const newLog = changes.length > 0
          ? { id: generateId(), planId, modifierName, description: changes.join('；'), timestamp: now(), isResubmit: !!data.resubmitNote }
          : null;

        let approvalNodes = p.approvalNodes;
        if (typeof data.needExpertReview === 'boolean' && data.needExpertReview !== p.needExpertReview) {
          if (data.needExpertReview) {
            const supervisorIdx = approvalNodes.findIndex((n) => n.role === '总监理工程师');
            const ownerIdx = approvalNodes.findIndex((n) => n.role === '建设单位代表');
            const expertNode: ApprovalNode = { id: generateId(), planId, role: '专家论证', userName: '专家组', action: 'pending', orderIndex: supervisorIdx + 1 };
            approvalNodes = [
              ...approvalNodes.slice(0, supervisorIdx + 1),
              expertNode,
              ...approvalNodes.slice(ownerIdx).map((n) => ({ ...n, orderIndex: n.orderIndex + 1 })),
            ];
          } else {
            approvalNodes = approvalNodes.filter((n) => n.role !== '专家论证').map((n, i) => ({ ...n, orderIndex: i }));
          }
        }

        return {
          ...p,
          projectName: data.projectName ?? p.projectName,
          engineeringType: data.engineeringType ?? p.engineeringType,
          location: data.location ?? p.location,
          scaleParams: data.scaleParams ?? p.scaleParams,
          planStartDate: data.planStartDate ?? p.planStartDate,
          needExpertReview: data.needExpertReview ?? p.needExpertReview,
          approvalNodes,
          expertReviewDone: typeof data.needExpertReview === 'boolean' && !data.needExpertReview ? false : p.expertReviewDone,
          modificationLogs: newLog ? [...p.modificationLogs, newLog] : p.modificationLogs,
          resubmitNote: data.resubmitNote || p.resubmitNote,
          updatedAt: now(),
        };
      }),
    }));
  },

  addAttachment: (planId, fileMeta) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const allWithName = p.attachments.filter(
          (a) => a.fileName === fileMeta.fileName && a.category === fileMeta.category
        );
        let version = 1;
        let updatedAttachments = [...p.attachments];
        if (allWithName.length > 0) {
          version = Math.max(...allWithName.map((a) => a.version)) + 1;
          updatedAttachments = updatedAttachments.map((a) =>
            a.fileName === fileMeta.fileName && a.category === fileMeta.category && !a.supersededAt
              ? { ...a, supersededAt: now() }
              : a
          );
        }
        const newAtt: Attachment = {
          ...fileMeta,
          id: generateId(),
          uploadedAt: now(),
          category: fileMeta.category || 'plan',
          version,
        };
        return { ...p, attachments: [...updatedAttachments, newAtt], updatedAt: now() };
      }),
    }));
  },

  removeAttachment: (planId, attachmentId) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          attachments: p.attachments.map((a) =>
            a.id === attachmentId ? { ...a, supersededAt: a.supersededAt || now() } : a
          ),
          updatedAt: now(),
        };
      }),
    }));
  },

  submitForReview: (planId, submitterName, resubmitNote?) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const nextRound = getCurrentRound(p.approvalNodes) + 1;
        const isResubmit = !!p.lastRejection;
        let nodes: ApprovalNode[];

        if (isResubmit && p.lastRejection) {
          const rejectOrderIndex = p.approvalNodes.find((n) => n.id === p.lastRejection!.nodeId)?.orderIndex ?? 1;
          const keptNodes = p.approvalNodes.filter((n) => n.orderIndex < rejectOrderIndex && n.action === 'approved');
          const newNodes: ApprovalNode[] = [];
          const techLeadNode = p.approvalNodes.find((n) => n.role === '项目技术负责人');
          if (techLeadNode && techLeadNode.orderIndex < rejectOrderIndex) {
            newNodes.push({
              id: generateId(), planId, role: '项目技术负责人', userName: techLeadNode.userName,
              action: 'approved', timestamp: now(), signature: submitterName,
              opinion: `修改后重新提交${resubmitNote ? '：' + resubmitNote : ''}`, orderIndex: 0, round: nextRound,
            });
          }
          const laterNodes = p.approvalNodes.filter((n) => n.orderIndex >= rejectOrderIndex);
          laterNodes.forEach((n, i) => {
            newNodes.push({
              id: generateId(), planId, role: n.role, userName: n.userName,
              action: 'pending', orderIndex: (techLeadNode && techLeadNode.orderIndex < rejectOrderIndex ? 1 : 0) + i, round: nextRound,
            });
          });
          nodes = [...keptNodes, ...newNodes];
        } else {
          nodes = p.approvalNodes.map((n, i) =>
            i === 0
              ? { ...n, action: 'approved' as const, timestamp: now(), signature: submitterName, opinion: '方案编制完成，提交审核。', round: n.round || 1 }
              : { ...n, round: n.round || 1 }
          );
        }

        const resubmitLog = isResubmit
          ? { id: generateId(), planId: p.id, modifierName: submitterName, description: `修改后重新提交审核${resubmitNote ? '：' + resubmitNote : ''}`, timestamp: now(), isResubmit: true }
          : null;

        return {
          ...p,
          approvalNodes: nodes,
          status: determineStatus(nodes, p.needExpertReview, p.expertReviewDone, p.disclosureUploaded),
          modificationLogs: resubmitLog ? [...p.modificationLogs, resubmitLog] : p.modificationLogs,
          lastRejection: undefined,
          resubmitNote: resubmitNote || undefined,
          updatedAt: now(),
        };
      }),
    }));
  },

  getCurrentNode: (plan) => plan.approvalNodes.find((n) => n.action === 'pending'),

  approveNode: (planId, nodeId, opinion, approverName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const nodes = p.approvalNodes.map((n) =>
          n.id === nodeId ? { ...n, action: 'approved' as const, timestamp: now(), signature: approverName, opinion } : n
        );
        let expertReviewDone = p.expertReviewDone;
        if (p.approvalNodes.find((n) => n.id === nodeId)?.role === '专家论证') expertReviewDone = true;
        return { ...p, approvalNodes: nodes, status: determineStatus(nodes, p.needExpertReview, expertReviewDone, p.disclosureUploaded), expertReviewDone, updatedAt: now() };
      }),
    }));
  },

  rejectNode: (planId, nodeId, opinion, rejecterName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const rejectedNode = p.approvalNodes.find((n) => n.id === nodeId);
        const currentRound = getCurrentRound(p.approvalNodes);
        const rejectionCtx = {
          nodeId,
          role: rejectedNode?.role || '项目经理',
          opinion,
          rejecterName,
          timestamp: now(),
          round: currentRound,
        };
        const nodes = p.approvalNodes.map((n) =>
          n.id === nodeId
            ? { ...n, action: 'rejected' as const, timestamp: now(), signature: rejecterName, opinion }
            : n
        );
        const newLog = { id: generateId(), planId: p.id, modifierName: rejecterName, description: `${rejectedNode?.role}退回修改：${opinion}`, timestamp: now() };
        return {
          ...p,
          approvalNodes: nodes,
          status: 'draft' as PlanStatus,
          modificationLogs: [...p.modificationLogs, newLog],
          lastRejection: rejectionCtx,
          rejectionHistory: [...p.rejectionHistory, rejectionCtx],
          updatedAt: now(),
        };
      }),
    }));
  },

  uploadExpertReview: (planId, uploaderName, fileMeta?) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const expertNode = p.approvalNodes.find((n) => n.role === '专家论证');
        const nodes = expertNode
          ? p.approvalNodes.map((n) => n.id === expertNode.id ? { ...n, action: 'approved' as const, timestamp: now(), signature: '专家组', opinion: '专家论证通过。' } : n)
          : p.approvalNodes;
        const existingSameName = p.attachments.filter((a) => a.fileName === (fileMeta?.fileName || '专家论证报告.pdf') && a.category === 'expert_review' && !a.supersededAt);
        let version = 1;
        let updatedAttachments = [...p.attachments];
        if (existingSameName.length > 0) {
          version = Math.max(...existingSameName.map((a) => a.version)) + 1;
          updatedAttachments = updatedAttachments.map((a) =>
            a.fileName === (fileMeta?.fileName || '专家论证报告.pdf') && a.category === 'expert_review' && !a.supersededAt
              ? { ...a, supersededAt: now() }
              : a
          );
        }
        const newAtt: Attachment = fileMeta
          ? { ...fileMeta, id: generateId(), uploadedAt: now(), category: 'expert_review', version }
          : { id: generateId(), fileName: '专家论证报告.pdf', fileType: 'pdf', fileSize: 0, uploadedAt: now(), category: 'expert_review', version };
        return { ...p, approvalNodes: nodes, expertReviewDone: true, attachments: [...updatedAttachments, newAtt], status: determineStatus(nodes, true, true, p.disclosureUploaded), updatedAt: now() };
      }),
    }));
  },

  uploadDisclosure: (planId, uploaderName, fileMeta?) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const existingSameName = p.attachments.filter((a) => a.fileName === (fileMeta?.fileName || '安全交底记录.pdf') && a.category === 'disclosure' && !a.supersededAt);
        let version = 1;
        let updatedAttachments = [...p.attachments];
        if (existingSameName.length > 0) {
          version = Math.max(...existingSameName.map((a) => a.version)) + 1;
          updatedAttachments = updatedAttachments.map((a) =>
            a.fileName === (fileMeta?.fileName || '安全交底记录.pdf') && a.category === 'disclosure' && !a.supersededAt
              ? { ...a, supersededAt: now() }
              : a
          );
        }
        const newAtt: Attachment = fileMeta
          ? { ...fileMeta, id: generateId(), uploadedAt: now(), category: 'disclosure', version }
          : { id: generateId(), fileName: '安全交底记录.pdf', fileType: 'pdf', fileSize: 0, uploadedAt: now(), category: 'disclosure', version };
        const allApproved = p.approvalNodes.every((n) => n.action === 'approved' || n.role === '专家论证');
        const nodes = allApproved
          ? p.approvalNodes
          : p.approvalNodes.map((n) => n.action === 'pending' ? { ...n, action: 'approved' as const, timestamp: now(), signature: uploaderName, opinion: '审批通过。' } : n);
        return { ...p, approvalNodes: nodes, disclosureUploaded: true, attachments: [...updatedAttachments, newAtt], status: 'disclosed' as PlanStatus, updatedAt: now() };
      }),
    }));
  },
}));
