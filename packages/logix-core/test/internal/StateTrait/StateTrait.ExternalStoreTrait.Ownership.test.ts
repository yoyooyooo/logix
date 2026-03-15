import { describe, it, expect } from '@effect/vitest'
import { Cause, Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'

const flushMicrotasks = (times = 2): Effect.Effect<void> =>
  Effect.forEach(
    Array.from({ length: Math.max(0, times) }),
    () =>
      Effect.gen(function* () {
        yield* Effect.promise(() => new Promise<void>((r) => queueMicrotask(r)))
        yield* Effect.yieldNow
      }),
  )
    .pipe(Effect.asVoid)

const makeManualStore = <T>(initial: T) => {
  let current = initial
  const listeners = new Set<() => void>()
  const store: Logix.ExternalStore.ExternalStore<T> = {
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  const set = (next: T) => {
    current = next
    for (const listener of listeners) {
      listener()
    }
  }
  return { store, set }
}

describe('StateTrait.externalStore external-owned governance', () => {
  it('detects multiple writers (computed + externalStore)', () => {
    const State = Schema.Struct({ base: Schema.Number, value: Schema.Number })
    const { store } = makeManualStore(0)

    const traits = Logix.StateTrait.from(State)({
      value: Logix.StateTrait.node({
        computed: Logix.StateTrait.computed({
          deps: ['base'],
          get: (base) => base + 1,
        }),
        externalStore: Logix.StateTrait.externalStore({ store }),
      }),
    })

    const program = Logix.StateTrait.build(State, traits)

    expect(program.convergeIr?.configError?.code).toBe('MULTIPLE_WRITERS')
    expect(program.convergeIr?.configError?.fields).toEqual(['value'])
  })

  it.effect('fails fast on non-trait writes overlapping external-owned fields', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number, other: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const { store, set } = makeManualStore(0)

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          value: Logix.StateTrait.externalStore({ store }),
        }),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: -1, other: 0 },
        {
          moduleId: 'StateTraitExternalStoreOwnershipTest',
        },
      )

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'StateTraitExternalStoreOwnershipTest',
        },
      )

      yield* Logix.StateTrait.install(bound as any, program)

      const afterInstall = (yield* runtime.getState) as State
      expect(afterInstall.value).toBe(0)

      yield* bound.state.mutate((draft: any) => {
        draft.other = 1
      })
      const afterOther = (yield* runtime.getState) as State
      expect(afterOther.other).toBe(1)

      const mutateExternalOwned = yield* Effect.exit(
        bound.state.mutate((draft: any) => {
          draft.value = 2
        }),
      )
      expect(mutateExternalOwned._tag).toBe('Failure')
      if (mutateExternalOwned._tag === 'Failure') {
        const defects = mutateExternalOwned.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
        expect(defects.some((d: unknown) => (d as any)?.name === 'ExternalOwnedWriteError')).toBe(true)
      }

      const rootWrite = yield* Effect.exit(runtime.setState({ value: 3, other: 2 } as any))
      expect(rootWrite._tag).toBe('Failure')
      if (rootWrite._tag === 'Failure') {
        const defects = rootWrite.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
        expect(defects.some((d: unknown) => (d as any)?.name === 'ExternalOwnedWriteError')).toBe(true)
      }

      set(5)
      yield* flushMicrotasks(6)

      const afterExternalWriteback = (yield* runtime.getState) as State
      expect(afterExternalWriteback.value).toBe(5)
    }),
  )

  it.effect('fails fast with external-owned fields containing special key characters', () =>
    Effect.gen(function* () {
      const ownedKey = 'value|pipe:😀'
      const StateSchema = Schema.Struct({ [ownedKey]: Schema.Number, other: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const { store, set } = makeManualStore(0)

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          [ownedKey]: Logix.StateTrait.externalStore({ store }),
        } as any),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { [ownedKey]: -1, other: 0 } as State,
        {
          moduleId: 'StateTraitExternalStoreOwnershipSpecialKeyTest',
        },
      )

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'StateTraitExternalStoreOwnershipSpecialKeyTest',
        },
      )

      yield* Logix.StateTrait.install(bound as any, program)

      const afterInstall = (yield* runtime.getState) as State
      expect((afterInstall as any)[ownedKey]).toBe(0)

      yield* bound.state.mutate((draft: any) => {
        draft.other = 1
      })
      const afterOther = (yield* runtime.getState) as State
      expect(afterOther.other).toBe(1)

      const mutateExternalOwned = yield* Effect.exit(
        bound.state.mutate((draft: any) => {
          draft[ownedKey] = 2
        }),
      )
      expect(mutateExternalOwned._tag).toBe('Failure')
      if (mutateExternalOwned._tag === 'Failure') {
        const defects = mutateExternalOwned.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
        expect(defects.some((d: unknown) => (d as any)?.name === 'ExternalOwnedWriteError')).toBe(true)
      }

      const rootWrite = yield* Effect.exit(runtime.setState({ [ownedKey]: 3, other: 2 } as any))
      expect(rootWrite._tag).toBe('Failure')
      if (rootWrite._tag === 'Failure') {
        const defects = rootWrite.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
        expect(defects.some((d: unknown) => (d as any)?.name === 'ExternalOwnedWriteError')).toBe(true)
      }

      set(7)
      yield* flushMicrotasks(6)

      const afterExternalWriteback = (yield* runtime.getState) as State
      expect((afterExternalWriteback as any)[ownedKey]).toBe(7)
    }),
  )
})
