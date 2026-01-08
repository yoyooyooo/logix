import * as Logix from '@logixjs/core'
import { Chunk, Effect, Layer, Stream } from 'effect'
import type { CrudApi, CrudDefaultQueryInput } from '@logixjs/domain'
import { OrdersCrud, type Order } from './crud.business.module.js'

const apiInMemory = (): CrudApi<Order, CrudDefaultQueryInput, string> => {
  const store = new Map<string, Order>()

  return {
    list: (input) =>
      Effect.sync(() => ({
        items: Array.from(store.values()).slice(0, input.pageSize),
        total: store.size,
      })),
    save: (entity) =>
      Effect.sync(() => {
        store.set(entity.id, entity)
        return entity
      }),
    remove: (id) =>
      Effect.sync(() => {
        store.delete(id)
      }),
  }
}

const waitFor = <S extends { readonly loading: boolean }>(
  changes: Stream.Stream<S>,
  predicate: (state: S) => boolean,
  label: string,
): Effect.Effect<S, Error> =>
  changes.pipe(
    Stream.filter(predicate),
    Stream.take(1),
    Stream.runCollect,
    Effect.flatMap((chunk) => {
      const first = Chunk.toReadonlyArray(chunk)[0]
      return first ? Effect.succeed(first) : Effect.fail(new Error(`waitFor(${label}) got empty chunk`))
    }),
    Effect.timeoutFail({
      duration: '500 millis',
      onTimeout: () => new Error(`waitFor(${label}) timeout`),
    }),
  )

const demo: Effect.Effect<void, unknown> = Effect.gen(function* () {
  const LiveOrders = OrdersCrud.withLayers(Layer.succeed(OrdersCrud.services.api, apiInMemory()))

  const runtime = Logix.Runtime.make(LiveOrders)

  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const orders = yield* OrdersCrud.tag
          const changes = orders.changes((s) => s)

          console.log('[OrdersCrud] initial:', yield* orders.getState)

          yield* orders.dispatch({ _tag: 'query', payload: { pageSize: 10 } })
          console.log(
            '[OrdersCrud] after list:',
            yield* waitFor(changes, (s) => s.loading === false, 'list -> loading=false'),
          )

          yield* orders.dispatch({ _tag: 'save', payload: { id: 'o1', name: 'Alice', age: 11 } satisfies Order })
          console.log(
            '[OrdersCrud] after save:',
            yield* waitFor(changes, (s) => s.loading === false && s.items.length === 1, 'save -> items.length=1'),
          )

          yield* orders.dispatch({ _tag: 'remove', payload: 'o1' })
          console.log(
            '[OrdersCrud] after remove:',
            yield* waitFor(changes, (s) => s.loading === false && s.items.length === 0, 'remove -> items.length=0'),
          )
        }),
      ),
    )
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

await Effect.runPromise(demo)
