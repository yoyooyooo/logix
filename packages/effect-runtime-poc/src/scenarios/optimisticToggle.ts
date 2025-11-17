import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

export interface ToggleService {
  toggleFlag: (input: { id: string; nextValue: boolean }) => Promise<void>
}

export interface OptimisticToggleEnv extends BasePlatformEnv {
  ToggleService: ToggleService
}

// 乐观切换开关：调用方在 UI 层先更新本地 state，再调用此 Flow；
// 若失败，可根据返回的错误信息在 UI 层恢复原值。
export const toggleFlagFlow =
  (id: string, nextValue: boolean): Fx<OptimisticToggleEnv, unknown, void> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<OptimisticToggleEnv>()
    env.logger.info('toggleFlag.start', { id, nextValue })
    try {
      yield* Effect.promise(() =>
        env.ToggleService.toggleFlag({
          id,
          nextValue,
        }),
      )
      env.logger.info('toggleFlag.done', { id, nextValue })
    } catch (error) {
      env.logger.error('toggleFlag.failed', { id, nextValue, error })
      // 这里不直接恢复 UI，由调用方根据错误决定是否回滚。
      throw error
    }
  })

