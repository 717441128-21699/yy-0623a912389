export type PlanStatus = 'draft' | 'pending_review' | 'pending_argument' | 'disclosed';

export type EngineeringType = '深基坑' | '高支模' | '起重吊装' | '脚手架' | '拆除爆破' | '其他';

export type ApprovalRole = '项目技术负责人' | '项目经理' | '总监理工程师' | '建设单位代表' | '专家论证';

export type ApprovalAction = 'pending' | 'approved' | 'rejected';

export type UserRole = 'tech_lead' | 'project_manager' | 'supervisor' | 'owner_rep';

export interface Plan {
  id: string;
  projectName: string;
  engineeringType: EngineeringType;
  location: string;
  scaleParams: string;
  planStartDate: string;
  actualStartDate?: string;
  status: PlanStatus;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  needExpertReview: boolean;
  expertReviewDone: boolean;
  disclosureUploaded: boolean;
  attachments: Attachment[];
  approvalNodes: ApprovalNode[];
  modificationLogs: ModificationLog[];
}

export interface ApprovalNode {
  id: string;
  planId: string;
  role: ApprovalRole;
  userName: string;
  action: ApprovalAction;
  opinion?: string;
  signature?: string;
  timestamp?: string;
  orderIndex: number;
}

export interface ModificationLog {
  id: string;
  planId: string;
  modifierName: string;
  description: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roleName: string;
  organization: string;
}

export type RiskType = 'expert_incomplete' | 'approval_overdue' | 'disclosure_missing';

export interface RiskItem {
  id: string;
  planId: string;
  planName: string;
  type: RiskType;
  typeLabel: string;
  daysRemaining: number;
  location: string;
  engineeringType: EngineeringType;
  severity: 'high' | 'medium' | 'low';
}
