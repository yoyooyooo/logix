/**
 * @scenario Workflow Codegen IR（075）
 * @description
 *   演示 Workflow 作为“出码层（IR DSL）”的最小闭环：
 *   - onAction('submit') → call(service) → success/failure → dispatch
 *   - delay → dispatch（timer 可取消；tickSeq 可归因）
 *   - reason 演示：
 *     - `workflow.cancel` reason=`latest`（latest 并发策略）
 *     - `workflow.drop` reason=`exhaust`（exhaust 并发策略）
 *     - `workflow.timer.cancel` reason=`interrupt`（run 被 interrupt 时取消 timer）
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/workflow-codegen-ir.ts
 */
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'

class SubmitPort extends Context.Tag('WorkflowDemo/SubmitPort')<
  SubmitPort,
  (input: { readonly userId: string; readonly shouldFail: boolean }) => Effect.Effect<void, Error, never>
>() {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getEventData = (event: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(event)) return undefined
  const data = event.data
  return isRecord(data) ? data : undefined
}

const getEventName = (event: unknown): string | undefined => {
  const data = getEventData(event)
  if (!data) return undefined
  const name = data.name
  return typeof name === 'string' && name.length > 0 ? name : undefined
}

const getEventMeta = (event: unknown): Record<string, unknown> | undefined => {
  const data = getEventData(event)
  if (!data) return undefined
  const meta = data.meta
  return isRecord(meta) ? meta : undefined
}

const main = Effect.gen(function* () {
  const State = Schema.Struct({
    latestOk: Schema.Number,
    latestBad: Schema.Number,
    latestAfterDelay: Schema.Number,
    exhaustAfterDelay: Schema.Number,
  })
  const SubmitPayload = Schema.Struct({ userId: Schema.String, shouldFail: Schema.Boolean })

  const M = Logix.Module.make('Workflow075.Demo', {
    state: State,
    actions: {
      submitLatest: SubmitPayload,
      submitExhaust: SubmitPayload,
      latestOk: Schema.Void,
      latestBad: Schema.Void,
      latestAfterDelay: Schema.Void,
      exhaustAfterDelay: Schema.Void,
    },
    reducers: {
      latestOk: Logix.Module.Reducer.mutate((draft) => {
        draft.latestOk += 1
      }),
      latestBad: Logix.Module.Reducer.mutate((draft) => {
        draft.latestBad += 1
      }),
      latestAfterDelay: Logix.Module.Reducer.mutate((draft) => {
        draft.latestAfterDelay += 1
      }),
      exhaustAfterDelay: Logix.Module.Reducer.mutate((draft) => {
        draft.exhaustAfterDelay += 1
      }),
    },
  })

  const programLatest = Logix.Workflow.make({
    localId: 'submitLatest',
    trigger: Logix.Workflow.onAction('submitLatest'),
    policy: { concurrency: 'latest' },
    steps: [
      Logix.Workflow.call({
        key: 'call.submit',
        service: SubmitPort,
        input: Logix.Workflow.object({
          userId: Logix.Workflow.payloadPath('/userId'),
          shouldFail: Logix.Workflow.payloadPath('/shouldFail'),
        }),
        onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.ok', actionTag: 'latestOk' })],
        onFailure: [Logix.Workflow.dispatch({ key: 'dispatch.bad', actionTag: 'latestBad' })],
      }),
      Logix.Workflow.delay({ key: 'delay.after', ms: 80 }),
      Logix.Workflow.dispatch({ key: 'dispatch.afterDelay', actionTag: 'latestAfterDelay' }),
    ],
  })

  const programExhaust = Logix.Workflow.make({
    localId: 'submitExhaust',
    trigger: Logix.Workflow.onAction('submitExhaust'),
    policy: { concurrency: 'exhaust' },
    steps: [
      Logix.Workflow.delay({ key: 'delay.busy', ms: 80 }),
      Logix.Workflow.dispatch({ key: 'dispatch.afterDelay', actionTag: 'exhaustAfterDelay' }),
    ],
  })

  const impl = M.withWorkflow(programLatest)
    .withWorkflow(programExhaust)
    .implement({
      initial: { latestOk: 0, latestBad: 0, latestAfterDelay: 0, exhaustAfterDelay: 0 },
    })
  const ring = Logix.Debug.makeRingBufferSink(512)

  const runtime = Logix.Runtime.make(impl, {
    devtools: { bufferSize: 512, diagnosticsLevel: 'full' },
    layer: Layer.mergeAll(
      Logix.Debug.replace([ring.sink]),
      Layer.succeed(SubmitPort, (input) => (input.shouldFail ? Effect.fail(new Error('boom')) : Effect.void)),
    ),
    label: 'examples:workflow:075',
  })

  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const rt = yield* M.tag

          // ---- latest: cancel + timer.cancel(interrupt) ----
          yield* rt.dispatch({ _tag: 'submitLatest', payload: { userId: 'u1', shouldFail: false } })
          yield* Effect.sleep('15 millis')
          yield* rt.dispatch({ _tag: 'submitLatest', payload: { userId: 'u2', shouldFail: true } })
          yield* Effect.sleep('120 millis')

          // ---- exhaust: drop(exhaust) ----
          yield* rt.dispatch({ _tag: 'submitExhaust', payload: { userId: 'u3', shouldFail: false } })
          yield* Effect.sleep('5 millis')
          yield* rt.dispatch({ _tag: 'submitExhaust', payload: { userId: 'u4', shouldFail: false } })
          yield* Effect.sleep('120 millis')

          // eslint-disable-next-line no-console
          console.log('[State]', yield* rt.getState)

          const trace = ring
            .getSnapshot()
            .filter((e) => e.type === 'trace:effectop')
            .filter((e) => (getEventName(e) ?? '').startsWith('workflow.'))

          const ticks = ring
            .getSnapshot()
            .filter((e) => e.type === 'trace:tick')
            .map((e) => {
              const data = getEventData(e)
              const schedule = isRecord(data) && isRecord(data.schedule) ? data.schedule : undefined
              return {
                tickSeq: isRecord(data) ? data.tickSeq : undefined,
                phase: isRecord(data) ? data.phase : undefined,
                startedAs: schedule?.startedAs,
                forcedMacrotask: schedule?.forcedMacrotask,
                scheduleReason: schedule?.reason,
                timestampMs: isRecord(data) ? data.timestampMs : undefined,
              } as const
            })

          // eslint-disable-next-line no-console
          console.log('[Tick trace]', ticks)

          // eslint-disable-next-line no-console
          console.log(
            '[Workflow trace]',
            trace.map((e) => {
              const meta = getEventMeta(e)
              return {
                name: getEventName(e),
                programId: meta?.programId,
                runId: meta?.runId,
                tickSeq: meta?.tickSeq,
                stepKey: meta?.stepKey,
                reason: meta?.reason,
              } as const
            }),
          )
        }),
      ),
    )
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
