import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '../../src/index.js'

describe('FieldRuntime.Ref.fromValuePath', () => {
  it('parses root/field/list/item refs (including pattern/index)', () => {
    expect(FieldContracts.fieldRef.fromValuePath('')).toEqual(FieldContracts.fieldRef.root())

    expect(FieldContracts.fieldRef.fromValuePath('$root')).toEqual(FieldContracts.fieldRef.root())

    expect(FieldContracts.fieldRef.fromValuePath('name')).toEqual(FieldContracts.fieldRef.field('name'))

    expect(FieldContracts.fieldRef.fromValuePath('items[]')).toEqual(FieldContracts.fieldRef.list('items'))

    expect(FieldContracts.fieldRef.fromValuePath('items[].warehouseId')).toEqual(
      FieldContracts.fieldRef.field('items[].warehouseId'),
    )

    expect(FieldContracts.fieldRef.fromValuePath('items.0')).toEqual(FieldContracts.fieldRef.item('items', 0))

    expect(FieldContracts.fieldRef.fromValuePath('items.0.warehouseId')).toEqual(
      FieldContracts.fieldRef.item('items', 0, { field: 'warehouseId' }),
    )

    expect(FieldContracts.fieldRef.fromValuePath('groups.0.items.3.warehouseId')).toEqual(
      FieldContracts.fieldRef.item('groups.items', 3, {
        listIndexPath: [0],
        field: 'warehouseId',
      }),
    )
  })
})
