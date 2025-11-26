import { Duration, Effect, Schema, SubscriptionRef } from 'effect'
import { Store, Logic, Flow } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：长任务场景的 State / Action
// ---------------------------------------------------------------------------

const LongTaskStateSchema = Schema.Struct({
  status: Schema.Literal('idle', 'running', 'done'),
  progress: Schema.Number,
})

const LongTaskActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('start') }),
  Schema.Struct({ _tag: Schema.Literal('reset') }),
)

export type LongTaskShape = Store.Shape<typeof LongTaskStateSchema, typeof LongTaskActionSchema>
export type LongTaskState = Store.StateOf<LongTaskShape>
export type LongTaskAction = Store.ActionOf<LongTaskShape>

// ---------------------------------------------------------------------------
// 长逻辑封装：启动一个持续更新进度的后台任务
// ---------------------------------------------------------------------------

export interface LongTaskEffectInput {
  stateRef: SubscriptionRef.SubscriptionRef<LongTaskState>
}

export const runLongTaskEffect = (input: LongTaskEffectInput) =>
  Effect.gen(function* (_) {
    // 在当前 Scope 内 fork 一个长期运行的 Fiber：
    // - 每秒更新一次进度；
    // - 进度达到 100 后标记为 done。
    yield* Effect.forkScoped(
      Effect.gen(function* (_) {
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

// ---------------------------------------------------------------------------
// Logic：通过 Action 触发长逻辑 Effect，并用 Flow 控制并发语义
// ---------------------------------------------------------------------------

export const LongTaskLogic = Logic.make<LongTaskShape>(({ flow, state }) =>
  Effect.gen(function* (_) {
    const { ref, update } = state
    const start$ = flow.fromAction((a): a is { _tag: 'start' } => a._tag === 'start')
    const reset$ = flow.fromAction((a): a is { _tag: 'reset' } => a._tag === 'reset')

    // 借用整棵状态作为 SubscriptionRef，交给 Pattern 持续更新
    const stateRef = ref()

    // 启动长任务：如果已经在 running，runExhaust 会丢弃后续触发，避免重复启动
    const startEffect = Effect.gen(function* (_) {
      yield* runLongTaskEffect({ stateRef })
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
// Store：组合 State / Action / Logic 成为一棵 Store
// ---------------------------------------------------------------------------

const LongTaskStateLayer = Store.State.make(LongTaskStateSchema, {
  status: 'idle' as const,
  progress: 0,
})

const LongTaskActionLayer = Store.Actions.make(LongTaskActionSchema)

export const LongTaskStore = Store.make<LongTaskShape>(LongTaskStateLayer, LongTaskActionLayer, LongTaskLogic)
