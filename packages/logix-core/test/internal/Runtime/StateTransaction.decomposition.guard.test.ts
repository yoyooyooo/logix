import { Effect, SubscriptionRef } from 'effect'
import { describe, expect, it } from 'vitest'
import * as Txn from '../../../src/internal/runtime/core/StateTransaction.js'

describe('StateTransaction decomposition guard', () => {
  it('preserves dirty evidence for explicit paths', async () => {
    const registry = {
      fieldPaths: [['count']],
      pathStringToId: new Map([['count', 0]]),
    }
    const ctx = Txn.makeContext<{ count: number }>({
      instanceId: 'guard',
      getFieldPathIdRegistry: () => registry as any,
    })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ref = yield* SubscriptionRef.make({ count: 0 })
        Txn.beginTransaction(ctx, { kind: 'test' }, { count: 0 })
        Txn.updateDraft(ctx, { count: 1 })
        Txn.recordPatch(ctx, 'count', 'reducer')
        return yield* Txn.commitWithState(ctx, ref)
      }),
    )

    expect(result?.transaction.dirty.dirtyAll).toBe(false)
    expect(result?.transaction.dirty.dirtyPathIds).toEqual([0])
  })

  it('degrades to dirtyAll when registry is missing', async () => {
    const ctx = Txn.makeContext<{ count: number }>({
      instanceId: 'guard',
      getFieldPathIdRegistry: () => undefined,
    })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ref = yield* SubscriptionRef.make({ count: 0 })
        Txn.beginTransaction(ctx, { kind: 'test' }, { count: 0 })
        Txn.updateDraft(ctx, { count: 1 })
        Txn.recordPatch(ctx, 'count', 'reducer')
        return yield* Txn.commitWithState(ctx, ref)
      }),
    )

    expect(result?.transaction.dirty).toMatchObject({
      dirtyAll: true,
      dirtyAllReason: 'customMutation',
    })
  })

  it('degrades to dirtyAll when no patch evidence exists', async () => {
    const registry = {
      fieldPaths: [['count']],
      pathStringToId: new Map([['count', 0]]),
    }
    const ctx = Txn.makeContext<{ count: number }>({
      instanceId: 'guard',
      getFieldPathIdRegistry: () => registry as any,
    })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ref = yield* SubscriptionRef.make({ count: 0 })
        Txn.beginTransaction(ctx, { kind: 'test' }, { count: 0 })
        Txn.updateDraft(ctx, { count: 1 })
        return yield* Txn.commitWithState(ctx, ref)
      }),
    )

    expect(result?.transaction.dirty).toMatchObject({
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
    })
  })
})
