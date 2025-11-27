import { Effect } from 'effect'
import { Store, Logic } from '../shared/logix-v3-core'
import {
  LongTaskStateSchema,
  LongTaskActionSchema,
  type LongTaskShape,
  type LongTaskState,
  type LongTaskAction,
  runLongTaskPattern,
} from '../patterns/long-task'

// ---------------------------------------------------------------------------
// Logic：通过 Action 触发长逻辑 Effect，并用 Flow 控制并发语义
// ---------------------------------------------------------------------------

const $ = Logic.forShape<LongTaskShape>()

export const LongTaskLogic = Logic.make<LongTaskShape>(
  Effect.gen(function* () {
    const start$ = $.flow.fromAction((a): a is { _tag: 'start' } => a._tag === 'start')
    const reset$ = $.flow.fromAction((a): a is { _tag: 'reset' } => a._tag === 'reset')

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

    yield* Effect.all([
      start$.pipe($.flow.runExhaust(startEffect)),
      reset$.pipe($.flow.run(resetEffect)),
    ])
  }),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic 成为一棵 Store
// ---------------------------------------------------------------------------

const LongTaskStateLayer = Store.State.make(LongTaskStateSchema, {
  status: 'idle',
  progress: 0,
})

const LongTaskActionLayer = Store.Actions.make(LongTaskActionSchema)

export const LongTaskStore = Store.make<LongTaskShape>(LongTaskStateLayer, LongTaskActionLayer, LongTaskLogic)
