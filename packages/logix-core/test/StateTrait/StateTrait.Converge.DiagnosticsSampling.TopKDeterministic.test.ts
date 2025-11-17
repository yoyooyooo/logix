import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as Logix from '../../src/index.js'
import * as StateTraitConverge from '../../src/internal/state-trait/converge.js'

const makeNow = (timeline: ReadonlyArray<number>): (() => number) => {
  let i = 0
  const last = timeline[timeline.length - 1] ?? 0
  return () => {
    const value = timeline[i] ?? last
    i += 1
    return value
  }
}

describe('StateTrait converge diagnostics sampling (deterministic topK)', () => {
  it.scoped('only emits top3 when sampled; slow trait should be ranked into top1', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      const spec = Logix.StateTrait.from(State)({
        derivedA: Logix.StateTrait.computed({
          deps: ['a'],
          get: (a) => a + 1,
        }),
        derivedB: Logix.StateTrait.computed({
          deps: ['derivedA'],
          get: (derivedA) => derivedA + 1,
        }),
      })

      const program = Logix.StateTrait.build(State, spec)
      const ir = program.convergeIr
      expect(ir).toBeDefined()
      if (!ir) throw new Error('missing convergeIr')

      const derivedBOutFieldPathId = ir.fieldPaths.findIndex((p) => p.length === 1 && p[0] === 'derivedB')
      expect(derivedBOutFieldPathId).toBeGreaterThanOrEqual(0)

      const layer = Layer.mergeAll(
        Debug.replace([{ record: () => Effect.void }]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('sampled'),
        Debug.traitConvergeDiagnosticsSampling({ sampleEveryN: 2, topK: 3 }),
      ) as Layer.Layer<any, never, never>

      const runConverge = (params: { readonly txnSeq: number; readonly now: () => number }) => {
        type S = Schema.Schema.Type<typeof State>
        let draft: S = { a: 0, derivedA: 0, derivedB: 0 }
        return StateTraitConverge.convergeInTransaction(
          program as any,
          {
            moduleId: 'StateTraitConverge_DiagnosticsSampling_TopKDeterministic',
            instanceId: 'i-1',
            txnSeq: params.txnSeq,
            txnId: `t${params.txnSeq}`,
            configScope: 'builtin',
            now: params.now,
            budgetMs: 100_000,
            requestedMode: 'full',
            dirtyPaths: new Set<string>(),
            getDraft: () => draft,
            setDraft: (next: unknown) => {
              draft = next as S
            },
            recordPatch: (
              _path: unknown,
              _reason: unknown,
              _from?: unknown,
              _to?: unknown,
              _traitNodeId?: unknown,
              _stepId?: unknown,
            ) => {
              void _path
              void _reason
              void _from
              void _to
              void _traitNodeId
              void _stepId
            },
          } as any,
        ).pipe(Effect.provide(layer))
      }

      const notSampled = yield* runConverge({
        txnSeq: 2,
        now: makeNow([0, 0, 0]),
      })

      const notSampledDecision = (notSampled as any).decision
      expect(notSampledDecision).toBeDefined()
      expect(notSampledDecision.diagnosticsSampling?.sampled).toBe(false)
      expect(notSampledDecision.top3).toBeUndefined()

      const sampled = yield* runConverge({
        txnSeq: 3,
        now: makeNow([0, 0, 0, 1, 1, 101, 101]),
      })

      const sampledDecision = (sampled as any).decision
      expect(sampledDecision).toBeDefined()
      expect(sampledDecision.diagnosticsSampling?.sampled).toBe(true)

      const top3 = sampledDecision.top3 as any[]
      expect(Array.isArray(top3)).toBe(true)
      expect(top3.length).toBeGreaterThan(0)
      expect(top3[0]?.outFieldPathId).toBe(derivedBOutFieldPathId)
      expect(top3.length).toBeGreaterThan(1)
      expect(top3[0]?.durationMs).toBeGreaterThanOrEqual(top3[1]?.durationMs)
    }),
  )
})
