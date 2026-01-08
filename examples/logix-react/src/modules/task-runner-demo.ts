import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const TaskRunnerDemoStateSchema = Schema.Struct({
  latest: Schema.Struct({
    loading: Schema.Boolean,
    lastRequestId: Schema.Number,
    lastResult: Schema.Number,
  }),
  exhaust: Schema.Struct({
    loading: Schema.Boolean,
    submitted: Schema.Number,
  }),
  logs: Schema.Array(Schema.String),
})

export type TaskRunnerDemoState = Schema.Schema.Type<typeof TaskRunnerDemoStateSchema>

export const TaskRunnerDemoActions = {
  refresh: Schema.Number,
  submit: Schema.Void,
  reset: Schema.Void,
}

export const TaskRunnerDemoDef = Logix.Module.make('TaskRunnerDemoModule', {
  state: TaskRunnerDemoStateSchema,
  actions: TaskRunnerDemoActions,
})

const initialState: TaskRunnerDemoState = {
  latest: {
    loading: false,
    lastRequestId: 0,
    lastResult: 0,
  },
  exhaust: {
    loading: false,
    submitted: 0,
  },
  logs: [],
}

export const TaskRunnerDemoLogic = TaskRunnerDemoDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    // runLatestTask：新触发会取消旧 task，只写回最新一次结果
    const latest = $.onAction('refresh').runLatestTask({
      pending: (a: any) =>
        $.state.update((s) => ({
          ...s,
          latest: {
            ...s.latest,
            loading: true,
            lastRequestId: a.payload,
          },
          logs: [...s.logs, `latest.pending:${a.payload}`],
        })),
      effect: (a: any) => Effect.sleep('700 millis').pipe(Effect.as(a.payload * 10)),
      success: (result, a: any) =>
        $.state.update((s) => ({
          ...s,
          latest: {
            ...s.latest,
            loading: false,
            lastRequestId: a.payload,
            lastResult: result,
          },
          logs: [...s.logs, `latest.success:${a.payload}:${result}`],
        })),
      failure: (cause, a: any) =>
        $.state.update((s) => ({
          ...s,
          latest: {
            ...s.latest,
            loading: false,
          },
          logs: [...s.logs, `latest.failure:${a.payload}:${String(cause)}`],
        })),
    })

    // runExhaustTask：busy 时忽略后续触发（被忽略的不会产生 pending）
    const exhaust = $.onAction('submit').runExhaustTask({
      pending: () =>
        $.state.update((s) => ({
          ...s,
          exhaust: { ...s.exhaust, loading: true },
          logs: [...s.logs, 'exhaust.pending'],
        })),
      effect: () => Effect.sleep('900 millis').pipe(Effect.as(1)),
      success: () =>
        $.state.update((s) => ({
          ...s,
          exhaust: {
            loading: false,
            submitted: s.exhaust.submitted + 1,
          },
          logs: [...s.logs, 'exhaust.success'],
        })),
      failure: (cause) =>
        $.state.update((s) => ({
          ...s,
          exhaust: { ...s.exhaust, loading: false },
          logs: [...s.logs, `exhaust.failure:${String(cause)}`],
        })),
    })

    const reset = $.onAction('reset').run($.state.update(() => initialState))

    // watcher 合并启动
    yield* Effect.all([latest, exhaust, reset], { concurrency: 'unbounded' })
  }),
}))

export const TaskRunnerDemoModule = TaskRunnerDemoDef.implement({
  initial: initialState,
  logics: [TaskRunnerDemoLogic],
})
