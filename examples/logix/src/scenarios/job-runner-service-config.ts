import { Config, Data, Duration, Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import { programLayer } from '../runtime/programLayer.js'

// ---------------------------------------------------------------------------
// 1. Schema → Shape：Job 场景的 State / Action
// ---------------------------------------------------------------------------

const JobStateSchema = Schema.Struct({
  jobId: Schema.String,
  status: Schema.Literals(['idle', 'running', 'success', 'error']),
  errorMessage: Schema.optional(Schema.String),
})

const JobActionMap = {
  run: Schema.Void,
  reset: Schema.Void,
}

export type JobShape = Logix.Module.Shape<typeof JobStateSchema, typeof JobActionMap>
export type JobState = Logix.Module.StateOf<JobShape>
export type JobAction = Logix.Module.ActionOf<JobShape>

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

export class JobRunner extends ServiceMap.Service<
  JobRunner,
  { readonly runJob: (input: { id: string }) => Effect.Effect<void, JobFailedError> }
>()('JobRunner') {}

export const JobRunnerLive = Layer.effect(
  JobRunner,
  Effect.gen(function* () {
    const timeoutMs = yield* Config.number('JOB_TIMEOUT_MS').pipe(Config.withDefault(1000))

    const runJob = (input: { id: string }): Effect.Effect<void, JobFailedError> =>
      Effect.gen(function* () {
        if (input.id === 'fail') {
          return yield* Effect.fail(
            new JobFailedError({
              jobId: input.id,
              reason: 'Simulated failure for demo',
            }),
          )
        }

        yield* Effect.sleep(Duration.millis(timeoutMs))
      })

    return {
      runJob,
    }
  }),
)

// ---------------------------------------------------------------------------
// 4. Module：定义 Job 模块
// ---------------------------------------------------------------------------

export const Job = Logix.Module.make('JobModule', {
  state: JobStateSchema,
  actions: JobActionMap,
})

// 5. Logic：通过 Module.logic 调用 Service，显式处理 E 通道
// ---------------------------------------------------------------------------

export const JobLogic = Job.logic<JobRunner>('job-logic', ($: Logix.Module.BoundApi<JobShape, JobRunner>) =>
  Effect.gen(function* () {
      const runEffect = Effect.gen(function* () {
      const runner = yield* $.use(JobRunner)
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
        Effect.catchTag('JobFailedError', (err: JobFailedError) =>
          $.state.update((prev: JobState) => ({
            ...prev,
            status: 'error',
            errorMessage: err.reason,
          })),
        ),
      )

      // 如果没有失败，则标记为 success
      const latest = yield* $.state.read
      if (latest.status === 'running') {
        yield* $.state.update((prev: JobState) => ({
          ...prev,
          status: 'success',
        }))
      }
    })

    const resetEffect = $.state.update((prev: JobState) => ({
      ...prev,
      status: 'idle',
      errorMessage: undefined,
    }))

    yield* $.onAction('run').runExhaust(runEffect)
    yield* $.onAction('reset').run(resetEffect)
  }),
)

// ---------------------------------------------------------------------------
// 6. Program / Layer：组合 State / Action / Logic
// ---------------------------------------------------------------------------

export const JobProgram = Logix.Program.make(Job, {
  initial: {
    jobId: '',
    status: 'idle',
    errorMessage: undefined,
  } as JobState,
  logics: [JobLogic],
})

export const JobLayer = programLayer(JobProgram)
