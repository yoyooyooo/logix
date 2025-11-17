import type { Effect } from '../../effect-poc/shared/effect-types'
import type { ApprovalDecision, ApprovalEnv, ApprovalContext } from './env'

export const approvalFlow =
  (ctx: ApprovalContext, decision: ApprovalDecision): Effect<ApprovalEnv, never, void> =>
  async env => {
    env.logger.info('approvalFlow.start', { taskId: ctx.taskId, decision })

    await env.ApprovalService.decide({ ...ctx, decision })
    await env.AuditService.record({ taskId: ctx.taskId, decision, comment: ctx.comment })
    await env.TaskService.refreshList()

    env.logger.info('approvalFlow.done', { taskId: ctx.taskId, decision })
  }

