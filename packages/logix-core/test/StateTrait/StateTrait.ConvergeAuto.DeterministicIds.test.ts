import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait converge auto deterministic ids', () => {
  it.scoped('uses stable instanceId/txnSeq/opSeq anchors (no random/time defaults)', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      const Actions = {
        noop: Schema.Void,
        incA: Schema.Void,
      }

      const M = Logix.Module.make('StateTraitConvergeAuto_DeterministicIds', {
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

      const runtime = Logix.Runtime.make(impl, {
        devtools: true,
        stateTransaction: { traitConvergeMode: 'auto' },
        layer: Layer.mergeAll(Debug.diagnosticsLevel('light'), Layer.empty) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        yield* rt.dispatch({ _tag: 'incA', payload: undefined } as any)
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'ids' },
      })

      const effectOps = pkg.events
        .filter((e) => e.type === 'debug:event')
        .map((e) => e.payload as any)
        .filter((p) => p && typeof p === 'object' && (p.kind === 'trait-computed' || p.kind === 'trait-link'))

      expect(effectOps.length).toBeGreaterThan(0)

      const opSeqs: Array<number> = []
      const opIds: Array<string> = []
      for (const op of effectOps) {
        const meta = op.meta?.meta
        const opSeq = meta?.opSeq
        if (typeof opSeq === 'number' && Number.isFinite(opSeq)) {
          opSeqs.push(Math.floor(opSeq))
        }
        if (typeof op.meta?.id === 'string') {
          opIds.push(op.meta.id)
        }
        expect(typeof meta?.instanceId).toBe('string')
        expect(typeof meta?.txnSeq).toBe('number')
      }

      expect(opSeqs.length).toBeGreaterThan(0)
      expect(new Set(opSeqs).size).toBe(opSeqs.length)

      // A minimal check that op id is derived from opSeq (stable anchor),
      // rather than random/timestamp-based values.
      expect(opIds.length).toBeGreaterThan(0)
      for (let i = 0; i < opIds.length && i < opSeqs.length; i++) {
        expect(opIds[i]!).toContain(String(opSeqs[i]!))
      }
    }),
  )

  it.scoped('staticIrDigest is stable across independent runs (same converge shape)', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      const Actions = {
        noop: Schema.Void,
        incA: Schema.Void,
      }

      const M = Logix.Module.make('StateTraitConvergeAuto_DeterministicIds_Digest', {
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

      const runOnce = (): Effect.Effect<{ readonly digest: string; readonly fieldPaths: unknown }, never, any> =>
        Effect.gen(function* () {
          Debug.clearDevtoolsEvents()

          const layer = Debug.devtoolsHubLayer({
            bufferSize: 256,
            diagnosticsLevel: 'full',
          }) as Layer.Layer<any, never, never>

          const runtime = Logix.Runtime.make(impl, {
            stateTransaction: { traitConvergeMode: 'auto' },
            layer,
          })

          const program = Effect.gen(function* () {
            const rt: any = yield* M.tag

            yield* rt.dispatch({ _tag: 'incA', payload: undefined } as any)
          })

          yield* Effect.promise(() => runtime.runPromise(program))

          const pkg = Debug.exportEvidencePackage({
            source: { host: 'test', label: 'digest' },
          })

          const converge = pkg.events
            .filter((e) => e.type === 'debug:event')
            .map((e) => e.payload as any)
            .filter((p) => p && typeof p === 'object' && p.kind === 'trait:converge')

          expect(converge.length).toBeGreaterThan(0)

          const last = converge[converge.length - 1]!
          const digest = last.meta?.staticIrDigest
          expect(typeof digest).toBe('string')
          expect(digest.length).toBeGreaterThan(0)

          const staticIrByDigest = (pkg.summary as any)?.converge?.staticIrByDigest as any
          const ir = staticIrByDigest && typeof staticIrByDigest === 'object' ? staticIrByDigest[digest] : undefined
          const fieldPaths = ir?.fieldPaths

          expect(Array.isArray(fieldPaths)).toBe(true)
          expect(fieldPaths.length).toBeGreaterThan(0)

          return { digest, fieldPaths }
        })

      const r1 = yield* runOnce()
      const r2 = yield* runOnce()

      expect(r2.digest).toBe(r1.digest)
      expect(r2.fieldPaths).toEqual(r1.fieldPaths)
    }),
  )
})
