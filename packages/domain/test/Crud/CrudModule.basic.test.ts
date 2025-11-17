import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, FiberId, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { CRUDModule, type CrudApi, type CrudDefaultQueryInput } from '../../src/index.js'

describe('CRUDModule.basic', () => {
  it.scoped('Runtime.make/$.use/withLogic basics', () =>
    Effect.gen(function* () {
      const Entity = Schema.Struct({
        id: Schema.String,
        name: Schema.String,
      })

      type Entity = Schema.Schema.Type<typeof Entity>

      const calls: string[] = []

      const Crud = CRUDModule.make('CrudModule.basic', {
        entity: Entity,
        initial: [],
      })

      const api: CrudApi<Entity, CrudDefaultQueryInput, string> = {
        list: (input) =>
          Effect.sync(() => {
            calls.push(`list:${input.pageSize}`)
            return {
              items: [{ id: 'e1', name: 'Alice' } satisfies Entity],
              total: 1,
            }
          }),
        save: (entity) =>
          Effect.sync(() => {
            calls.push(`save:${entity.id}`)
            return entity
          }),
        remove: (id) =>
          Effect.sync(() => {
            calls.push(`remove:${id}`)
          }),
      }

      const seedDone = Deferred.unsafeMake<void>(FiberId.none)
      const hostDone = Deferred.unsafeMake<void>(FiberId.none)

      const Seed = Crud.logic(
        ($) =>
          Effect.gen(function* () {
            const self = yield* $.self
            expect(typeof self.controller.save).toBe('function')
            expect(self.services.api).toBe(Crud.services.api)
            yield* Deferred.succeed(seedDone, undefined)
          }),
        { id: 'Seed' },
      )

      const Live = Crud.withLogic(Seed).withLayers(Layer.succeed(Crud.services.api, api))

      const Host = Logix.Module.make('CrudModule.basic.Host', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: {},
      })

      const HostLogic = Host.logic(($) =>
        Effect.gen(function* () {
          const crud = yield* $.use(Live)
          yield* Deferred.await(seedDone)

          const waitForItems = (expectedLength: number) =>
            Effect.gen(function* () {
              for (let i = 0; i < 40; i++) {
                const state = yield* crud.read((s) => s)
                if (state.items.length === expectedLength && state.loading === false) {
                  return state.items
                }
                yield* Effect.yieldNow()
              }
              const final = yield* crud.read((s) => s)
              return yield* Effect.fail(
                new Error(
                  `timeout waiting for items=${expectedLength} (got=${final.items.length}, loading=${final.loading})`,
                ),
              )
            })

          yield* crud.controller.list({ pageSize: 10 })
          const items1 = yield* waitForItems(1)
          expect(items1[0]?.id).toBe('e1')

          yield* crud.controller.save({ id: 'e2', name: 'Bob' } satisfies Entity)
          yield* waitForItems(2)

          yield* crud.controller.remove('e1')
          const items2 = yield* waitForItems(1)
          expect(items2[0]?.id).toBe('e2')

          expect(calls).toEqual(['list:10', 'save:e2', 'remove:e1'])

          yield* Deferred.succeed(hostDone, undefined)
        }),
      )

      const host = Host.implement({
        initial: { ok: true },
        logics: [HostLogic],
        imports: [Live.impl],
      })

      const runtime = Logix.Runtime.make(host)

      const program = Effect.gen(function* () {
        yield* Host.tag
        yield* Deferred.await(hostDone)
      })

      yield* Effect.promise(() => runtime.runPromise(program))
    }),
  )
})
