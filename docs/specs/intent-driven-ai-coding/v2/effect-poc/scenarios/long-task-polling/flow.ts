import type { Effect } from '../../effect-poc/shared/effect-types'
import type { LongTaskEnv } from './env'

export const startAndPollLongTaskFlow: Effect<LongTaskEnv, never, void> = async env => {
  env.logger.info('longTask.start', {})
  const { taskId } = await env.LongTaskService.startTask({})

  // 极简轮询示意，真实实现应考虑超时/退避/取消等
  // 这些策略在正式实现中应来自 ConstraintIntent + Layer。
  let status = await env.LongTaskService.getStatus(taskId)
  while (status.status === 'PENDING' || status.status === 'RUNNING') {
    await new Promise(r => setTimeout(r, 1000))
    status = await env.LongTaskService.getStatus(taskId)
  }

  env.logger.info('longTask.done', { taskId, status: status.status })
}

