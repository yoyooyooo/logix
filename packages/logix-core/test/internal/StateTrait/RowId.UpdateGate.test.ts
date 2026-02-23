import { describe, it, expect } from '@effect/vitest'
import { hashFieldPathIds, makeFieldPathIdRegistry, type DirtySet } from '../../../src/internal/field-path.js'
import { shouldReconcileListConfigsByDirtySet, type ListConfig } from '../../../src/internal/state-trait/rowid.js'

const makeDirtySet = (rootIds: ReadonlyArray<number>, dirtyAll = false): DirtySet => {
  if (dirtyAll) {
    return {
      dirtyAll: true,
      reason: 'unknownWrite',
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  return {
    dirtyAll: false,
    rootIds,
    rootCount: rootIds.length,
    keySize: rootIds.length,
    keyHash: hashFieldPathIds(rootIds),
  }
}

describe('RowId update gate', () => {
  it('should return false when list configs are empty', () => {
    const registry = makeFieldPathIdRegistry([['counter']])
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs: [],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should return true for dirtyAll regardless of rootIds', () => {
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([], true),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: undefined,
    })
    expect(shouldSync).toBe(true)
  })

  it('should conservatively return true when rootIds exist but registry is missing', () => {
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: undefined,
    })
    expect(shouldSync).toBe(true)
  })

  it('should return true when dirty root is nested under a list path', () => {
    const registry = makeFieldPathIdRegistry([
      ['orders', 'items', 'name'],
      ['meta', 'updatedAt'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should return true when dirty root is an ancestor of a list path', () => {
    const registry = makeFieldPathIdRegistry([
      ['orders'],
      ['meta', 'updatedAt'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should return false when dirty roots do not overlap any list path', () => {
    const registry = makeFieldPathIdRegistry([
      ['profile', 'name'],
      ['meta', 'updatedAt'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should conservatively return true for unknown rootIds', () => {
    const registry = makeFieldPathIdRegistry([['profile', 'name']])
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([99]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should ignore invalid/empty list config paths', () => {
    const registry = makeFieldPathIdRegistry([['orders', 'items', 'name']])
    const listConfigs: ReadonlyArray<ListConfig> = [{ path: '   ' }, { path: 'orders.items' }]
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs,
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should conservatively return true when list path normalization fails', () => {
    const registry = makeFieldPathIdRegistry([['profile', 'name']])
    const shouldSync = shouldReconcileListConfigsByDirtySet({
      dirtySet: makeDirtySet([0]),
      listConfigs: [{ path: '*' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })
})
