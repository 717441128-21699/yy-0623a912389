import { create } from 'zustand';
import type { Plan, PlanStatus, User, RiskItem, RiskType, ApprovalNode, Attachment, PlanUpdateData, EngineeringType } from '../types';
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
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvalNodes' | 'modificationLogs' | 'expertReviewDone' | 'disclosureUploaded' | 'attachments'> & { attachments?: Attachment[] }) => string;
  updatePlan: (planId: string, data: PlanUpdateData, modifierName: string) => void;
  addAttachment: (planId: string, fileMeta: Omit<Attachment, 'id' | 'uploadedAt'>) => void;
  removeAttachment: (planId: string, attachmentId: string) => void;
  submitForReview: (planId: string, submitterName: string) => void;
  approveNode: (planId: string, nodeId: string, opinion: string, approverName: string) => void;
  rejectNode: (planId: string, nodeId: string, opinion: string, rejecterName: string) => void;
  uploadExpertReview: (planId: string, uploaderName: string) => void;
  uploadDisclosure: (planId: string, uploaderName: string) => void;
  getCurrentNode: (plan: Plan) => ApprovalNode | undefined;
}

function determineStatus(nodes: ApprovalNode[], needExpert: boolean, expertDone: boolean, disclosed: boolean): PlanStatus {
  if (disclosed) return 'disclosed';
  const pending = nodes.find((n) => n.action === 'pending');
  if (!pending) {
    return disclosed ? 'disclosed' : 'pending_argument';
  }
  if (pending.orderIndex === 0 && nodes.every((n) => n.action === 'pending' || (n.action === 'rejected' && n.orderIndex === 0))) {
    const hasAnyApproved = nodes.some((n) => n.action === 'approved');
    if (!hasAnyApproved) return 'draft';
  }
  if (needExpert && !expertDone) {
    const nextPending = nodes.find((n) => n.action === 'pending');
    if (nextPending?.role === '专家论证') return 'pending_argument';
  }
  return 'pending_review';
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
          id: `r-exp-${plan.id}`,
          planId: plan.id,
          planName: plan.projectName,
          type: 'expert_incomplete',
          typeLabel: '专家论证未完成',
          daysRemaining: days,
          location: plan.location,
          engineeringType: plan.engineeringType,
          severity: days <= 7 ? 'high' : days <= 14 ? 'medium' : 'low',
        });
      }

      if (plan.status === 'pending_review' && days <= 3) {
        risks.push({
          id: `r-ovd-${plan.id}`,
          planId: plan.id,
          planName: plan.projectName,
          type: 'approval_overdue',
          typeLabel: days < 0 ? `审批已超期${Math.abs(days)}天` : `距离开工仅剩${days}天`,
          daysRemaining: days,
          location: plan.location,
          engineeringType: plan.engineeringType,
          severity: days < 0 ? 'high' : 'medium',
        });
      }

      if (
        plan.status !== 'draft' &&
        plan.status !== 'disclosed' &&
        !plan.disclosureUploaded &&
        days <= 5
      ) {
        const alreadyDisclosureRisk = risks.some((r) => r.planId === plan.id && r.type === 'disclosure_missing');
        if (!alreadyDisclosureRisk) {
          risks.push({
            id: `r-dis-${plan.id}`,
            planId: plan.id,
            planName: plan.projectName,
            type: 'disclosure_missing',
            typeLabel: '交底记录未上传',
            daysRemaining: days,
            location: plan.location,
            engineeringType: plan.engineeringType,
            severity: days <= 2 ? 'high' : 'low',
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

  addPlan: (planData) => {
    const newId = generateId();
    const buildApprovalNodes = (needExpert: boolean) => {
      const base: ApprovalNode[] = [
        { id: generateId(), planId: newId, role: '项目技术负责人', userName: planData.authorName, action: 'pending', orderIndex: 0 },
        { id: generateId(), planId: newId, role: '项目经理', userName: '张建国', action: 'pending', orderIndex: 1 },
        { id: generateId(), planId: newId, role: '总监理工程师', userName: '王监理', action: 'pending', orderIndex: 2 },
      ];
      if (needExpert) {
        base.push({ id: generateId(), planId: newId, role: '专家论证', userName: '专家组', action: 'pending', orderIndex: 3 });
        base.push({ id: generateId(), planId: newId, role: '建设单位代表', userName: '陈总', action: 'pending', orderIndex: 4 });
      } else {
        base.push({ id: generateId(), planId: newId, role: '建设单位代表', userName: '陈总', action: 'pending', orderIndex: 3 });
      }
      return base;
    };

    const newPlan: Plan = {
      attachments: [],
      ...planData,
      id: newId,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
      expertReviewDone: false,
      disclosureUploaded: false,
      modificationLogs: [],
      approvalNodes: buildApprovalNodes(planData.needExpertReview),
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

        const newLog = changes.length > 0
          ? {
              id: generateId(),
              planId,
              modifierName,
              description: changes.join('；'),
              timestamp: now(),
            }
          : null;

        let approvalNodes = p.approvalNodes;
        if (typeof data.needExpertReview === 'boolean' && data.needExpertReview !== p.needExpertReview) {
          if (data.needExpertReview) {
            const supervisorIdx = approvalNodes.findIndex((n) => n.role === '总监理工程师');
            const ownerIdx = approvalNodes.findIndex((n) => n.role === '建设单位代表');
            const expertNode: ApprovalNode = {
              id: generateId(),
              planId,
              role: '专家论证',
              userName: '专家组',
              action: 'pending',
              orderIndex: supervisorIdx + 1,
            };
            approvalNodes = [
              ...approvalNodes.slice(0, supervisorIdx + 1),
              expertNode,
              ...approvalNodes.slice(ownerIdx).map((n) => ({ ...n, orderIndex: n.orderIndex + 1 })),
            ];
          } else {
            approvalNodes = approvalNodes
              .filter((n) => n.role !== '专家论证')
              .map((n, i) => ({ ...n, orderIndex: i }));
          }
        }

        return {
          ...p,
          ...data,
          approvalNodes,
          expertReviewDone: typeof data.needExpertReview === 'boolean' && !data.needExpertReview ? false : p.expertReviewDone,
          modificationLogs: newLog ? [...p.modificationLogs, newLog] : p.modificationLogs,
          updatedAt: now(),
        };
      }),
    }));
  },

  addAttachment: (planId, fileMeta) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const newAtt: Attachment = {
          ...fileMeta,
          id: generateId(),
          uploadedAt: now(),
        };
        return {
          ...p,
          attachments: [...p.attachments, newAtt],
          updatedAt: now(),
        };
      }),
    }));
  },

  removeAttachment: (planId, attachmentId) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          attachments: p.attachments.filter((a) => a.id !== attachmentId),
          updatedAt: now(),
        };
      }),
    }));
  },

  submitForReview: (planId, submitterName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const nodes = p.approvalNodes.map((n, i) =>
          i === 0
            ? {
                ...n,
                action: 'approved' as const,
                timestamp: now(),
                signature: submitterName,
                opinion: '方案编制完成，提交审核。',
              }
            : n
        );
        return {
          ...p,
          approvalNodes: nodes,
          status: determineStatus(nodes, p.needExpertReview, p.expertReviewDone, p.disclosureUploaded),
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
          n.id === nodeId
            ? { ...n, action: 'approved' as const, timestamp: now(), signature: approverName, opinion }
            : n
        );
        let expertReviewDone = p.expertReviewDone;
        const approvedNode = p.approvalNodes.find((n) => n.id === nodeId);
        if (approvedNode?.role === '专家论证') expertReviewDone = true;
        return {
          ...p,
          approvalNodes: nodes,
          status: determineStatus(nodes, p.needExpertReview, expertReviewDone, p.disclosureUploaded),
          expertReviewDone,
          updatedAt: now(),
        };
      }),
    }));
  },

  rejectNode: (planId, nodeId, opinion, rejecterName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const rejectedNode = p.approvalNodes.find((n) => n.id === nodeId);
        const rejectOrder = rejectedNode?.orderIndex ?? 0;
        const nodes = p.approvalNodes.map((n) =>
          n.id === nodeId
            ? { ...n, action: 'rejected' as const, timestamp: now(), signature: rejecterName, opinion }
            : n.orderIndex < rejectOrder
            ? n
            : { ...n, action: 'pending' as const, timestamp: undefined, signature: undefined, opinion: undefined }
        );
        const newLog = {
          id: generateId(),
          planId: p.id,
          modifierName: rejecterName,
          description: `${rejectedNode?.role}退回修改：${opinion}`,
          timestamp: now(),
        };
        return {
          ...p,
          approvalNodes: nodes,
          status: 'draft' as PlanStatus,
          modificationLogs: [...p.modificationLogs, newLog],
          updatedAt: now(),
        };
      }),
    }));
  },

  uploadExpertReview: (planId, uploaderName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const expertNode = p.approvalNodes.find((n) => n.role === '专家论证');
        const nodes = expertNode
          ? p.approvalNodes.map((n) =>
              n.id === expertNode.id
                ? { ...n, action: 'approved' as const, timestamp: now(), signature: '专家组', opinion: '专家论证通过。' }
                : n
            )
          : p.approvalNodes;
        return {
          ...p,
          approvalNodes: nodes,
          expertReviewDone: true,
          status: determineStatus(nodes, true, true, p.disclosureUploaded),
          updatedAt: now(),
        };
      }),
    }));
  },

  uploadDisclosure: (planId, uploaderName) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          disclosureUploaded: true,
          status: 'disclosed' as PlanStatus,
          updatedAt: now(),
        };
      }),
    }));
  },
}));
