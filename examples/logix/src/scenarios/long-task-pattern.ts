import { Effect, Scope } from 'effect'
import * as Logix from '@logixjs/core'
import { programLayer } from '../runtime/programLayer.js'
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

export const LongTask = Logix.Module.make('LongTaskModule', {
  state: LongTaskStateSchema,
  actions: LongTaskActionMap,
})

// Logic：通过 Action 触发长逻辑 Effect，并用运行策略控制并发语义
// ---------------------------------------------------------------------------

export const LongTaskLogic = LongTask.logic<Scope.Scope>('long-task-logic', ($) =>
  Effect.gen(function* () {
    // 启动长任务：如果已经在 running，runExhaust 会丢弃后续触发，避免重复启动
    const startEffect = Effect.gen(function* () {
      yield* runLongTaskPattern({
        updateState: $.state.update,
      })
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
// Program / Layer：组合 State / Action / Logic 成为一棵可注入的领域程序
// ---------------------------------------------------------------------------

export const LongTaskProgram = Logix.Program.make(LongTask, {
  initial: {
    status: 'idle',
    progress: 0,
  } as LongTaskState,
  logics: [LongTaskLogic],
})

export const LongTaskLayer = programLayer(LongTaskProgram)
