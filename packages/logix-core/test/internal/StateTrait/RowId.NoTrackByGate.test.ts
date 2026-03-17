import { describe, expect, it } from '@effect/vitest'
import type { TxnDirtyEvidence } from '../../../src/internal/runtime/core/StateTransaction.js'
import { RowIdStore } from '../../../src/internal/state-trait/rowid.js'

const makeStableEvidence = (
  overrides?: Partial<Readonly<{ dirtyAll: boolean; rootTouched: boolean; itemTouched: ReadonlyArray<number> }>>,
): TxnDirtyEvidence => ({
  dirtyAll: overrides?.dirtyAll ?? false,
  dirtyAllReason: overrides?.dirtyAll ? 'unknownWrite' : undefined,
  dirtyPathIds: new Set<number>(),
  dirtyPathsKeyHash: 0,
  dirtyPathsKeySize: 0,
  list: {
    indexBindings: new Map(),
    rootTouched: overrides?.rootTouched ? new Set(['items@@']) : new Set(),
    itemTouched:
      overrides?.itemTouched && overrides.itemTouched.length > 0
        ? new Map([['items@@', new Set(overrides.itemTouched)]])
        : new Map(),
  },
})

describe('RowIdStore no-trackBy gate', () => {
  it('skips reconcile when txn evidence proves list structure is stable', () => {
    const store = new RowIdStore('i-no-trackby-stable')
    const initial = [{ value: 1 }, { value: 2 }, { value: 3 }]
    store.ensureList('items', initial)

    const updated = initial.map((item, index) => (index === 1 ? { ...item, value: item.value + 1 } : item))

    expect(
      store.canSkipNoTrackByListReconcile({
        listPath: 'items',
        items: updated,
        txnDirtyEvidence: makeStableEvidence(),
      }),
    ).toBe(true)
  })

  it('does not skip reconcile when list root was touched', () => {
    const store = new RowIdStore('i-no-trackby-root')
    const initial = [{ value: 1 }, { value: 2 }, { value: 3 }]
    store.ensureList('items', initial)

    const updated = initial.map((item, index) => (index === 1 ? { ...item, value: item.value + 1 } : item))

    expect(
      store.canSkipNoTrackByListReconcile({
        listPath: 'items',
        items: updated,
        txnDirtyEvidence: makeStableEvidence({ rootTouched: true }),
      }),
    ).toBe(false)
  })

  it('does not skip reconcile when a concrete list item was touched directly', () => {
    const store = new RowIdStore('i-no-trackby-item')
    const initial = [{ value: 1 }, { value: 2 }, { value: 3 }]
    store.ensureList('items', initial)

    const updated = initial.map((item, index) => (index === 1 ? { ...item, value: item.value + 1 } : item))

    expect(
      store.canSkipNoTrackByListReconcile({
        listPath: 'items',
        items: updated,
        txnDirtyEvidence: makeStableEvidence({ itemTouched: [1] }),
      }),
    ).toBe(false)
  })

  it('does not skip reconcile for trackBy lists', () => {
    const store = new RowIdStore('i-trackby')
    const initial = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }]
    store.ensureList('items', initial, 'id')

    const updated = initial.map((item, index) => (index === 1 ? { ...item, value: item.value + 1 } : item))

    expect(
      store.canSkipNoTrackByListReconcile({
        listPath: 'items',
        items: updated,
        trackBy: 'id',
        txnDirtyEvidence: makeStableEvidence(),
      }),
    ).toBe(false)
  })

  it('skips reconcile when the list reference is unchanged', () => {
    const store = new RowIdStore('i-same-ref')
    const items = [{ value: 1 }, { value: 2 }]
    store.ensureList('items', items)

    expect(
      store.canSkipNoTrackByListReconcile({
        listPath: 'items',
        items,
      }),
    ).toBe(true)
  })

  it('does not skip reconcile when txn evidence is unknown and list structure changed', () => {
    const store = new RowIdStore('i-unknown-structural')
    const initial = [{ value: 1 }, { value: 2 }, { value: 3 }]
    store.ensureList('items', initial)

    const shrunk = initial.slice(0, 2)

    expect(
      store.canSkipNoTrackByListReconcile({
        listPath: 'items',
        items: shrunk,
      }),
    ).toBe(false)
  })
})
