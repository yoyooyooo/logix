import { Context, Effect, Exit, Layer, Schema } from 'effect'
import { readFileSync } from 'node:fs'
import * as Logix from '@logix/core'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

const State = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

const TrialRunDef = Logix.Module.make('TrialRunEvidence', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: any) => s },
  traits: Logix.StateTrait.from(State)({
    derivedA: Logix.StateTrait.computed({
      deps: ['a'],
      get: (a) => a + 1,
    }),
  }),
})

const TrialRunModule = TrialRunDef.implement({
  initial: { a: 0, derivedA: 1 },
  logics: [],
})
const TrialRunImpl = TrialRunModule.impl

const program = Effect.gen(function* () {
  const ctx = yield* Effect.scoped(TrialRunImpl.layer.pipe(Layer.build))
  const runtime = Context.get(ctx, TrialRunDef.tag)

  yield* runtime.dispatch({ _tag: 'noop', payload: undefined })
  yield* Effect.sleep(10)

  return runtime.instanceId as string
})

const main = Effect.gen(function* () {
  const runtimeServicesSchema = readJson(
    new URL(
      '../../../../specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json',
      import.meta.url,
    ),
  )

  const result = yield* Logix.Observability.trialRun(program, {
    runId: 'run-node-trial-1',
    source: { host: 'node', label: 'trialRunEvidence.ts' },
    diagnosticsLevel: 'full',
    runtimeServicesInstanceOverrides: {
      txnQueue: {
        implId: 'trace',
        notes: 'demo: instance override',
      },
    },
    maxEvents: 200,
  })

  if (Exit.isFailure(result.exit)) {
    // eslint-disable-next-line no-console
    console.error('[TrialRun] program failed:', result.exit)
  }

  const summary: any = result.evidence.summary
  const services: any = summary?.runtime?.services

  const required = new Set<string>(runtimeServicesSchema.required ?? [])
  for (const k of required) {
    if (!(k in (services ?? {}))) {
      throw new Error(`[TrialRun] missing required runtime.services field: ${k}`)
    }
  }

  // eslint-disable-next-line no-console
  console.log('[TrialRun] runId:', result.session.runId)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] instanceId:', services?.instanceId)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] runtime.services.scope:', services?.scope)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] events:', result.evidence.events.length)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] summary:', JSON.stringify(result.evidence.summary, null, 2))
})

Effect.runPromise(main as any).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
