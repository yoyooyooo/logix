import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as BoundApiRuntime from '../../src/internal/runtime/core/BoundApiRuntime.js'

describe('FieldKernel converge row scoped computed incremental', () => {
  it.effect('runs row-scoped companion only for changed row when exact list evidence exists', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const StateSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
        ui: Schema.Any,
      })

      let deriveCallCount = 0
      const changedRowIds: Array<number> = []

      const M = FieldContracts.withModuleFieldDeclarations(
        Logix.Module.make('FieldKernelConverge_RowScopedComputed_Incremental', {
          state: StateSchema,
          actions: { noop: Schema.Void },
          reducers: {
            noop: (state: any) => state,
          },
        }),
        FieldContracts.fieldFrom(StateSchema)({
          items: FieldContracts.fieldList({
            identityHint: { trackBy: 'id' },
          }),
          'ui.items.warehouseId.$companion': {
            fieldPath: undefined as never,
            kind: 'computed',
            meta: {
              deps: ['items.warehouseId'],
              equals: Object.is,
              _depsAbsolute: true,
              _formCompanion: true,
              _rowScopeIncrementalPolicy: 'changed-rows',
              _companionValuePatternPath: 'items[].warehouseId',
              _companionDeriveAtPath: (_rootState: unknown, valuePath: string) => {
                deriveCallCount += 1
                const match = valuePath.match(/^items\.(\d+)\.warehouseId$/)
                if (match) changedRowIds.push(Number(match[1]))
                return { valuePath }
              },
            } as any,
          } as any,
        } as any),
      )

      const programModule = Logix.Program.make(M, {
        initial: {
          items: [
            { id: 'row-0', warehouseId: 'WH-000' },
            { id: 'row-1', warehouseId: 'WH-001' },
            { id: 'row-2', warehouseId: 'WH-002' },
          ],
          ui: {},
        } as any,
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
        const bound = BoundApiRuntime.make(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: {} as any,
          } as any,
          rt as any,
          {
            getPhase: () => 'run',
            moduleId: 'FieldKernelConverge_RowScopedComputed_Incremental',
          },
        )
        yield* Effect.sleep('20 millis')
        deriveCallCount = 0
        changedRowIds.length = 0
        yield* FieldContracts.runWithBoundStateTransaction(bound as any, { kind: 'test', name: 'row-scope' }, () =>
          Effect.gen(function* () {
            yield* bound.state.mutate((draft: any) => {
              draft.items[1].warehouseId = 'WH-999'
            })
          }),
        )
        yield* Effect.sleep('10 millis')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))

      expect(deriveCallCount).toBe(1)
      expect(changedRowIds).toEqual([1])
    }),
  )

  it.effect('defaults row-scoped companion to full recompute when row-local policy is not proven', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const StateSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
        ui: Schema.Any,
      })

      let deriveCallCount = 0
      const recomputedRows: Array<number> = []

      const M = FieldContracts.withModuleFieldDeclarations(
        Logix.Module.make('FieldKernelConverge_RowScopedComputed_DefaultFull', {
          state: StateSchema,
          actions: { noop: Schema.Void },
          reducers: {
            noop: (state: any) => state,
          },
        }),
        FieldContracts.fieldFrom(StateSchema)({
          items: FieldContracts.fieldList({
            identityHint: { trackBy: 'id' },
          }),
          'ui.items.warehouseId.$companion': {
            fieldPath: undefined as never,
            kind: 'computed',
            meta: {
              deps: ['items.warehouseId'],
              equals: Object.is,
              _depsAbsolute: true,
              _formCompanion: true,
              _companionValuePatternPath: 'items[].warehouseId',
              _companionDeriveAtPath: (_rootState: unknown, valuePath: string) => {
                deriveCallCount += 1
                const match = valuePath.match(/^items\.(\d+)\.warehouseId$/)
                if (match) recomputedRows.push(Number(match[1]))
                return { valuePath }
              },
            } as any,
          } as any,
        } as any),
      )

      const programModule = Logix.Program.make(M, {
        initial: {
          items: [
            { id: 'row-0', warehouseId: 'WH-000' },
            { id: 'row-1', warehouseId: 'WH-001' },
            { id: 'row-2', warehouseId: 'WH-002' },
          ],
          ui: {},
        } as any,
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
        const bound = BoundApiRuntime.make(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: {} as any,
          } as any,
          rt as any,
          {
            getPhase: () => 'run',
            moduleId: 'FieldKernelConverge_RowScopedComputed_DefaultFull',
          },
        )
        yield* Effect.sleep('20 millis')
        deriveCallCount = 0
        recomputedRows.length = 0
        yield* FieldContracts.runWithBoundStateTransaction(bound as any, { kind: 'test', name: 'row-scope-full' }, () =>
          Effect.gen(function* () {
            yield* bound.state.mutate((draft: any) => {
              draft.items[1].warehouseId = 'WH-999'
            })
          }),
        )
        yield* Effect.sleep('10 millis')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))

      expect(deriveCallCount).toBe(3)
      expect(recomputedRows).toEqual([0, 1, 2])
    }),
  )
})
