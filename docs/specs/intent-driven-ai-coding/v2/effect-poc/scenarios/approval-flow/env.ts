import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export type ApprovalDecision = 'APPROVE' | 'REJECT'

export interface ApprovalContext {
  taskId: string
  comment?: string
}

export interface ApprovalService {
  decide: (input: ApprovalContext & { decision: ApprovalDecision }) => Promise<void>
}

export interface TaskService {
  refreshList: () => Promise<void>
}

export interface AuditService {
  record: (input: { taskId: string; decision: ApprovalDecision; comment?: string }) => Promise<void>
}

export interface ApprovalEnv extends BasePlatformEnv {
  ApprovalService: ApprovalService
  TaskService: TaskService
  AuditService: AuditService
}

