import { describe, expect, it } from '@effect/vitest'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'
import { makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'

type DirtyPlanSnapshot = {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: string
  readonly rawKeySize: number
  readonly rootIds: Int32Array
  readonly rootKeyHash: number
  readonly rootCount: number
  readonly authority: string
  readonly fieldPathsKey?: string
  readonly list?: {
    readonly indexBindings: ReadonlyMap<string, ReadonlySet<number>>
  }
}

const readDirtyPlanSnapshot = <S>(ctx: StateTransaction.StateTxnContext<S>): DirtyPlanSnapshot | undefined =>
  (StateTransaction as any).readDirtyPlanSnapshot?.(ctx) as DirtyPlanSnapshot | undefined

const makeTxnContext = () =>
  StateTransaction.makeContext<{
    readonly user: { readonly name: string }
    readonly settings: { readonly locale: string }
    readonly items: ReadonlyArray<{ readonly name: string }>
  }>({
    instanceId: 'dirty-plan-test',
    getFieldPathIdRegistry: () =>
      makeFieldPathIdRegistry([
        ['user'],
        ['user', 'name'],
        ['settings'],
        ['settings', 'locale'],
        ['items'],
        ['items', 'name'],
      ]),
    getListPathSet: () => new Set(['items']),
  })

const makeInitialState = () => ({
  user: { name: 'a' },
  settings: { locale: 'zh-CN' },
  items: [{ name: 'i0' }, { name: 'i1' }, { name: 'i2' }],
})

const makeDirtyPlanForPaths = (paths: ReadonlyArray<string>): DirtyPlanSnapshot => {
  const ctx = makeTxnContext()
  StateTransaction.beginTransaction(ctx, { kind: 'test', name: 'dirty-plan' }, makeInitialState())
  for (const path of paths) {
    StateTransaction.recordPatch(ctx, path, 'reducer')
  }
  const plan = readDirtyPlanSnapshot(ctx)
  expect(plan).toBeDefined()
  return plan!
}

const makeDirtyPlanForUnknownWrite = (): DirtyPlanSnapshot => {
  const ctx = StateTransaction.makeContext<{ readonly user: { readonly name: string } }>({
    instanceId: 'dirty-plan-unknown',
    getFieldPathIdRegistry: () => undefined,
  })
  StateTransaction.beginTransaction(ctx, { kind: 'test', name: 'dirty-plan-unknown' }, { user: { name: 'a' } })
  StateTransaction.recordPatch(ctx, 'user.name', 'reducer')
  const plan = readDirtyPlanSnapshot(ctx)
  expect(plan).toBeDefined()
  return plan!
}

const pathNames = (plan: DirtyPlanSnapshot): ReadonlyArray<string> => {
  const registry = makeFieldPathIdRegistry([
    ['user'],
    ['user', 'name'],
    ['settings'],
    ['settings', 'locale'],
    ['items'],
    ['items', 'name'],
  ])
  return Array.from(plan.rootIds).map((id) => registry.fieldPaths[id]!.join('.'))
}

describe('StateTransaction dirty plan snapshot', () => {
  it('produces stable root hash for the same dirty set in different write orders', () => {
    const a = makeDirtyPlanForPaths(['user.name', 'settings.locale'])
    const b = makeDirtyPlanForPaths(['settings.locale', 'user.name'])

    expect(Array.from(a.rootIds)).toEqual(Array.from(b.rootIds))
    expect(a.rootKeyHash).toBe(b.rootKeyHash)
    expect(a.authority).toBe('field-path-registry')
    expect(a.fieldPathsKey).toBeDefined()
    expect(a.fieldPathsKey).toBe(b.fieldPathsKey)
  })

  it('collapses child paths under a dirty parent root', () => {
    const plan = makeDirtyPlanForPaths(['user', 'user.name'])

    expect(plan.rootCount).toBe(1)
    expect(pathNames(plan)).toEqual(['user'])
  })

  it('does not pretend unknown writes are exact', () => {
    const plan = makeDirtyPlanForUnknownWrite()

    expect(plan.dirtyAll).toBe(true)
    expect(plan.authority).not.toBe('field-path-registry')
    expect(plan.dirtyAllReason).toBeDefined()
  })

  it('represents no dirty as exact no dirty, not dirtyAll', () => {
    const plan = makeDirtyPlanForPaths([])

    expect(plan.dirtyAll).toBe(false)
    expect(plan.rawKeySize).toBe(0)
    expect(plan.rootCount).toBe(0)
    expect(plan.rootKeyHash).toBe(0)
    expect(plan.authority).toBe('field-path-registry')
  })

  it('does not let later transaction writes mutate an earlier phase snapshot', () => {
    const ctx = makeTxnContext()
    StateTransaction.beginTransaction(ctx, { kind: 'test', name: 'dirty-plan-list' }, makeInitialState())
    StateTransaction.recordPatch(ctx, 'items.1.name', 'reducer')
    const before = readDirtyPlanSnapshot(ctx)

    expect(before).toBeDefined()

    StateTransaction.recordPatch(ctx, 'items.2.name', 'reducer')
    const beforeIndices = before!.list?.indexBindings.get('items@@')

    expect(Array.from(beforeIndices ?? [])).toEqual([1])
  })

  it('memoizes unchanged dirty/list evidence within the same transaction', () => {
    const ctx = makeTxnContext()
    StateTransaction.beginTransaction(ctx, { kind: 'test', name: 'dirty-plan-memo' }, makeInitialState())
    StateTransaction.recordPatch(ctx, 'items.1.name', 'reducer')

    const a = readDirtyPlanSnapshot(ctx)
    const b = readDirtyPlanSnapshot(ctx)

    expect(a).toBeDefined()
    expect(b).toBe(a)

    StateTransaction.recordPatch(ctx, 'items.2.name', 'reducer')
    const c = readDirtyPlanSnapshot(ctx)

    expect(c).toBeDefined()
    expect(c).not.toBe(a)
  })
})
