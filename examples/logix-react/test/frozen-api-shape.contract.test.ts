import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '@logixjs/form'
import { fieldValue, rawFormMeta, RuntimeProvider, useDispatch, useImportedModule, useModule, useSelector } from '@logixjs/react'
import formPkg from '@logixjs/form/package.json' with { type: 'json' }
import reactPkg from '@logixjs/react/package.json' with { type: 'json' }
import { materializeExtendedHandle } from '../../../packages/logix-form/test/support/form-harness'

const expectFn = (value: unknown) => expect(typeof value).toBe('function')

describe('frozen API shape conformance gate', () => {
  it('keeps the core Runtime / Program / Module spine reachable without productizing deferred compare', () => {
    const Root = Logix.Module.make('FrozenApiShape.Root', {
      state: Schema.Struct({ ready: Schema.Boolean }),
      actions: {},
    })

    expectFn(Logix.Module.make)
    expectFn(Root.logic)
    expectFn(Logix.Program.make)
    expectFn(Logix.Runtime.make)
    expectFn(Logix.Runtime.check)
    expectFn(Logix.Runtime.trial)

    expect((Logix as any).Observability).toBeUndefined()
    expect((Logix as any).Reflection).toBeUndefined()
    expect((Logix.Runtime as any).compare).toBeUndefined()
  })

  it('keeps the frozen Form authoring and runtime handle shape reachable', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const Values = Schema.Struct({
          name: Schema.String,
          profileId: Schema.String,
          profileResource: Schema.Unknown,
          items: Schema.Array(
            Schema.Struct({
              id: Schema.String,
              value: Schema.String,
              warehouseId: Schema.String,
            }),
          ),
        })

        const form = Form.make(
          'FrozenApiShape.Form',
          {
            values: Values,
            initialValues: {
              name: '',
              profileId: 'u1',
              profileResource: { status: 'idle' },
              items: [{ id: 'row-1', value: 'a', warehouseId: 'wh-1' }],
            },
          },
          ($) => {
            expectFn($.rules)
            expectFn($.field('name').rule)
            expectFn($.field('profileResource').source)
            expectFn($.field('profileResource').companion)
            expectFn($.root)
            expectFn($.list)
            expectFn($.submit)

            $.field('name').rule(
              Form.Rule.make({
                validate: (value) => (String(value).trim() ? undefined : 'name-required'),
              }),
            )
            $.field('profileResource').source({
              resource: { id: 'frozen/profile' },
              deps: ['profileId'],
              key: (profileId) => (profileId ? { profileId: String(profileId) } : undefined),
              triggers: ['onMount', 'onKeyChange'],
              debounceMs: 0,
              concurrency: 'switch',
              submitImpact: 'observe',
            })
            $.field('profileResource').companion({
              deps: ['profileId'],
              lower: ({ deps }) => ({
                availability: deps.profileId ? { kind: 'interactive' } : { kind: 'hidden' },
                candidates: {
                  items: deps.profileId ? [deps.profileId] : [],
                  keepCurrent: true,
                },
              }),
            })
            $.list('items', {
              identity: { mode: 'trackBy', trackBy: 'id' },
              item: Form.Rule.make({
                validate: (row) => ((row as { value?: string }).value ? undefined : 'item-required'),
              }),
            })
            $.root(Form.Rule.make({ validate: () => undefined }))
            $.submit()
          },
        )

        const runtime = Logix.Runtime.make(form, {
          layer: Layer.empty as Layer.Layer<any, never, never>,
        })

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const moduleRuntime: any = yield* Effect.service(form.tag as never).pipe(Effect.orDie)
              const handle: any = materializeExtendedHandle(form.tag, moduleRuntime, {
                legacyCompat: false,
              })

              expectFn(handle.validate)
              expectFn(handle.validatePaths)
              expectFn(handle.submit)
              expectFn(handle.reset)
              expectFn(handle.setError)
              expectFn(handle.clearErrors)
              expectFn(handle.field)
              expectFn(handle.fieldArray)
              expectFn(handle.field('name').set)
              expectFn(handle.field('name').blur)

              const array = handle.fieldArray('items')
              for (const method of ['append', 'prepend', 'insert', 'update', 'replace', 'remove', 'swap', 'move'] as const) {
                expectFn(array[method])
              }
              expectFn(array.byRowId('row-1').update)
              expectFn(array.byRowId('row-1').remove)

              expect((handle as any).commands).toBeUndefined()
            }) as Effect.Effect<void, never, any>,
          ),
        )
      }),
    )
  })

  it('keeps Form selector primitive namespaces opaque and host-consumable', () => {
    expectFn(Form.Rule.make)
    expectFn(Form.Error.field)
    expectFn(Form.Companion.field)
    expectFn(Form.Companion.byRowId)

    const error = Form.Error.field('name') as Record<string, unknown>
    const companion = Form.Companion.field('profileResource') as Record<string, unknown>
    const rowCompanion = Form.Companion.byRowId('items', 'row-1', 'warehouseId') as Record<string, unknown>

    expect(Object.keys(error)).toEqual([])
    expect(Object.keys(companion)).toEqual([])
    expect(Object.keys(rowCompanion)).toEqual([])
    expect(typeof error).not.toBe('function')
    expect(typeof companion).not.toBe('function')
    expect(typeof rowCompanion).not.toBe('function')
  })

  it('keeps React host route and rejected wrapper families stable', () => {
    expectFn(RuntimeProvider)
    expectFn(useModule)
    expectFn(useImportedModule)
    expectFn(useDispatch)
    expectFn(useSelector)
    expectFn(fieldValue)
    expectFn(rawFormMeta)

    expect((reactPkg.exports as Record<string, unknown>)['./Form']).toBeUndefined()
    expect((reactPkg.exports as Record<string, unknown>)['./ModuleScope']).toBeUndefined()
    expect((formPkg.exports as Record<string, unknown>)['./react']).toBeUndefined()
    expect((formPkg.exports as Record<string, unknown>)['./Source']).toBeUndefined()
    expect((formPkg.exports as Record<string, unknown>)['./Companion']).toBeUndefined()
  })
})
