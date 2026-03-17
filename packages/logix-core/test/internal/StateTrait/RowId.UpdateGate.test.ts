import { describe, it, expect } from '@effect/vitest'
import { makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'
import type { TxnDirtyEvidenceSnapshot } from '../../../src/internal/runtime/core/StateTransaction.js'
import { shouldReconcileListConfigsByDirtyEvidence, type ListConfig } from '../../../src/internal/state-trait/rowid.js'

const makeDirty = (dirtyPathIds: ReadonlyArray<number>, dirtyAll = false): TxnDirtyEvidenceSnapshot => {
  if (dirtyAll) {
    return {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      dirtyPathIds: [],
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  return {
    dirtyAll: false,
    dirtyPathIds,
    dirtyPathsKeyHash: 0,
    dirtyPathsKeySize: dirtyPathIds.length,
  }
}

describe('RowId update gate', () => {
  it('should return false when list configs are empty', () => {
    const registry = makeFieldPathIdRegistry([['counter']])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should return true for dirtyAll regardless of rootIds', () => {
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([], true),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: undefined,
    })
    expect(shouldSync).toBe(true)
  })

  it('should conservatively return true when rootIds exist but registry is missing', () => {
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: undefined,
    })
    expect(shouldSync).toBe(true)
  })

  it('should return false when no-trackBy dirty root is nested under a list path', () => {
    const registry = makeFieldPathIdRegistry([
      ['orders', 'items', 'name'],
      ['meta', 'updatedAt'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should return true when dirty root is an ancestor of a list path', () => {
    const registry = makeFieldPathIdRegistry([
      ['orders'],
      ['meta', 'updatedAt'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should return true when no-trackBy dirty root is exactly the list path', () => {
    const registry = makeFieldPathIdRegistry([['orders', 'items']])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
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
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should conservatively return true for unknown rootIds', () => {
    const registry = makeFieldPathIdRegistry([['profile', 'name']])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([99]),
      listConfigs: [{ path: 'orders.items' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should ignore invalid/empty list config paths and keep no-trackBy nested writes gated', () => {
    const registry = makeFieldPathIdRegistry([['orders', 'items', 'name']])
    const listConfigs: ReadonlyArray<ListConfig> = [{ path: '   ' }, { path: 'orders.items' }]
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs,
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should conservatively return true when list path normalization fails', () => {
    const registry = makeFieldPathIdRegistry([['profile', 'name']])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: '*' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should match only same-root list paths when multiple list roots exist', () => {
    const registry = makeFieldPathIdRegistry([
      ['profile', 'friends'],
      ['orders', 'items'],
    ])

    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: 'orders.items' }, { path: 'profile.friends' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })

  it('should keep stable result when listConfigs contains duplicated paths under no-trackBy nested writes', () => {
    const registry = makeFieldPathIdRegistry([
      ['orders', 'items', 'name'],
      ['profile', 'name'],
    ])
    const listConfigs: ReadonlyArray<ListConfig> = [{ path: 'orders.items' }, { path: 'orders.items' }]

    const first = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs,
      fieldPathIdRegistry: registry,
    })
    const second = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs,
      fieldPathIdRegistry: registry,
    })

    expect(first).toBe(false)
    expect(second).toBe(false)
  })

  it('should return false when dirty roots are nested under a list path but do not overlap trackBy', () => {
    const registry = makeFieldPathIdRegistry([
      ['items', 'warehouseId'],
      ['items', 'id'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([0]),
      listConfigs: [{ path: 'items', trackBy: 'id' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(false)
  })

  it('should return true when dirty roots overlap a list trackBy field path', () => {
    const registry = makeFieldPathIdRegistry([
      ['items', 'warehouseId'],
      ['items', 'id'],
    ])
    const shouldSync = shouldReconcileListConfigsByDirtyEvidence({
      dirty: makeDirty([1]),
      listConfigs: [{ path: 'items', trackBy: 'id' }],
      fieldPathIdRegistry: registry,
    })
    expect(shouldSync).toBe(true)
  })
})
