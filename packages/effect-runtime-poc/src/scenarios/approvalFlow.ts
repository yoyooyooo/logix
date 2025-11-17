import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

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

export const approvalFlow =
  (ctx: ApprovalContext, decision: ApprovalDecision): Fx<ApprovalEnv, never, void> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<ApprovalEnv>()
    env.logger.info('approvalFlow.start', { taskId: ctx.taskId, decision })

    yield* Effect.promise(() => env.ApprovalService.decide({ ...ctx, decision }))
    yield* Effect.promise(() =>
      env.AuditService.record({ taskId: ctx.taskId, decision, comment: ctx.comment }),
    )
    yield* Effect.promise(() => env.TaskService.refreshList())

    env.logger.info('approvalFlow.done', { taskId: ctx.taskId, decision })
  })

