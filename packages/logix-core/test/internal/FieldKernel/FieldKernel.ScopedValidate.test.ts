import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import { buildDependencyGraph } from '../../../src/internal/field-kernel/graph.js'
import { reverseClosure } from '../../../src/internal/field-kernel/reverse-closure.js'

describe('FieldKernel scoped validate · ReverseClosure', () => {
  it.effect('includes all downstream dependents for a target field', () =>
    Effect.sync(() => {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        isAdult: Schema.Boolean,
        signUpPermission: Schema.Boolean,
      })

      type State = Schema.Schema.Type<typeof StateSchema>

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        isAdult: FieldContracts.fieldComputed({
          deps: ['age'],
          get: (age) => age >= 18,
        }),
        signUpPermission: FieldContracts.fieldComputed({
          deps: ['isAdult'],
          get: (isAdult) => isAdult,
        }),
        $root: FieldContracts.fieldNode({
          check: {
            canSignUp: {
              deps: ['signUpPermission'],
              validate: (_input: unknown) => _input,
            },
          },
        }),
      })

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const graph = buildDependencyGraph(program)

      expect(Array.from(reverseClosure(graph, 'age')).sort()).toEqual(
        ['$root', 'age', 'isAdult', 'signUpPermission'].sort(),
      )

      expect(Array.from(reverseClosure(graph, 'isAdult')).sort()).toEqual(
        ['$root', 'isAdult', 'signUpPermission'].sort(),
      )
    }),
  )

  it.effect('reuses cached dependency graph when program edges reference is stable', () =>
    Effect.sync(() => {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        isAdult: Schema.Boolean,
      })

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        isAdult: FieldContracts.fieldComputed({
          deps: ['age'],
          get: (age) => age >= 18,
        }),
      })

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

      const first = buildDependencyGraph(program)
      const second = buildDependencyGraph(program)
      expect(second).toBe(first)

      const graph = (program as any).graph
      ;(program as any).graph = {
        ...graph,
        edges: [...graph.edges],
      }

      const third = buildDependencyGraph(program)
      expect(third).not.toBe(first)
    }),
  )
})

describe('FieldKernel scoped validate · writeback', () => {
  it.effect('writes check result into state.errors with ReverseClosure minimal set', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        age: Schema.Number,
        isAdult: Schema.Boolean,
        signUpPermission: Schema.Boolean,
        name: Schema.String,
        errors: Schema.Any,
      })

      const Actions = {
        setAge: Schema.Struct({ age: Schema.Number }),
        validateAge: Schema.Void,
      }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('ScopedValidateWriteback', {
  state: StateSchema,
  actions: Actions,
  reducers: {
          setAge: (s: any, a: any) => ({ ...s, age: a.payload.age }),
          validateAge: (s: any) => s,
        }
}), FieldContracts.fieldFrom(StateSchema)({
          isAdult: FieldContracts.fieldComputed({
            deps: ['age'],
            get: (age: any) => age >= 18,
          }),
          signUpPermission: FieldContracts.fieldComputed({
            deps: ['isAdult'],
            get: (isAdult: any) => isAdult,
          }),
          $root: FieldContracts.fieldNode({
            check: {
              canSignUp: {
                deps: ['signUpPermission'],
                validate: (input: any) => (input && input.signUpPermission ? undefined : 'forbidden'),
              },
            },
          }),
          name: FieldContracts.fieldNode({
            check: {
              required: {
                deps: ['name'],
                validate: () => 'required',
              },
            },
          }),
        }))

      const ValidateLogic = M.logic('validate-logic', ($) =>
        Effect.gen(function* () {
          yield* $.onAction('validateAge').run(() =>
            FieldContracts.fieldScopedValidate($ as any, {
              mode: 'manual',
              target: FieldContracts.fieldRef.field('age'),
            }),
          )
        }),
      )

      const programModule = Logix.Program.make(M, {
        initial: {
          age: 10,
          isAdult: false,
          signUpPermission: false,
          name: '',
          errors: { name: 'preset' },
        } as any,
        logics: [ValidateLogic],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)

        // First update age (converge produces the latest derived values within the same transaction).
        yield* rt.dispatch({ _tag: 'setAge', payload: { age: 10 } } as any)

        // Then trigger scoped validate (writes errors back within the watcher transaction).
        yield* rt.dispatch({ _tag: 'validateAge', payload: undefined } as any)
        yield* Effect.sleep('10 millis')

        const state1: any = yield* rt.getState
        expect(state1.errors.name).toBe('preset')
        expect(state1.errors.$root).toBe('forbidden')

        // After age becomes adult, validating again should clear the signUpPermission error.
        yield* rt.dispatch({ _tag: 'setAge', payload: { age: 20 } } as any)
        yield* rt.dispatch({ _tag: 'validateAge', payload: undefined } as any)
        yield* Effect.sleep('10 millis')

        const state2: any = yield* rt.getState
        expect(state2.signUpPermission).toBe(true)
        expect(state2.errors.$root).toBeUndefined()
        expect(state2.errors.name).toBe('preset')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
