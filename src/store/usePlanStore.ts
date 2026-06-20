import { create } from 'zustand';
import type { Plan, PlanStatus, User, RiskItem, RiskType, ApprovalNode } from '../types';
import { mockPlans, currentUser } from '../data/mockPlans';
import { daysUntil, generateId, now } from '../utils/dateUtils';

interface PlanState {
  plans: Plan[];
  user: User;
  selectedPlanId: string | null;
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
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvalNodes' | 'modificationLogs' | 'expertReviewDone' | 'disclosureUploaded'>) => void;
  submitForReview: (planId: string) => void;
  approveNode: (planId: string, nodeId: string, opinion: string) => void;
  rejectNode: (planId: string, nodeId: string, opinion: string) => void;
  uploadExpertReview: (planId: string) => void;
  uploadDisclosure: (planId: string) => void;
  getCurrentNode: (plan: Plan) => ApprovalNode | undefined;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [...mockPlans],
  user: currentUser,
  selectedPlanId: null,

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
    const newPlan: Plan = {
      ...planData,
      id: generateId(),
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
      expertReviewDone: false,
      disclosureUploaded: false,
      modificationLogs: [],
      approvalNodes: [
        { id: generateId(), planId: '', role: '项目技术负责人', userName: planData.authorName, action: 'pending', orderIndex: 0 },
        { id: generateId(), planId: '', role: '项目经理', userName: '张建国', action: 'pending', orderIndex: 1 },
        { id: generateId(), planId: '', role: '总监理工程师', userName: '王监理', action: 'pending', orderIndex: 2 },
        ...(planData.needExpertReview ? [{ id: generateId(), planId: '', role: '专家论证' as const, userName: '专家组', action: 'pending' as const, orderIndex: 3 }] : []),
        { id: generateId(), planId: '', role: '建设单位代表', userName: '陈总', action: 'pending', orderIndex: planData.needExpertReview ? 4 : 3 },
      ],
    };
    set((state) => ({ plans: [...state.plans, newPlan] }));
  },

  submitForReview: (planId) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const updated = { ...p, status: 'pending_review' as PlanStatus, updatedAt: now() };
        if (updated.approvalNodes.length > 0) {
          updated.approvalNodes = updated.approvalNodes.map((n, i) =>
            i === 0 ? { ...n, action: 'approved' as const, timestamp: now(), signature: p.authorName, opinion: '方案编制完成，提交审核。' } : n
          );
        }
        return updated;
      }),
    }));
  },

  getCurrentNode: (plan) => {
    return plan.approvalNodes.find((n) => n.action === 'pending');
  },

  approveNode: (planId, nodeId, opinion) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const nodes = p.approvalNodes.map((n) =>
          n.id === nodeId
            ? { ...n, action: 'approved' as const, timestamp: now(), signature: n.userName, opinion }
            : n
        );
        const pendingExists = nodes.some((n) => n.action === 'pending');
        let status = p.status;
        let expertReviewDone = p.expertReviewDone;
        const approvedNode = p.approvalNodes.find((n) => n.id === nodeId);

        if (approvedNode?.role === '专家论证') {
          expertReviewDone = true;
        }

        if (!pendingExists) {
          status = p.disclosureUploaded ? 'disclosed' : 'pending_argument';
        } else if (p.needExpertReview && !expertReviewDone) {
          const nextPending = nodes.find((n) => n.action === 'pending');
          if (nextPending?.role === '专家论证') {
            status = 'pending_argument';
          }
        }

        return { ...p, approvalNodes: nodes, status, expertReviewDone, updatedAt: now() };
      }),
    }));
  },

  rejectNode: (planId, nodeId, opinion) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        const rejectedNode = p.approvalNodes.find((n) => n.id === nodeId);
        const nodes = p.approvalNodes.map((n) =>
          n.id === nodeId
            ? { ...n, action: 'rejected' as const, timestamp: now(), signature: n.userName, opinion }
            : n.orderIndex < (rejectedNode?.orderIndex ?? 0)
            ? n
            : { ...n, action: 'pending' as const, timestamp: undefined, signature: undefined, opinion: undefined }
        );
        const newLog = {
          id: generateId(),
          planId: p.id,
          modifierName: rejectedNode?.userName || '未知',
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

  uploadExpertReview: (planId) => {
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
        return { ...p, approvalNodes: nodes, expertReviewDone: true, updatedAt: now() };
      }),
    }));
  },

  uploadDisclosure: (planId) => {
    set((state) => ({
      plans: state.plans.map((p) => {
        if (p.id !== planId) return p;
        return { ...p, disclosureUploaded: true, status: 'disclosed' as PlanStatus, updatedAt: now() };
      }),
    }));
  },
}));
