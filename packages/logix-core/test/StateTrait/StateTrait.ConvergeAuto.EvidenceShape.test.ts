import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeRuntimeWithDevtoolsHub = (options: {
  readonly moduleId: string
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
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
  }

  const M = Logix.Module.make(options.moduleId, {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
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
  })

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: options.stateTransaction,
    layer: layer as Layer.Layer<any, never, never>,
  })

  return { M, runtime }
}

const pickTraitConvergeRefs = (pkg: Logix.Observability.EvidencePackage): any[] =>
  pkg.events
    .filter((e) => e.type === 'debug:event')
    .map((e) => e.payload as any)
    .filter((p) => p && typeof p === 'object' && p.kind === 'trait:converge')

describe('StateTrait converge auto evidence shape', () => {
  it.scoped('full: EvidencePackage is JSON-serializable and exports ConvergeStaticIR by digest', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_EvidenceShape_Full'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'full',
        stateTransaction: {
          traitConvergeMode: 'auto',
        },
      })

      const makeTxn = (name: string) =>
        Effect.gen(function* () {
          const rt = yield* M.tag
          yield* Logix.InternalContracts.runWithStateTransaction(rt as any, { kind: 'test', name }, () =>
            Effect.gen(function* () {
              const prev = yield* rt.getState
              yield* rt.setState({ ...prev, a: prev.a + 1 })
              Logix.InternalContracts.recordStatePatch(rt as any, 'a', 'unknown')
            }),
          )
        })

      yield* Effect.promise(() => runtime.runPromise(makeTxn('t1')))
      yield* Effect.promise(() => runtime.runPromise(makeTxn('t2')))

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'full' },
      })

      expect(() => JSON.stringify(pkg)).not.toThrow()

      const refs = pickTraitConvergeRefs(pkg)
      expect(refs.length).toBeGreaterThan(0)

      const last = refs[refs.length - 1]!
      const meta = last.meta as any

      expect(meta).toBeDefined()
      expect(meta.requestedMode).toBeDefined()
      expect(meta.executedMode).toBeDefined()
      expect(meta.configScope).toBeDefined()
      expect(typeof meta.staticIrDigest).toBe('string')
      expect(meta.staticIrDigest.length).toBeGreaterThan(0)
      expect(meta.cache).toBeDefined()
      expect(meta.generation).toBeDefined()
      expect(meta.staticIr).toBeDefined()
      expect(meta.thresholds).toBeDefined()
      expect(meta.thresholds.floorRatio).toBe(1.05)

      expect(meta.dirty).toBeDefined()
      expect(typeof meta.dirty.dirtyAll).toBe('boolean')
      expect(typeof meta.dirty.rootCount).toBe('number')
      expect(Array.isArray(meta.dirty.rootIds)).toBe(true)
      expect(meta.dirty.rootIds.length).toBeLessThanOrEqual(3)
      expect(typeof meta.dirty.rootIdsTruncated).toBe('boolean')

      const summary = pkg.summary as any
      expect(summary).toBeDefined()
      expect(summary.converge).toBeDefined()
      expect(summary.converge.staticIrByDigest).toBeDefined()

      const byDigest = summary.converge.staticIrByDigest as Record<string, any>
      expect(Object.keys(byDigest).length).toBe(1)
      expect(byDigest[meta.staticIrDigest]).toBeDefined()
    }),
  )

  it.scoped('light: EvidencePackage keeps staticIrDigest but does not export ConvergeStaticIR summary', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_EvidenceShape_Light'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'auto',
        },
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* Logix.InternalContracts.runWithStateTransaction(rt as any, { kind: 'test', name: 't1' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...prev, a: prev.a + 1 })
            Logix.InternalContracts.recordStatePatch(rt as any, 'a', 'unknown')
          }),
        )
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'light' },
      })

      expect(() => JSON.stringify(pkg)).not.toThrow()

      const refs = pickTraitConvergeRefs(pkg)
      expect(refs.length).toBeGreaterThan(0)

      const last = refs[refs.length - 1]!
      const meta = last.meta as any
      expect(typeof meta.staticIrDigest).toBe('string')
      expect(meta.staticIrDigest.length).toBeGreaterThan(0)
      expect(meta.thresholds).toBeDefined()
      expect(meta.thresholds.floorRatio).toBe(1.05)

      expect(pkg.summary).toBeUndefined()
    }),
  )
})
