import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as Logix from '../../src/index.js'
import * as StateTraitConverge from '../../src/internal/state-trait/converge.js'

describe('StateTrait converge diagnostics=off', () => {
  it.scoped('does not build decision payload when diagnostics=off (prod/errorOnly default)', () =>
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

      const layer = Layer.mergeAll(
        Debug.layer({ mode: 'prod' }),
        Debug.diagnosticsLevel('off'),
      ) as Layer.Layer<any, never, never>

      let draft: any = { a: 0, derivedA: 0, derivedB: 0 }
      const outcome = yield* StateTraitConverge.convergeInTransaction(
        program as any,
        {
          moduleId: 'StateTraitConverge_DecisionOffByDefault',
          instanceId: 'i-1',
          txnSeq: 1,
          txnId: 't1',
          configScope: 'builtin',
          now: () => 0,
          budgetMs: 100_000,
          requestedMode: 'full',
          dirtyPaths: new Set<string>(),
          getDraft: () => draft,
          setDraft: (next: unknown) => {
            draft = next
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

      expect((outcome as any).decision).toBeUndefined()
    }),
  )
})

