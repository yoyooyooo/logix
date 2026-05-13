import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import * as FieldKernelConverge from '../../src/internal/field-kernel/converge.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'

describe('FieldKernel converge auto exact-empty dirty plan', () => {
  it.effect('does not degrade exact-empty dirtyPlan into unknown_write/full on non-cold transaction', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        d0: Schema.Number,
        d1: Schema.Number,
        d2: Schema.Number,
      })
      type S = Schema.Schema.Type<typeof State>

      const program = FieldContracts.buildFieldProgram(
        State,
        FieldContracts.fieldFrom(State)({
          d0: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
          d1: FieldContracts.fieldComputed({
            deps: ['d0'],
            get: (d0) => d0 + 1,
          }),
          d2: FieldContracts.fieldComputed({
            deps: ['d1'],
            get: (d1) => d1 + 1,
          }),
        }),
      )

      const registry = program.convergeIr!.fieldPathIdRegistry
      const dirtyPlan: TxnDirtyPlanSnapshot = {
        dirtyAll: false,
        rawPathIds: [],
        rawKeyHash: 0,
        rawKeySize: 0,
        rootIds: new Int32Array(0),
        rootKeyHash: 0,
        rootCount: 0,
        authority: 'field-path-registry',
        fieldPathCount: registry.fieldPaths.length,
        fieldPathsKey: registry.fieldPathsKey,
      }

      let draft: S = { a: 0, d0: 1, d1: 2, d2: 3 }
      const ring = Debug.makeRingBufferSink(32)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      const outcome = yield* FieldKernelConverge.convergeInTransaction(
        program as any,
        {
          moduleId: 'FieldKernelConvergeAutoExactEmptyDirtyPlan',
          instanceId: 'i-1',
          txnSeq: 2,
          txnId: 't-exact-empty',
          configScope: 'builtin',
          now: () => 0,
          budgetMs: 100_000,
          decisionBudgetMs: 100_000,
          requestedMode: 'auto',
          dirtyPlan,
          dirtyPaths: new Set<number>(),
          dirtyPathsKeyHash: 0,
          dirtyPathsKeySize: 0,
          getDraft: () => draft,
          setDraft: (next: unknown) => {
            draft = next as S
          },
          recordPatch: () => {},
        } as any,
      ).pipe(Effect.provide(layer))

      expect(outcome._tag).toBe('Noop')
      expect(outcome.decision?.executedMode).toBe('dirty')
      expect(outcome.decision?.reasons).not.toContain('unknown_write')
      expect(outcome.decision?.dirty?.dirtyAll).toBe(false)
      expect(outcome.decision?.dirty?.rootCount).toBe(0)
      expect(outcome.decision?.stepStats.executedSteps).toBe(0)
    }),
  )
})
