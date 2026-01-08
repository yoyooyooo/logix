import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

describe('Form derived guardrails', () => {
  it('derived only allows writing to values/ui (reject errors/$form/$root)', () => {
    const ValuesSchema = Schema.Struct({
      name: Schema.String,
    })

    type Values = Schema.Schema.Type<typeof ValuesSchema>

    const make = (derived: any) =>
      Form.make('Form.Derived.Guardrails', {
        values: ValuesSchema,
        initialValues: { name: '' } satisfies Values,
        derived,
      })

    expect(() =>
      make({
        'ui.upperName': Form.Trait.computed<any, any, any>({
          deps: ['name'],
          get: (name: any) => String(name ?? '').toUpperCase(),
        }),
      }),
    ).not.toThrow()

    expect(() =>
      make({
        'errors.name': Form.Trait.computed<any, any, any>({
          deps: ['name'],
          get: () => 'NO',
        }),
      }),
    ).toThrow(/only values\/ui are allowed/)

    expect(() =>
      make({
        '$form.submitCount': Form.Trait.computed<any, any, any>({
          deps: ['name'],
          get: () => 1,
        }),
      }),
    ).toThrow(/only values\/ui are allowed/)

    expect(() =>
      make({
        $root: Form.Trait.computed<any, any, any>({
          deps: ['name'],
          get: () => 1,
        }),
      }),
    ).toThrow(/only values\/ui are allowed/)
  })

  it.scoped('exposes controller.* via $.use(form) ModuleHandle', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make('Form.Derived.Guardrails.Form', {
        values: ValuesSchema,
        initialValues: { name: '' } satisfies Values,
        traits: Logix.StateTrait.from(ValuesSchema)({
          name: Logix.StateTrait.node<string>({
            check: {
              required: {
                deps: ['name'],
                validate: (value: string) => (String(value ?? '').trim() ? undefined : 'required'),
              },
            },
          }),
        }),
      })

      const Host = Logix.Module.make('Form.Derived.Guardrails.Host', {
        state: Schema.Struct({
          hasController: Schema.Boolean,
          nameError: Schema.UndefinedOr(Schema.String),
        }),
        actions: {},
      })

      const HostLogic = Host.logic(($) =>
        Logix.Logic.of<typeof Host.shape, any, void, any>(
          Effect.gen(function* () {
            const handle = (yield* $.use(form)) as any
            const hasController =
              typeof handle?.controller?.validate === 'function' &&
              typeof handle?.controller?.validatePaths === 'function' &&
              typeof handle?.controller?.handleSubmit === 'function'

            yield* $.state.mutate((draft) => {
              draft.hasController = hasController
            })

            if (!hasController) return

            yield* handle.controller.validatePaths('name')
            const nameError = yield* handle.read((s: any) => s?.errors?.name)

            yield* $.state.mutate((draft) => {
              draft.nameError = typeof nameError === 'string' ? nameError : undefined
            })
          }) as any,
        ),
      )

      const impl = Host.implement({
        initial: { hasController: false, nameError: undefined },
        logics: [HostLogic],
        imports: [form.impl],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const hostRuntime = yield* Host.tag
        yield* Effect.sleep('50 millis')
        const state = yield* hostRuntime.getState
        expect(state.hasController).toBe(true)
        expect(state.nameError).toBe('required')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
