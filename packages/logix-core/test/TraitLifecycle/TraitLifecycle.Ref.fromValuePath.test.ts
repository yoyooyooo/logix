import { describe, it, expect } from '@effect/vitest'
import * as Logix from '../../src/index.js'

describe('TraitLifecycle.Ref.fromValuePath', () => {
  it('parses root/field/list/item refs (including pattern/index)', () => {
    expect(Logix.TraitLifecycle.Ref.fromValuePath('')).toEqual(Logix.TraitLifecycle.Ref.root())

    expect(Logix.TraitLifecycle.Ref.fromValuePath('$root')).toEqual(Logix.TraitLifecycle.Ref.root())

    expect(Logix.TraitLifecycle.Ref.fromValuePath('name')).toEqual(Logix.TraitLifecycle.Ref.field('name'))

    expect(Logix.TraitLifecycle.Ref.fromValuePath('items[]')).toEqual(Logix.TraitLifecycle.Ref.list('items'))

    expect(Logix.TraitLifecycle.Ref.fromValuePath('items[].warehouseId')).toEqual(
      Logix.TraitLifecycle.Ref.field('items[].warehouseId'),
    )

    expect(Logix.TraitLifecycle.Ref.fromValuePath('items.0')).toEqual(Logix.TraitLifecycle.Ref.item('items', 0))

    expect(Logix.TraitLifecycle.Ref.fromValuePath('items.0.warehouseId')).toEqual(
      Logix.TraitLifecycle.Ref.item('items', 0, { field: 'warehouseId' }),
    )

    expect(Logix.TraitLifecycle.Ref.fromValuePath('groups.0.items.3.warehouseId')).toEqual(
      Logix.TraitLifecycle.Ref.item('groups.items', 3, {
        listIndexPath: [0],
        field: 'warehouseId',
      }),
    )
  })
})
