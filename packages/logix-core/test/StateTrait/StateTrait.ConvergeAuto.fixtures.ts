import { Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

export const makeConvergeAutoFixture = (options?: {
  readonly moduleId?: string
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
  readonly diagnosticsLevel?: Debug.DiagnosticsLevel
  /**
   * Add extra computed steps on `a` to ensure auto-mode has a non-tiny graph,
   * so tests can still cover the dirty-path decision branch.
   */
  readonly extraADerivedCount?: number
}) => {
  const extraADerivedCount =
    typeof options?.extraADerivedCount === 'number' && Number.isFinite(options.extraADerivedCount)
      ? Math.max(0, Math.floor(options.extraADerivedCount))
      : 0

  const extraFields: Record<string, typeof Schema.Number> = {}
  for (let i = 0; i < extraADerivedCount; i++) {
    extraFields[`derivedA${i + 2}`] = Schema.Number
  }

  const State = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    derivedA: Schema.Number,
    derivedB: Schema.Number,
    ...extraFields,
  })

  type S = Schema.Schema.Type<typeof State>

  const Actions = {
    noop: Schema.Void,
    bumpA: Schema.Void,
    bumpB: Schema.Void,
    bumpAB: Schema.Void,
  }

  const M = Logix.Module.make(options?.moduleId ?? 'StateTraitConvergeAuto', {
    state: State,
    actions: Actions,
    reducers: {
      noop: (s: S) => s,
      bumpA: Logix.Module.Reducer.mutate((draft) => {
        draft.a += 1
      }),
      bumpB: Logix.Module.Reducer.mutate((draft) => {
        draft.b += 1
      }),
      bumpAB: Logix.Module.Reducer.mutate((draft) => {
        draft.a += 1
        draft.b += 1
      }),
    },
    traits: Logix.StateTrait.from(State)({
      derivedA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      derivedB: Logix.StateTrait.computed({
        deps: ['b'],
        get: (b) => b + 1,
      }),
      ...(Object.fromEntries(
        Array.from({ length: extraADerivedCount }, (_, i) => [
          `derivedA${i + 2}`,
          Logix.StateTrait.computed<any, any, any>({
            deps: ['a'],
            get: (a) => (a as number) + 1,
          }),
        ]),
      ) as any),
    }),
  })

  const initial: any = { a: 0, b: 0, derivedA: 1, derivedB: 1 }
  for (let i = 0; i < extraADerivedCount; i++) {
    initial[`derivedA${i + 2}`] = 1
  }

  const impl = M.implement({
    initial,
    logics: [],
  })

  const ring = Debug.makeRingBufferSink(256)

  const debugLayer = Debug.replace([ring.sink]) as Layer.Layer<any, never, never>
  const layer = options?.diagnosticsLevel
    ? (Layer.mergeAll(debugLayer, Debug.diagnosticsLevel(options.diagnosticsLevel)) as Layer.Layer<any, never, never>)
    : debugLayer

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: options?.stateTransaction,
    layer,
  })

  return { M, impl, ring, runtime }
}

export const pickConvergeTraceEvents = (
  events: ReadonlyArray<Debug.Event>,
): ReadonlyArray<Extract<Debug.Event, { readonly type: 'trace:trait:converge' }>> =>
  events.filter(
    (e): e is Extract<Debug.Event, { readonly type: 'trace:trait:converge' }> => e.type === 'trace:trait:converge',
  )
