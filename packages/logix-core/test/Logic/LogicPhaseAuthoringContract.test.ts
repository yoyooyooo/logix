import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as LogicPlanMarker from '../../src/internal/runtime/core/LogicPlanMarker.js'

describe('Logic phase authoring contract', () => {
  it('should allow declaration-phase readiness and field registration in the logic builder root while returning a run effect', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
      startCount: Schema.Number,
    })

    const Actions = {
      set: Schema.Number,
    }

    const M = Logix.Module.make('LogicPhaseAuthoringContract', {
      state: State,
      actions: Actions,
    })

    const L = M.logic('L#authoring-contract', ($) => {
      $.fields({
        sum: $.fields.computed({
          deps: ['value'],
          get: (value) => value,
        }),
      })
      $.readyAfter(Effect.void, { id: 'startup-marker' })

      return Effect.gen(function* () {
        yield* $.state.update((state) => ({
          ...state,
          startCount: state.startCount + 1,
        }))

        yield* $.onAction('set').run((action) =>
          $.state.update((state) => ({
            ...state,
            value: action.payload,
          })),
        )
      })
    })

    const program = Logix.Program.make(M, {
      initial: { value: 1, sum: 0, startCount: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readStateAndFields = Effect.gen(function* () {
      const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
      yield* Effect.yieldNow
      yield* rt.dispatch({ _tag: 'set', payload: 5 } as any)
      yield* Effect.yieldNow
      const state = yield* rt.getState
      const finalFields = CoreDebug.getModuleFinalFields(rt).map((t) => ({
        fieldId: t.fieldId,
        originType: t.provenance.originType,
        originId: t.provenance.originId,
      }))
      return { state, finalFields }
    }) as Effect.Effect<
      {
        readonly state: {
          readonly value: number
          readonly sum: number
          readonly startCount: number
        }
        readonly finalFields: ReadonlyArray<{
          readonly fieldId: string
          readonly originType: string
          readonly originId: string
        }>
      },
      never,
      any
    >

    try {
      const result = await runtime.runPromise(readStateAndFields)
      expect(result.state.startCount).toBe(1)
      expect(result.state.value).toBe(5)
      expect(result.state.sum).toBe(5)
      expect(result.finalFields).toEqual([
        {
          fieldId: 'sum',
          originType: 'logicUnit',
          originId: 'L#authoring-contract',
        },
      ])
    } finally {
      await runtime.dispose()
    }
  })

  it('rejects legacy public { setup, run } shape on Module.logic(...)', () => {
    const State = Schema.Struct({
      value: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicPhaseLegacyShape', {
      state: State,
      actions: Actions,
    })

    expect(() =>
      M.logic('L#legacy-shape', () => ({
        setup: Effect.void,
        run: Effect.void,
      }) as any),
    ).toThrow(/legacy .*setup, run.*removed|return the run effect/i)
  })

  it('rejects public LogicPlanEffect return on Module.logic(...)', () => {
    const State = Schema.Struct({
      value: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicPhaseLegacyPlanEffect', {
      state: State,
      actions: Actions,
    })

    expect(() =>
      M.logic('L#legacy-plan-effect', () => {
        const legacy = Effect.succeed({
          setup: Effect.void,
          run: Effect.void,
        }) as any
        LogicPlanMarker.markAsLogicPlanEffect(legacy)
        return legacy
      }),
    ).toThrow(/LogicPlanEffect|return the run effect|legacy/i)
  })
})
