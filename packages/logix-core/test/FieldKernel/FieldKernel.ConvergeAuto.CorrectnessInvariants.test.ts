import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeTestRuntime = (options: {
  readonly moduleId: string
  readonly state: Schema.Schema<any>
  readonly fieldDeclarations: any
  readonly initial: Record<string, unknown>
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const Actions = { noop: Schema.Void, bump: Schema.String }

  const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make(options.moduleId, {
  state: options.state as any,
  actions: Actions,
  reducers: {
      noop: (s: any) => s,
      bump: Logix.Module.Reducer.mutate((draft, key: string) => {
        const record = draft as Record<string, unknown>
        const prev = record[key]
        if (typeof prev === 'number') {
          record[key] = prev + 1
        }
      }),
    }
}), options.fieldDeclarations)

  const programModule = Logix.Program.make(M, {
    initial: options.initial as any,
    logics: [],
  })

  const ring = Debug.makeRingBufferSink(2048)
  const layer = Layer.mergeAll(
    Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
    Debug.diagnosticsLevel(options.diagnosticsLevel),
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(programModule, {
    layer,
    stateTransaction: options.stateTransaction,
  })

  return { M, runtime, ring }
}

const pickDecisionSummaries = (ring: Debug.RingBufferSink): ReadonlyArray<any> =>
  ring
    .getSnapshot()
    .filter(
      (e): e is Extract<Debug.Event, { readonly type: 'trace:field:converge' }> => e.type === 'trace:field:converge',
    )
    .map((e) => (e as any).data)

const pickConfigErrors = (ring: Debug.RingBufferSink): ReadonlyArray<any> =>
  ring
    .getSnapshot()
    .filter(
      (e): e is Extract<Debug.Event, { readonly type: 'diagnostic' }> =>
        e.type === 'diagnostic' && e.code === 'field_kernel::config_error',
    )

describe('FieldKernel converge auto correctness invariants', () => {
  it.effect('trackable top-level replace should stop degrading to unknown_write after a cache hit', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = {}
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const fieldDeclarations: Record<string, any> = {}
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        fieldDeclarations[`d${i}`] = FieldContracts.fieldComputed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const spec = FieldContracts.fieldFrom(State as any)(fieldDeclarations as any)

      const initial: Record<string, unknown> = {}
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'FieldKernelConvergeAuto_Correctness_UnknownWrite',
        state: State as any,
        fieldDeclarations: spec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        // Writing state without field-level patches but with a trackable top-level key
        // should now be inferred early enough for auto admission to stay on dirty.
        yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'unknown' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...prev, in0: (prev as any).in0 + 1 })
          }),
        )
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(4)
      expect(decisions.some((d) => Array.isArray(d?.reasons) && d.reasons.includes('cache_hit'))).toBe(true)

      const last = decisions[decisions.length - 1]
      expect(last?.executedMode).toBe('dirty')
      expect(last?.reasons).not.toContain('unknown_write')
    }),
  )

  it.effect('explicit wildcard dirty evidence should still fall back to full even after a cache hit', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = {}
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const fieldDeclarations: Record<string, any> = {}
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        fieldDeclarations[`d${i}`] = FieldContracts.fieldComputed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const spec = FieldContracts.fieldFrom(State as any)(fieldDeclarations as any)

      const initial: Record<string, unknown> = {}
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'FieldKernelConvergeAuto_Correctness_ExplicitUnknownWrite',
        state: State as any,
        fieldDeclarations: spec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'explicit_unknown' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...prev, in0: (prev as any).in0 + 1 })
            FieldContracts.recordStatePatch(rt, '*', 'perf')
          }),
        )
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(4)
      const last = decisions[decisions.length - 1]
      expect(last?.executedMode).toBe('full')
      expect(last?.reasons).toContain('unknown_write')
    }),
  )

  it.effect('multiple writers should hard fail and block commit (not swallowed by cache/self-protection)', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = {}
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const baseTraits: Record<string, any> = {}
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        baseTraits[`d${i}`] = FieldContracts.fieldComputed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const baseSpec = FieldContracts.fieldFrom(State as any)(baseTraits as any)

      const initial: Record<string, unknown> = {}
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'FieldKernelConvergeAuto_Correctness_MultipleWriters',
        state: State as any,
        fieldDeclarations: baseSpec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        const makeDupWriter = (delta: number) => ({
          ...(FieldContracts.fieldComputed<any, any, any>({
            deps: ['in0'],
            get: (in0: any) => (in0 as number) + delta,
          }) as any),
          // Force writing to the same field to conflict with baseSpec's d0 writer.
          fieldPath: 'd0',
        })

        const invalidSpec = FieldContracts.fieldFrom(State as any)({
          ...(baseSpec as any),
          $root: FieldContracts.fieldNode({
            computed: {
              w1: makeDupWriter(1),
              w2: makeDupWriter(2),
            },
          }),
        })

        const invalidProgram = FieldContracts.buildFieldProgram(State as any, invalidSpec as any)
        FieldContracts.registerFieldProgram(rt, invalidProgram)

        const before = yield* rt.getState
        const exit = yield* Effect.exit(bump('in0'))
        expect(exit._tag).toBe('Failure')
        const after = yield* rt.getState
        expect(after).toEqual(before)
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(3)
      expect(decisions.some((d) => Array.isArray(d?.reasons) && d.reasons.includes('cache_hit'))).toBe(true)

      const errors = pickConfigErrors(ring)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]?.kind).toBe('field_kernel_config_error:MULTIPLE_WRITERS')
    }),
  )

  it.effect('computed/link cycle should hard fail and block commit (not swallowed by cache/self-protection)', () =>
    Effect.gen(function* () {
      const steps = 10
      const shape: Record<string, Schema.Schema<any>> = { a: Schema.Number, b: Schema.Number }
      for (let i = 0; i < steps; i++) {
        shape[`in${i}`] = Schema.Number
        shape[`d${i}`] = Schema.Number
      }

      const State = Schema.Struct(shape)

      const baseTraits: Record<string, any> = {
        a: FieldContracts.fieldComputed<any, any, any>({
          deps: ['in0'],
          get: (in0: any) => (in0 as number) + 1,
        }),
        b: FieldContracts.fieldComputed<any, any, any>({
          deps: ['in1'],
          get: (in1: any) => (in1 as number) + 1,
        }),
      }
      for (let i = 0; i < steps; i++) {
        const input = `in${i}`
        baseTraits[`d${i}`] = FieldContracts.fieldComputed<any, any, any>({
          deps: [input],
          get: (value: any) => (value as number) + 1,
        })
      }

      const baseSpec = FieldContracts.fieldFrom(State as any)(baseTraits as any)

      const initial: Record<string, unknown> = { a: 0, b: 0 }
      for (let i = 0; i < steps; i++) {
        initial[`in${i}`] = 0
        initial[`d${i}`] = 1
      }

      const { M, runtime, ring } = makeTestRuntime({
        moduleId: 'FieldKernelConvergeAuto_Correctness_CycleDetected',
        state: State as any,
        fieldDeclarations: baseSpec,
        initial,
        diagnosticsLevel: 'light',
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        const bump = (field: string) => rt.dispatch({ _tag: 'bump', payload: field } as any)

        yield* bump('in0')
        yield* bump('in0')
        yield* bump('in0')

        const cycleSpec = FieldContracts.fieldFrom(State as any)({
          ...(baseSpec as any),
          a: FieldContracts.fieldComputed<any, any, any>({
            deps: ['b'],
            get: (b: any) => (b as number) + 1,
          }),
          b: FieldContracts.fieldComputed<any, any, any>({
            deps: ['a'],
            get: (a: any) => (a as number) + 1,
          }),
        })

        const cycleProgram = FieldContracts.buildFieldProgram(State as any, cycleSpec as any)
        FieldContracts.registerFieldProgram(rt, cycleProgram)

        const before = yield* rt.getState
        const exit = yield* Effect.exit(bump('in0'))
        expect(exit._tag).toBe('Failure')
        const after = yield* rt.getState
        expect(after).toEqual(before)
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const decisions = pickDecisionSummaries(ring)
      expect(decisions.length).toBeGreaterThanOrEqual(3)
      expect(decisions.some((d) => Array.isArray(d?.reasons) && d.reasons.includes('cache_hit'))).toBe(true)

      const errors = pickConfigErrors(ring)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]?.kind).toBe('field_kernel_config_error:CYCLE_DETECTED')
    }),
  )
})
