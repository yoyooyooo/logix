import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeRuntimeWithDevtoolsHub = (options: {
  readonly moduleId: string
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly traitConvergeDiagnosticsSampling?: Debug.TraitConvergeDiagnosticsSamplingConfig
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const State = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    derivedA: Schema.Number,
    derivedB: Schema.Number,
  })

  type S = Schema.Schema.Type<typeof State>

  const Actions = {
    noop: Schema.Void,
    incA: Schema.Void,
  }

  const M = Logix.Module.make(options.moduleId, {
    state: State,
    actions: Actions,
    reducers: {
      noop: (s: any) => s,
      incA: Logix.Module.Reducer.mutate((draft) => {
        draft.a += 1
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
    }),
  })

  const impl = M.implement({
    initial: { a: 0, b: 0, derivedA: 1, derivedB: 1 },
    logics: [],
  })

  Debug.clearDevtoolsEvents()

  const layer = Debug.devtoolsHubLayer({
    bufferSize: 256,
    diagnosticsLevel: options.diagnosticsLevel,
    ...(options.traitConvergeDiagnosticsSampling
      ? { traitConvergeDiagnosticsSampling: options.traitConvergeDiagnosticsSampling }
      : null),
  })

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: options.stateTransaction,
    layer: layer as Layer.Layer<any, never, never>,
  })

  return { M, runtime }
}

const runTxn = (
  M: any,
  runtime: ReturnType<typeof Logix.Runtime.make>,
  name: string,
): Effect.Effect<void, never, any> =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const rt = yield* M.tag
        void name
        yield* rt.dispatch({ _tag: 'incA', payload: undefined } as any)
      }),
    ),
  )

const pickTraitConvergeRefs = (pkg: Logix.Observability.EvidencePackage): any[] =>
  pkg.events
    .filter((e) => e.type === 'debug:event')
    .map((e) => e.payload as any)
    .filter((p) => p && typeof p === 'object' && p.kind === 'trait:converge')

describe('StateTrait converge diagnostics levels', () => {
  it.scoped('off: no exportable trait:converge event nor summary', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_DiagnosticsLevels_Off'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'off',
        stateTransaction: { traitConvergeMode: 'auto' },
      })

      yield* runTxn(M, runtime, 't1')

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'off' },
      })

      expect(pickTraitConvergeRefs(pkg).length).toBe(0)
      expect(pkg.summary).toBeUndefined()
    }),
  )

  it.scoped('light: trait:converge exported with slim dirty + rootIds mapping; no staticIrByDigest summary', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_DiagnosticsLevels_Light'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: { traitConvergeMode: 'auto' },
      })

      yield* runTxn(M, runtime, 't1')

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'light' },
      })

      const refs = pickTraitConvergeRefs(pkg)
      expect(refs.length).toBeGreaterThan(0)

      const last = refs[refs.length - 1]!
      const meta = last.meta as any
      const dirty = meta.dirty as any

      expect(dirty).toBeDefined()
      expect(typeof dirty.dirtyAll).toBe('boolean')
      expect('rootCount' in dirty).toBe(false)
      expect(Array.isArray(dirty.rootIds)).toBe(true)
      expect(typeof dirty.rootIdsTruncated).toBe('boolean')
      expect(Array.isArray(dirty.rootPaths)).toBe(true)
      expect(dirty.rootPaths.length).toBe(dirty.rootIds.length)

      expect(pkg.summary).toBeUndefined()
    }),
  )

  it.scoped('full: trait:converge exported with controlled roots summary and staticIrByDigest summary', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_DiagnosticsLevels_Full'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'full',
        stateTransaction: { traitConvergeMode: 'auto' },
      })

      yield* runTxn(M, runtime, 't1')

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'full' },
      })

      const refs = pickTraitConvergeRefs(pkg)
      expect(refs.length).toBeGreaterThan(0)

      const last = refs[refs.length - 1]!
      const meta = last.meta as any
      const dirty = meta.dirty as any

      expect(dirty).toBeDefined()
      expect(typeof dirty.dirtyAll).toBe('boolean')
      expect(typeof dirty.rootCount).toBe('number')
      expect(Array.isArray(dirty.rootIds)).toBe(true)
      expect(dirty.rootIds.length).toBeLessThanOrEqual(3)
      expect(typeof dirty.rootIdsTruncated).toBe('boolean')

      const summary = pkg.summary as any
      expect(summary).toBeDefined()
      expect(summary.converge).toBeDefined()
      expect(summary.converge.staticIrByDigest).toBeDefined()
      expect(typeof meta.staticIrDigest).toBe('string')
      expect(meta.staticIrDigest.length).toBeGreaterThan(0)
      expect((summary.converge.staticIrByDigest as any)[meta.staticIrDigest]).toBeDefined()
    }),
  )

  it.scoped(
    'sampled: trait:converge exported with slim dirty + diagnosticsSampling summary + optional top3 hotspots',
    () =>
      Effect.gen(function* () {
        const moduleId = 'StateTraitConvergeAuto_DiagnosticsLevels_Sampled'
        const { M, runtime } = makeRuntimeWithDevtoolsHub({
          moduleId,
          diagnosticsLevel: 'sampled',
          traitConvergeDiagnosticsSampling: { sampleEveryN: 1, topK: 3 },
          stateTransaction: { traitConvergeMode: 'auto' },
        })

        yield* runTxn(M, runtime, 't1')

        const pkg = Debug.exportEvidencePackage({
          source: { host: 'test', label: 'sampled' },
        })

        const refs = pickTraitConvergeRefs(pkg)
        expect(refs.length).toBeGreaterThan(0)

        const last = refs[refs.length - 1]!
        const meta = last.meta as any

        const dirty = meta.dirty as any
        expect(dirty).toBeDefined()
        expect(typeof dirty.dirtyAll).toBe('boolean')
        expect('rootCount' in dirty).toBe(false)
        expect('rootIds' in dirty).toBe(false)
        expect('rootIdsTruncated' in dirty).toBe(false)

        const sampling = meta.diagnosticsSampling as any
        expect(sampling).toBeDefined()
        expect(sampling.strategy).toBe('txnSeq_interval')
        expect(sampling.sampleEveryN).toBe(1)
        expect(sampling.topK).toBe(3)
        expect(sampling.sampled).toBe(true)

        expect(pkg.summary).toBeUndefined()

        const top3 = meta.top3 as any
        expect(Array.isArray(top3)).toBe(true)
        expect(top3.length).toBeGreaterThan(0)
        expect(top3.length).toBeLessThanOrEqual(3)
        expect(typeof top3[0]?.stepId).toBe('number')
        expect(typeof top3[0]?.durationMs).toBe('number')
        expect(typeof top3[0]?.changed).toBe('boolean')
      }),
  )
})
