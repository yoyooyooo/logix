import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import * as Logix from '../../src/index.js'
import * as FieldKernelConverge from '../../src/internal/field-kernel/converge.js'

describe('FieldKernel converge diagnostics=off', () => {
  it.effect('does not build decision payload when diagnostics=off (prod/errorOnly default)', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      const spec = FieldContracts.fieldFrom(State)({
        derivedA: FieldContracts.fieldComputed({
          deps: ['a'],
          get: (a) => a + 1,
        }),
        derivedB: FieldContracts.fieldComputed({
          deps: ['derivedA'],
          get: (derivedA) => derivedA + 1,
        }),
      })

      const program = FieldContracts.buildFieldProgram(State, spec)

      const layer = Layer.mergeAll(
        Debug.layer({ mode: 'prod' }),
        Debug.diagnosticsLevel('off'),
      ) as Layer.Layer<any, never, never>

      type S = Schema.Schema.Type<typeof State>
      let draft: S = { a: 0, derivedA: 0, derivedB: 0 }
      const outcome = yield* FieldKernelConverge.convergeInTransaction(
        program as any,
        {
          moduleId: 'FieldKernelConverge_DecisionOffByDefault',
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
            draft = next as S
          },
          recordPatch: (
            _path: unknown,
            _reason: unknown,
            _from?: unknown,
            _to?: unknown,
            _fieldNodeId?: unknown,
            _stepId?: unknown,
          ) => {
            void _path
            void _reason
            void _from
            void _to
            void _fieldNodeId
            void _stepId
          },
        } as any,
      ).pipe(Effect.provide(layer))

      expect((outcome as any).decision).toBeUndefined()
    }),
  )
})
