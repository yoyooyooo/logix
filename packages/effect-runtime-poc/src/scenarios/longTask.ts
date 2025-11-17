import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

export interface LongTaskService {
  startTask: (payload: Record<string, unknown>) => Promise<{ taskId: string }>
  getStatus: (taskId: string) => Promise<{ status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' }>
}

export interface LongTaskEnv extends BasePlatformEnv {
  LongTaskService: LongTaskService
}

export const startAndPollLongTaskFlow: Fx<LongTaskEnv, never, void> = Effect.gen(function* () {
  const env = yield* Effect.context<LongTaskEnv>()

  env.logger.info('longTask.start', {})
  const { taskId } = yield* Effect.promise(() =>
    env.LongTaskService.startTask({}),
  )

  // 极简轮询示意，真实实现应考虑超时/退避/取消等
  // 这些策略在正式实现中应来自 ConstraintIntent + Layer。
  let status = yield* Effect.promise(() =>
    env.LongTaskService.getStatus(taskId),
  )
  while (status.status === 'PENDING' || status.status === 'RUNNING') {
    // 这里仍然用 setTimeout 模拟；未来可替换为基于 Effect.Schedule 的方案。
    yield* Effect.async<void>(resume => {
      const id = setTimeout(() => {
        clearTimeout(id)
        resume(Effect.succeed(undefined))
      }, 1000)
    })
    status = yield* Effect.promise(() =>
      env.LongTaskService.getStatus(taskId),
    )
  }

  env.logger.info('longTask.done', { taskId, status: status.status })
})

