/**
 * @scenario Workflow Codegen IR（075）
 * @description
 *   演示 Workflow 作为“出码层（IR DSL）”的最小闭环：
 *   - onAction('submit') → call(service) → success/failure → dispatch
 *   - delay → dispatch（timer 可取消；tickSeq 可归因）
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

const main = Effect.gen(function* () {
  const State = Schema.Struct({ ok: Schema.Number, bad: Schema.Number, afterDelay: Schema.Number })
  const SubmitPayload = Schema.Struct({ userId: Schema.String, shouldFail: Schema.Boolean })

  const M = Logix.Module.make('Workflow075.Demo', {
    state: State,
    actions: {
      submit: SubmitPayload,
      ok: Schema.Void,
      bad: Schema.Void,
      afterDelay: Schema.Void,
    },
    reducers: {
      ok: Logix.Module.Reducer.mutate((draft) => {
        ;(draft as any).ok += 1
      }),
      bad: Logix.Module.Reducer.mutate((draft) => {
        ;(draft as any).bad += 1
      }),
      afterDelay: Logix.Module.Reducer.mutate((draft) => {
        ;(draft as any).afterDelay += 1
      }),
    },
  })

  const program = Logix.Workflow.make({
    localId: 'submit',
    trigger: Logix.Workflow.onAction('submit'),
    policy: { concurrency: 'latest' },
    steps: [
      Logix.Workflow.call({
        key: 'call.submit',
        service: SubmitPort,
        input: Logix.Workflow.object({
          userId: Logix.Workflow.payloadPath('/userId'),
          shouldFail: Logix.Workflow.payloadPath('/shouldFail'),
        }),
        onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.ok', actionTag: 'ok' })],
        onFailure: [Logix.Workflow.dispatch({ key: 'dispatch.bad', actionTag: 'bad' })],
      }),
      Logix.Workflow.delay({ key: 'delay.after', ms: 30 }),
      Logix.Workflow.dispatch({ key: 'dispatch.afterDelay', actionTag: 'afterDelay' }),
    ],
  })

  const impl = M.withWorkflow(program).implement({ initial: { ok: 0, bad: 0, afterDelay: 0 } })
  const ring = Logix.Debug.makeRingBufferSink(512)

  const runtime = Logix.Runtime.make(impl, {
    middleware: [Logix.Middleware.makeDebugObserver()],
    layer: Layer.mergeAll(
      Logix.Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      Logix.Debug.diagnosticsLevel('full'),
      Layer.succeed(SubmitPort, (input) => (input.shouldFail ? Effect.fail(new Error('boom')) : Effect.void)),
    ) as Layer.Layer<any, never, never>,
    label: 'examples:workflow:075',
  })

  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const rt = yield* M.tag

          yield* rt.dispatch({ _tag: 'submit', payload: { userId: 'u1', shouldFail: false } } as any)
          yield* Effect.sleep('60 millis')

          yield* rt.dispatch({ _tag: 'submit', payload: { userId: 'u2', shouldFail: true } } as any)
          yield* Effect.sleep('60 millis')

          // eslint-disable-next-line no-console
          console.log('[State]', yield* rt.getState)

          const trace = ring
            .getSnapshot()
            .filter((e) => e.type === 'trace:effectop')
            .filter((e: any) => String(e.data?.name ?? '').startsWith('workflow.'))

          // eslint-disable-next-line no-console
          console.log(
            '[Workflow trace]',
            trace.map((e: any) => ({
              name: e.data?.name,
              programId: e.data?.meta?.programId,
              runId: e.data?.meta?.runId,
              tickSeq: e.data?.meta?.tickSeq,
              stepKey: e.data?.meta?.stepKey,
              reason: e.data?.meta?.reason,
            })),
          )
        }) as any,
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
