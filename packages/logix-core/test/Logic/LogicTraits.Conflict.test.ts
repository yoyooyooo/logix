import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicTraits - conflicts & consistency checks', () => {
  it('should hard-fail on duplicate traitId and include all sources', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsConflictDuplicate', {
      state: State,
      actions: Actions,
    })

    const dup = Logix.StateTrait.from(State)({
      sum: Logix.StateTrait.computed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const L1 = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(dup)
        }),
        run: Effect.void,
      }),
      { id: 'L#1' },
    )

    const L2 = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(dup)
        }),
        run: Effect.void,
      }),
      { id: 'L#2' },
    )

    const Impl = M.implement({
      initial: { value: 1, sum: 0 },
      logics: [L1, L2],
    })

    const runtime = Logix.Runtime.make(Impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const start = Effect.gen(function* () {
      yield* M.tag
    }) as Effect.Effect<void, never, any>

    try {
      const exit = await runtime.runPromiseExit(start)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return
      const pretty = String((exit.cause as any)?.pretty ?? exit.cause)
      expect(pretty).toContain('[ModuleTraitsConflictError]')
      expect(pretty).toContain('duplicate')
      expect(pretty).toContain('logicUnit:L#1')
      expect(pretty).toContain('logicUnit:L#2')
    } finally {
      await runtime.dispose()
    }
  })

  it('should hard-fail when requires is missing', async () => {
    const State = Schema.Struct({
      a: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsConflictMissingRequires', {
      state: State,
      actions: Actions,
    })

    const badTraits = {
      a: { requires: ['b'] },
    }

    const L = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(badTraits)
        }),
        run: Effect.void,
      }),
      { id: 'L#req' },
    )

    const Impl = M.implement({
      initial: { a: 1 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(Impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const start = Effect.gen(function* () {
      yield* M.tag
    }) as Effect.Effect<void, never, any>

    try {
      const exit = await runtime.runPromiseExit(start)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return
      const pretty = String((exit.cause as any)?.pretty ?? exit.cause)
      expect(pretty).toContain('[ModuleTraitsConflictError]')
      expect(pretty).toContain('missing requires')
      expect(pretty).toContain('missing requires for a')
      expect(pretty).toContain('b')
      expect(pretty).toContain('logicUnit:L#req')
    } finally {
      await runtime.dispose()
    }
  })

  it('should hard-fail on excludes violation and include both sources', async () => {
    const State = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsConflictExcludes', {
      state: State,
      actions: Actions,
    })

    const L1 = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare({ a: { excludes: ['b'] } })
        }),
        run: Effect.void,
      }),
      { id: 'L#A' },
    )

    const L2 = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare({ b: {} })
        }),
        run: Effect.void,
      }),
      { id: 'L#B' },
    )

    const Impl = M.implement({
      initial: { a: 1, b: 2 },
      logics: [L1, L2],
    })

    const runtime = Logix.Runtime.make(Impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const start = Effect.gen(function* () {
      yield* M.tag
    }) as Effect.Effect<void, never, any>

    try {
      const exit = await runtime.runPromiseExit(start)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return
      const pretty = String((exit.cause as any)?.pretty ?? exit.cause)
      expect(pretty).toContain('[ModuleTraitsConflictError]')
      expect(pretty).toContain('excludes violation')
      expect(pretty).toContain('present=b')
      expect(pretty).toContain('logicUnit:L#A')
      expect(pretty).toContain('logicUnit:L#B')
    } finally {
      await runtime.dispose()
    }
  })
})
