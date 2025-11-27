import { Config, Data, Duration, Effect, Schema } from 'effect'
import { Store, Logic } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// 1. Schema → Shape：Job 场景的 State / Action
// ---------------------------------------------------------------------------

const JobStateSchema = Schema.Struct({
  jobId: Schema.String,
  status: Schema.Literal('idle', 'running', 'success', 'error'),
  errorMessage: Schema.optional(Schema.String),
})

const JobActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('run') }),
  Schema.Struct({ _tag: Schema.Literal('reset') }),
)

export type JobShape = Store.Shape<typeof JobStateSchema, typeof JobActionSchema>
export type JobState = Store.StateOf<JobShape>
export type JobAction = Store.ActionOf<JobShape>

// ---------------------------------------------------------------------------
// 2. 错误建模：Tagged Error（对齐 EffectPatterns 推荐）
// ---------------------------------------------------------------------------

export class JobFailedError extends Data.TaggedError('JobFailedError')<{
  readonly jobId: string
  readonly reason: string
}> {}

// ---------------------------------------------------------------------------
// 3. Service 模式：Effect.Service + Config 读取
// ---------------------------------------------------------------------------

export class JobRunner extends Effect.Service<JobRunner>()('JobRunner', {
  effect: Effect.gen(function* (_) {
    // 从 Config 中读取超时时间，带默认值
    const timeoutMs = yield* Config.number('JOB_TIMEOUT_MS').pipe(Config.withDefault(1000))

    const runJob = (input: { id: string }) =>
      Effect.gen(function* (_) {
        // 简单示意：id 为 "fail" 时触发领域错误
        if (input.id === 'fail') {
          return yield* Effect.fail(
            new JobFailedError({
              jobId: input.id,
              reason: 'Simulated failure for demo',
            }),
          )
        }

        // 正常情况下模拟一个耗时任务
        yield* Effect.sleep(Duration.millis(timeoutMs))
      })

    return {
      runJob,
    }
  }),
}) {}

// ---------------------------------------------------------------------------
// 4. Logic：通过 Flow 调用 Service，显式处理 E 通道
// ---------------------------------------------------------------------------

const $ = Logic.forShape<JobShape, JobRunner>()

export const JobLogic = Logic.make<JobShape, JobRunner>(
  Effect.gen(function* () {
    const run$ = $.flow.fromAction((a): a is { _tag: 'run' } => a._tag === 'run')
    const reset$ = $.flow.fromAction((a): a is { _tag: 'reset' } => a._tag === 'reset')

    const runEffect = Effect.gen(function* () {
      const runner = yield* $.services(JobRunner)
      const current = yield* $.state.read
      const jobId = current.jobId

      // 进入 running 状态，清空错误
      yield* $.state.update((prev) => ({
        ...prev,
        status: 'running',
        errorMessage: undefined,
      }))

      // 调用 Service，显式处理 JobFailedError
      yield* runner.runJob({ id: jobId }).pipe(
        Effect.catchTag('JobFailedError', (err) =>
          $.state.update((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: err.reason,
          })),
        ),
      )

      // 如果没有失败，则标记为 success
      const latest = yield* $.state.read
      if (latest.status === 'running') {
        yield* $.state.update((prev) => ({
          ...prev,
          status: 'success',
        }))
      }
    })

    const resetEffect = $.state.update((prev) => ({
      ...prev,
      status: 'idle',
      errorMessage: undefined,
    }))

    yield* Effect.all([
      run$.pipe($.flow.runExhaust(runEffect)),
      reset$.pipe($.flow.run(resetEffect)),
    ])
  }),
)

// ---------------------------------------------------------------------------
// 5. Store：组合 State / Action / Logic
// ---------------------------------------------------------------------------

const JobStateLayer = Store.State.make(JobStateSchema, {
  jobId: '',
  status: 'idle',
  errorMessage: undefined,
})

const JobActionLayer = Store.Actions.make(JobActionSchema)

export const JobStore = Store.make<JobShape>(JobStateLayer, JobActionLayer, JobLogic)
