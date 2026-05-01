import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Cause, Chunk, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'

describe('Runtime + EffectOp bus semantics', () => {
  const State = Schema.Struct({ value: Schema.Number })
  const Actions = { bump: Schema.Void }

  const M = Logix.Module.make('OpSemantics', {
    state: State,
    actions: Actions,
  })

  it.effect('should attach linkId and keep it consistent across a dispatch chain', () =>
    Effect.gen(function* () {
      const events: Array<EffectOp.EffectOp<any, any, any>> = []

      const capture: EffectOp.Middleware = (op) =>
        Effect.sync(() => {
          events.push(op)
        }).pipe(Effect.flatMap(() => op.effect))

      const programModule = Logix.Program.make(M, {
        initial: { value: 0 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        middleware: [capture],
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)

        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const actionOps = events.filter((e) => e.kind === 'action')
        const stateOps = events.filter((e) => e.kind === 'state')

        expect(actionOps.length).toBeGreaterThan(0)
        expect(stateOps.length).toBeGreaterThan(0)

        const action = actionOps.find((e) => e.name === 'action:dispatch')!
        const stateUpdate = stateOps.find((e) => e.name === 'state:update')!

        expect(action.meta?.linkId).toBeDefined()
        expect(stateUpdate.meta?.linkId).toBeDefined()
        expect(stateUpdate.meta?.linkId).toBe(action.meta?.linkId)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('guard rejection should be an explicit failure and have no side effects', () =>
    Effect.gen(function* () {
      const guard: EffectOp.Middleware = (op) => {
        if (op.name === 'action:dispatch') {
          return Effect.fail(
            EffectOpCore.makeOperationRejected({
              message: 'blocked by test guard',
              kind: op.kind,
              name: op.name,
              linkId: op.meta?.linkId,
            }),
          )
        }
        return op.effect
      }

      const programModule = Logix.Program.make(M, {
        initial: { value: 0 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        middleware: [guard],
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)

        const exit = yield* Effect.exit(rt.dispatch({ _tag: 'bump', payload: undefined } as any))

        expect(exit._tag).toBe('Failure')

        if (exit._tag !== 'Failure') {
          throw new Error('expected Failure')
        }

        const failures = exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error)
        expect(failures.some((d) => (d as any)?._tag === 'OperationRejected')).toBe(true)

        // no side effects
        const state = yield* rt.getState
        expect(state.value).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('single dispatch should produce at most one state:update commit (0/1 commit) even with fields', () =>
    Effect.gen(function* () {
      const events: Array<EffectOp.EffectOp<any, any, any>> = []

      const capture: EffectOp.Middleware = (op) =>
        Effect.sync(() => {
          events.push(op)
        }).pipe(Effect.flatMap(() => op.effect))

      const FieldState = Schema.Struct({
        base: Schema.Number,
        derived: Schema.Number,
      })

      const FieldActions = { bump: Schema.Void }

      const FieldModule = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('OpSemanticsWithFields', {
  state: FieldState,
  actions: FieldActions
}), FieldContracts.fieldFrom(FieldState)({
          derived: FieldContracts.fieldComputed({
            deps: ['base'],
            get: (base) => base + 1,
          }),
        }))

      const FieldLogic = FieldModule.logic('trait-logic', ($) =>
        Effect.gen(function* () {
          yield* $.onAction('bump').mutate((draft) => {
            draft.base += 1
          })
        }),
      )

      const programModule = Logix.Program.make(FieldModule, {
        initial: { base: 0, derived: 1 },
        logics: [FieldLogic],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        middleware: [capture],
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(FieldModule.tag).pipe(Effect.orDie)

        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        // Give the fields watcher a chance to complete (the current phase still relies on watcher installation).
        yield* Effect.sleep('10 millis')

        const state = yield* rt.getState
        expect(state.base).toBe(1)
        expect(state.derived).toBe(2)

        const action = events.find((e) => e.kind === 'action' && e.name === 'action:dispatch')
        expect(action?.meta?.linkId).toBeDefined()

        const linkId = action?.meta?.linkId
        const commits = events.filter(
          (e) => e.kind === 'state' && e.name === 'state:update' && e.meta?.linkId != null && e.meta?.linkId === linkId,
        )

        expect(commits.length).toBeLessThanOrEqual(1)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect(
    'single dispatch should produce at most one state:update commit (0/1 commit) with scopedValidate + fields',
    () =>
      Effect.gen(function* () {
        const events: Array<EffectOp.EffectOp<any, any, any>> = []

        const capture: EffectOp.Middleware = (op) =>
          Effect.sync(() => {
            events.push(op)
          }).pipe(Effect.flatMap(() => op.effect))

        const FieldState = Schema.Struct({
          base: Schema.Number,
          derived: Schema.Number,
          errors: Schema.Any,
        })

        const FieldActions = { bump: Schema.Void }

        const FieldModule = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('OpSemanticsWithScopedValidate', {
  state: FieldState,
  actions: FieldActions
}), FieldContracts.fieldFrom(FieldState)({
            derived: FieldContracts.fieldComputed({
              deps: ['base'],
              get: (base) => base + 1,
            }),
            base: FieldContracts.fieldNode({
              check: {
                required: {
                  deps: [''],
                  validate: (value: unknown) => (typeof value === 'number' && value > 0 ? undefined : 'base_required'),
                },
              },
            }),
          }))

        const FieldLogic = FieldModule.logic('trait-logic-2', ($) =>
          Effect.gen(function* () {
            yield* $.onAction('bump').run(() =>
              Effect.gen(function* () {
                yield* $.state.mutate((draft) => {
                  draft.base += 1
                })
                yield* FieldContracts.fieldScopedValidate($ as any, {
                  mode: 'valueChange',
                  target: FieldContracts.fieldRef.field('base'),
                })
              }),
            )
          }),
        )

        const programModule = Logix.Program.make(FieldModule, {
          initial: { base: 0, derived: 1, errors: { base: 'preset' } },
          logics: [FieldLogic],
        })

        const runtime = Logix.Runtime.make(programModule, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          middleware: [capture],
        })

        const program = Effect.gen(function* () {
          const rt = yield* Effect.service(FieldModule.tag).pipe(Effect.orDie)

          yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

          // Give the watcher a chance to complete (the current phase still relies on watcher installation).
          yield* Effect.sleep('10 millis')

          const state: any = yield* rt.getState
          expect(state.base).toBe(1)
          expect(state.derived).toBe(2)
          expect(state.errors?.base).toBeUndefined()

          const action = events.find((e) => e.kind === 'action' && e.name === 'action:dispatch')
          expect(action?.meta?.linkId).toBeDefined()

          const linkId = action?.meta?.linkId
          const commits = events.filter(
            (e) =>
              e.kind === 'state' && e.name === 'state:update' && e.meta?.linkId != null && e.meta?.linkId === linkId,
          )

          expect(commits.length).toBeLessThanOrEqual(1)
        })

        yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
      }),
  )
})
