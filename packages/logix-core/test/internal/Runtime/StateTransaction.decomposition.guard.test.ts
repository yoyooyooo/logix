import { readFileSync } from 'node:fs'
import { Effect, SubscriptionRef } from 'effect'
import { describe, expect, it } from 'vitest'
import * as Txn from '../../../src/internal/runtime/core/StateTransaction.js'

describe('StateTransaction decomposition guard', () => {
  it('keeps the public entry as a facade over focused modules', () => {
    const entry = readFileSync(new URL('../../../src/internal/runtime/core/StateTransaction.ts', import.meta.url), 'utf8')
    const types = readFileSync(
      new URL('../../../src/internal/runtime/core/StateTransaction.types.ts', import.meta.url),
      'utf8',
    )
    const context = readFileSync(
      new URL('../../../src/internal/runtime/core/StateTransaction.context.ts', import.meta.url),
      'utf8',
    )
    const lifecycle = readFileSync(
      new URL('../../../src/internal/runtime/core/StateTransaction.lifecycle.ts', import.meta.url),
      'utf8',
    )

    expect(entry).toContain("from './StateTransaction.types.js'")
    expect(entry).toContain("from './StateTransaction.context.js'")
    expect(entry).toContain("from './StateTransaction.lifecycle.js'")
    expect(entry).not.toContain('const MAX_PATCHES_FULL')
    expect(entry).not.toContain('const defaultNow')
    expect(entry).not.toContain('export const beginTransaction =')
    expect(entry).not.toContain('export const commitWithState =')
    expect(entry).not.toContain('export const abort =')

    expect(types).toContain('export interface StateTxnContext')
    expect(types).toContain('export interface StateTransaction')
    expect(context).toContain('const MAX_PATCHES_FULL')
    expect(context).toContain('export const makeContext')
    expect(lifecycle).toContain('export const beginTransaction')
    expect(lifecycle).toContain('export const commitWithState')
    expect(lifecycle).toContain('export const abort')
  })

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
