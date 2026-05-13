import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

describe('Form field behavior guardrails', () => {
  it('field behaviors only allow writing to values/ui (reject errors/$form/$root)', () => {
    const ValuesSchema = Schema.Struct({
      name: Schema.String,
    })

    type Values = Schema.Schema.Type<typeof ValuesSchema>

    const make = (buildNode: (z: any) => any) =>
      Form.make(
        'Form.FieldBehavior.Guardrails',
        {
          values: ValuesSchema,
          initialValues: { name: '' } satisfies Values,
        },
        (form) => {
          const z = form.dsl as any
          form.rules(z.schema(z.object(buildNode(z))))
        },
      )

    expect(() =>
      make((z) => ({
        ui: z.object({
          upperName: z.computed({
            deps: ['name'],
            get: (name: unknown) => String(name ?? '').toUpperCase(),
          }),
        }),
      })),
    ).not.toThrow()

    expect(() =>
      make((z) => ({
        errors: z.object({
          name: z.computed({
            deps: ['name'],
            get: () => 'NO',
          }),
        }),
      })),
    ).toThrow(/cannot write to "errors\.name"/)

    expect(() =>
      make((z) => ({
        $form: z.object({
          submitCount: z.computed({
            deps: ['name'],
            get: () => 1,
          }),
        }),
      })),
    ).toThrow(/cannot write to "\$form\.submitCount"/)

    expect(() =>
      make((z) => ({
        $root: z.computed({
          deps: ['name'],
          get: () => 1,
        }),
      })),
    ).toThrow(/\$root/)
  })

  it.effect('exposes direct handle methods via $.use(form) ModuleHandle', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>
      const form = Form.make(
        'Form.FieldBehavior.Guardrails.Form',
        {
          values: ValuesSchema,
          initialValues: { name: '' } satisfies Values,
        },
        (define) => {
          define.field('name').rule({
            deps: ['name'],
            validate: (value: unknown) => (String(value ?? '').trim() ? undefined : 'required'),
          })
        },
      )

      const Host = Logix.Module.make('Form.FieldBehavior.Guardrails.Host', {
        state: Schema.Struct({
          hasCommands: Schema.Boolean,
          nameError: Schema.UndefinedOr(Schema.String),
        }),
        actions: {},
      })

      const HostLogic = Host.logic('host-logic', ($) =>
        Effect.gen(function* () {
          const handle = (yield* $.use(form)) as any
          const hasDirectHandle =
            typeof handle?.validate === 'function' &&
            typeof handle?.validatePaths === 'function' &&
            typeof handle?.submit === 'function'

          yield* $.state.mutate((draft) => {
            draft.hasCommands = hasDirectHandle
          })

          if (!hasDirectHandle) return

          yield* handle.validatePaths('name')
          const nameError = yield* handle.read((s: any) => s?.errors?.name)

          yield* $.state.mutate((draft) => {
            draft.nameError = typeof nameError === 'string' ? nameError : undefined
          })
        }) as any,
      )

      const impl = Logix.Program.make(Host, {
        initial: { hasCommands: false, nameError: undefined },
        logics: [HostLogic],
        capabilities: {
          imports: [form],
        },
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const hostRuntime = yield* Effect.service(Host.tag).pipe(Effect.orDie)

        let state = yield* hostRuntime.getState
        for (let i = 0; i < 100; i += 1) {
          if (state.hasCommands === true && state.nameError === 'required') break
          yield* Effect.sleep('5 millis')
          state = yield* hostRuntime.getState
        }

        expect(state.hasCommands).toBe(true)
        expect(state.nameError).toBe('required')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
