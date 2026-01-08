import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { getFieldArrayItemId, getTrackByForListPath } from '../../src/internal/form/rowid.js'

const RUNTIME_INTERNALS = Symbol.for('@logixjs/core/runtimeInternals')

const setRuntimeInternals = (runtime: object, internals: unknown): void => {
  Object.defineProperty(runtime, RUNTIME_INTERNALS, {
    value: internals,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

describe('Form internal rowId helpers', () => {
  it('reads trackBy from runtime list configs', () => {
    const runtime: any = { moduleId: 'FormRowIdTest', instanceId: 'i-1' }
    const internals = {
      instanceId: 'i-1',
      traits: {
        getListConfigs: () => [
          { path: 'items', trackBy: 'id' },
          { path: 'rows', trackBy: 'meta.key' },
        ],
      },
    }
    setRuntimeInternals(runtime, internals)

    expect(getTrackByForListPath(runtime, 'items')).toBe('id')
    expect(getTrackByForListPath(runtime, 'rows')).toBe('meta.key')
    expect(getTrackByForListPath(runtime, 'missing')).toBeUndefined()
  })

  it('prefers trackBy value for $rowId', () => {
    expect(
      getFieldArrayItemId({
        listPath: 'items',
        item: { id: 'row-1' },
        index: 0,
        trackBy: 'id',
        rowIds: ['r1'],
      }),
    ).toBe('row-1')

    expect(
      getFieldArrayItemId({
        listPath: 'items',
        item: { meta: { key: 123 } },
        index: 0,
        trackBy: 'meta.key',
        rowIds: ['r1'],
      }),
    ).toBe('123')
  })

  it('falls back to rowIdStore when trackBy is missing/unavailable', () => {
    expect(
      getFieldArrayItemId({
        listPath: 'items',
        item: {},
        index: 0,
        trackBy: 'id',
        rowIds: ['r1'],
      }),
    ).toBe('r1')

    expect(
      getFieldArrayItemId({
        listPath: 'items',
        item: {},
        index: 1,
        rowIdStore: { getRowId: () => 'r2' },
      }),
    ).toBe('r2')

    expect(
      getFieldArrayItemId({
        listPath: 'items',
        item: {},
        index: 2,
      }),
    ).toBe('2')
  })
})
