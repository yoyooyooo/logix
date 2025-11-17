import { describe, it, expect } from 'vitest'
import { Deferred, Effect, Exit, FiberId, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Form from '../../../logix-form/src/index.js'
import * as Crud from '../../../domain/src/index.js'

describe('Module common entrypoints', () => {
  it('should consume Form + CRUD via $.use(module) and Runtime.make(module)', async () => {
    const ValuesSchema = Schema.Struct({
      name: Schema.String,
    })

    type Values = Schema.Schema.Type<typeof ValuesSchema>

    const form = Form.make('ModuleCommon.Form', {
      values: ValuesSchema,
      initialValues: { name: '' } satisfies Values,
    })

    const EntitySchema = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    })

    type Entity = Schema.Schema.Type<typeof EntitySchema>

    const crudBase = Crud.CRUDModule.make('ModuleCommon.Crud', {
      entity: EntitySchema,
      initial: [],
    })

    const crudApi: Crud.CrudApi<Entity, Crud.CrudDefaultQueryInput, string> = {
      list: (_input) => Effect.succeed({ items: [], total: 0 }),
      save: (entity) => Effect.succeed(entity),
      remove: (_id) => Effect.void,
    }

    const crud = crudBase.withLayer(Layer.succeed(crudBase.services.api, crudApi))

    const Host = Logix.Module.make('ModuleCommon.Host', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: {},
    })

    const done = Deferred.unsafeMake<Exit.Exit<void, unknown>>(FiberId.none)

    const hostLogic = Host.logic(($) =>
      Effect.gen(function* () {
        const f = yield* $.use(form)
        const c = yield* $.use(crud)

        yield* f.controller.setError('name', 'oops')
        yield* c.controller.save({ id: 'e1', name: 'Alice' } satisfies Entity)

        for (let i = 0; i < 20; i++) {
          const state = (yield* c.read((s: any) => s)) as any
          if (Array.isArray(state.items) && state.items.length === 1) return
          yield* Effect.yieldNow()
        }
      }).pipe(
        Effect.exit,
        Effect.flatMap((exit) => Deferred.succeed(done, exit)),
      ),
    )

    const host = Host.implement({
      initial: { ok: true },
      logics: [hostLogic],
      imports: [form.impl, crud.impl],
    })

    const runtime = Logix.Runtime.make(host, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* Host.tag
          const exit = yield* Deferred.await(done)
          expect(Exit.isSuccess(exit)).toBe(true)

          const formRuntime = yield* form.tag
          const crudRuntime = yield* crud.tag

          const formState: any = yield* formRuntime.getState
          expect(formState.errors?.$manual?.name).toBe('oops')

          const crudState: any = yield* crudRuntime.getState
          expect(Array.isArray(crudState.items)).toBe(true)
          expect(crudState.items.length).toBe(1)
        }) as Effect.Effect<void, never, any>,
      )
    } finally {
      await runtime.dispose()
    }
  })
})
