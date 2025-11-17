import * as Logix from '@logix/core'
import { Chunk, Deferred, Effect, FiberId, Layer, Schema, Stream } from 'effect'
import type { CrudApi, CrudDefaultQueryInput } from '@logix/domain'
import { makeOptimisticCrudModule } from './OptimisticCrudModule.js'

const OrderSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})

type Order = Schema.Schema.Type<typeof OrderSchema>

const apiWithDelay = (): CrudApi<Order, CrudDefaultQueryInput, string> => {
  const store = new Map<string, Order>()

  return {
    list: (input) =>
      Effect.sleep('80 millis').pipe(
        Effect.as({
          items: Array.from(store.values()).slice(0, input.pageSize),
          total: store.size,
        }),
      ),
    save: (entity) =>
      Effect.sleep('120 millis').pipe(
        Effect.flatMap(() => {
          if (entity.name === 'FAIL') {
            return Effect.fail(new Error('server rejected'))
          }
          store.set(entity.id, entity)
          return Effect.succeed(entity)
        }),
      ),
    remove: (id) =>
      Effect.sleep('120 millis').pipe(
        Effect.zipRight(
          Effect.sync(() => {
            store.delete(id)
          }),
        ),
      ),
  }
}

const waitFor = <S>(
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
      return first !== undefined ? Effect.succeed(first) : Effect.fail(new Error(`waitFor(${label}) got empty chunk`))
    }),
    Effect.timeoutFail({
      duration: '2 seconds',
      onTimeout: () => new Error(`waitFor(${label}) timeout`),
    }),
  )

const demo: Effect.Effect<void, unknown> = Effect.gen(function* () {
  const done = Deferred.unsafeMake<void, unknown>(FiberId.none)

  const Orders = makeOptimisticCrudModule('demo.OptimisticOrders', {
    entity: OrderSchema,
    initial: [],
    idField: 'id',
  })

  const LiveOrders = Orders.withLayer(Layer.succeed(Orders.services!.api, apiWithDelay()))

  const Host = Logix.Module.make('demo.OptimisticOrders.Host', {
    state: Schema.Struct({ ok: Schema.Boolean }),
    actions: {},
  })

  const Main = Host.logic(($) =>
    Effect.gen(function* () {
      const orders = yield* $.use(LiveOrders)
      const changes = orders.changes((s: any) => s)

      console.log('[OptimisticCrud] initial:', yield* orders.read((s: any) => s))

      // 1) optimistic save success
      yield* orders.controller.save({ id: 'o1', name: 'Alice' } satisfies Order)
      console.log(
        '[OptimisticCrud] after save(o1) optimistic:',
        yield* orders.read((s: any) => ({ items: s.items, pending: s.pending.length })),
      )

      yield* waitFor(changes, (s: any) => s.pending.length === 0 && s.items.length === 1, 'save(o1) -> committed')
      console.log(
        '[OptimisticCrud] after save(o1) committed:',
        yield* orders.read((s: any) => ({ items: s.items, pending: s.pending.length })),
      )

      // 2) optimistic save failure -> rollback
      yield* orders.controller.save({ id: 'o2', name: 'FAIL' } satisfies Order)
      console.log(
        '[OptimisticCrud] after save(o2) optimistic:',
        yield* orders.read((s: any) => ({ items: s.items, pending: s.pending.length })),
      )

      yield* waitFor(
        changes,
        (s: any) => s.pending.length === 0 && s.items.length === 1 && typeof s.error === 'string',
        'save(o2) -> rolled back',
      )
      console.log(
        '[OptimisticCrud] after save(o2) rolled back:',
        yield* orders.read((s: any) => ({ items: s.items, error: s.error })),
      )

      // 3) optimistic remove
      yield* orders.controller.remove('o1')
      console.log(
        '[OptimisticCrud] after remove(o1) optimistic:',
        yield* orders.read((s: any) => ({ items: s.items, pending: s.pending.length })),
      )

      yield* waitFor(changes, (s: any) => s.pending.length === 0 && s.items.length === 0, 'remove(o1) -> committed')
      console.log(
        '[OptimisticCrud] after remove(o1) committed:',
        yield* orders.read((s: any) => ({ items: s.items, pending: s.pending.length })),
      )

      yield* Deferred.succeed(done, undefined).pipe(Effect.asVoid)
    }).pipe(Effect.catchAllCause((cause) => Deferred.failCause(done, cause).pipe(Effect.asVoid))),
  )

  const host = Host.implement({
    initial: { ok: true },
    logics: [Main],
    imports: [LiveOrders.impl],
  })

  const runtime = Logix.Runtime.make(host)

  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          yield* Host.tag
          yield* Deferred.await(done)
        }) as Effect.Effect<void, never, any>,
      ),
    )
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

await Effect.runPromise(demo)
