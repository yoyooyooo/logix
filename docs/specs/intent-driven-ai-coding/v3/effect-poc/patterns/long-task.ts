/**
 * @pattern 长任务通用模式 (Long Task Pattern)
 * @description
 *   将“forkScoped 长任务 + 进度更新”的逻辑抽离为可复用 Pattern：
 *   - LongTaskState / LongTaskAction 定义长任务的最小状态形状；
 *   - runLongTaskPattern 通过 SubscriptionRef 持续更新进度与状态。
 */

import { Duration, Effect, Schema, SubscriptionRef } from 'effect'
import { Store } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：长任务场景的 State / Action
// ---------------------------------------------------------------------------

export const LongTaskStateSchema = Schema.Struct({
  status: Schema.Literal('idle', 'running', 'done'),
  progress: Schema.Number,
})

export const LongTaskActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('start') }),
  Schema.Struct({ _tag: Schema.Literal('reset') }),
)

export type LongTaskShape = Store.Shape<typeof LongTaskStateSchema, typeof LongTaskActionSchema>
export type LongTaskState = Store.StateOf<LongTaskShape>
export type LongTaskAction = Store.ActionOf<LongTaskShape>

// ---------------------------------------------------------------------------
// 长逻辑封装：启动一个持续更新进度的后台任务
// ---------------------------------------------------------------------------

export interface LongTaskPatternInput {
  stateRef: SubscriptionRef.SubscriptionRef<LongTaskState>
}

export const runLongTaskPattern = (input: LongTaskPatternInput) =>
  Effect.gen(function* () {
    // 在当前 Scope 内 fork 一个长期运行的 Fiber：
    // - 每秒更新一次进度；
    // - 进度达到 100 后标记为 done。
    yield* Effect.forkScoped(
      Effect.gen(function* () {
        let progress = 0

        // 初始标记为 running
        yield* SubscriptionRef.update(input.stateRef, (prev) => ({
          ...prev,
          status: 'running' as LongTaskState['status'],
          progress,
        }))

        while (progress < 100) {
          // 模拟长任务：每秒推进 20%
          yield* Effect.sleep(Duration.seconds(1))
          progress += 20

          yield* SubscriptionRef.update(input.stateRef, (prev) => ({
            ...prev,
            status: (progress >= 100 ? 'done' : 'running') as LongTaskState['status'],
            progress,
          }))
        }
      }),
    )
  })
