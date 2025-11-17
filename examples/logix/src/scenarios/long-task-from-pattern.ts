/**
 * @scenario 长任务（Pattern 复用版）
 * @description
 *   与 long-task-pattern.ts 场景共享 `patterns/long-task.ts` 中的状态形状与长任务 Pattern，
 *   但作为另一个 Store 实例挂载，用于验证长任务 Pattern 在多处复用时类型与行为的一致性。
 */

import { Effect } from 'effect'
import * as Logix from '@logix/core'
import {
  LongTaskStateSchema,
  LongTaskActionMap,
  type LongTaskShape,
  type LongTaskState,
  runLongTaskPattern,
} from '../patterns/long-task.js'

// ---------------------------------------------------------------------------
// Logic：与 long-task-pattern.ts 类似，但作为独立 Module 复用同一 Pattern
// Module：复用模式下的长任务模块
export const TaskDef = Logix.Module.make('TaskModule', {
  state: LongTaskStateSchema,
  actions: LongTaskActionMap,
})

export const TaskLogic = TaskDef.logic(($) =>
  Effect.gen(function* () {
    // 借用整棵状态作为 SubscriptionRef，交给 Pattern 持续更新
    const stateRef = $.state.ref()

    // 启动长任务：如果已经在 running，runExhaust 会丢弃后续触发，避免重复启动
    const startEffect = Effect.gen(function* () {
      yield* runLongTaskPattern({ stateRef })
    })

    // 重置任务状态
    const resetEffect = $.state.update(() => ({
      status: 'idle',
      progress: 0,
    }))

    yield* $.onAction('start').runExhaust(startEffect)
    yield* $.onAction('reset').run(resetEffect)
  }),
)

// ---------------------------------------------------------------------------
// Module / Impl / Live：组合 State / Action / Logic 成为另一棵可注入的领域模块
// ---------------------------------------------------------------------------

export const TaskModule = TaskDef.implement({
  initial: {
    status: 'idle',
    progress: 0,
  },
  logics: [TaskLogic],
})

export const TaskImpl = TaskModule.impl
export const TaskLive = TaskImpl.layer
