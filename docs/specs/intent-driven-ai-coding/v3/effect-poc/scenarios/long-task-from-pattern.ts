/**
 * @scenario 长任务（Pattern 复用版）
 * @description
 *   与 long-task-pattern.ts 场景共享 `patterns/long-task.ts` 中的状态形状与长任务 Pattern，
 *   但作为另一个 Store 实例挂载，用于验证长任务 Pattern 在多处复用时类型与行为的一致性。
 */

import { Effect } from 'effect'
import { Store, Logic } from '../shared/logix-v3-core'
import {
  LongTaskStateSchema,
  LongTaskActionSchema,
  type LongTaskShape,
  type LongTaskState,
  runLongTaskPattern,
} from '../patterns/long-task'

// ---------------------------------------------------------------------------
// Logic：与 long-task-pattern.ts 类似，但作为独立 Store 复用同一 Pattern
// ---------------------------------------------------------------------------

export const LongTaskLogicFromPattern = Logic.make<LongTaskShape>(({ flow, state }) =>
  Effect.gen(function* () {
    const { ref, update } = state
    const start$ = flow.fromAction((a): a is { _tag: 'start' } => a._tag === 'start')
    const reset$ = flow.fromAction((a): a is { _tag: 'reset' } => a._tag === 'reset')

    // 借用整棵状态作为 SubscriptionRef，交给 Pattern 持续更新
    const stateRef = ref()

    // 启动长任务：如果已经在 running，runExhaust 会丢弃后续触发，避免重复启动
    const startEffect = Effect.gen(function* () {
      yield* runLongTaskPattern({ stateRef })
    })

    // 重置任务状态
    const resetEffect = update(() => ({
      status: 'idle' as LongTaskState['status'],
      progress: 0,
    }))

    yield* Effect.all([start$.pipe(flow.runExhaust(startEffect)), reset$.pipe(flow.run(resetEffect))])
  }),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic 成为另一棵 Store
// ---------------------------------------------------------------------------

const LongTaskStateLayerFromPattern = Store.State.make(LongTaskStateSchema, {
  status: 'idle' as const,
  progress: 0,
})

const LongTaskActionLayerFromPattern = Store.Actions.make(LongTaskActionSchema)

export const LongTaskStoreFromPattern = Store.make<LongTaskShape>(
  LongTaskStateLayerFromPattern,
  LongTaskActionLayerFromPattern,
  LongTaskLogicFromPattern,
)

