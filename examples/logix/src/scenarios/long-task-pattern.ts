import { Effect, Scope } from 'effect'
import * as Logix from '@logix/core'
import {
  LongTaskStateSchema,
  LongTaskActionMap,
  type LongTaskShape,
  type LongTaskState,
  type LongTaskAction,
  runLongTaskPattern,
} from '../patterns/long-task.js'

// ---------------------------------------------------------------------------
// Module：定义长任务模块
// ---------------------------------------------------------------------------

export const LongTaskDef = Logix.Module.make('LongTaskModule', {
  state: LongTaskStateSchema,
  actions: LongTaskActionMap,
})

// Logic：通过 Action 触发长逻辑 Effect，并用 Flow 控制并发语义（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const LongTaskLogic = LongTaskDef.logic<Scope.Scope>(($) =>
  Effect.gen(function* () {
    // 借用整棵状态作为 SubscriptionRef，交给 Pattern 持续更新
    const stateRef = $.state.ref()

    // 启动长任务：如果已经在 running，runExhaust 会丢弃后续触发，避免重复启动
    const startEffect = Effect.gen(function* (_) {
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
// Module / Impl / Live：组合 State / Action / Logic 成为一棵可注入的领域模块
// ---------------------------------------------------------------------------

export const LongTaskModule = LongTaskDef.implement<Scope.Scope>({
  initial: {
    status: 'idle',
    progress: 0,
  },
  logics: [LongTaskLogic],
})

export const LongTaskImpl = LongTaskModule.impl
export const LongTaskLive = LongTaskImpl.layer
