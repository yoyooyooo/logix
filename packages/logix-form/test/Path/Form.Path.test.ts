import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Path from '../../src/Path.js'

describe('Form.Path', () => {
  it.effect('maps valuePath to pattern/errors/ui/fieldPath', () =>
    Effect.sync(() => {
      expect(Path.toPatternPath('profile.name')).toBe('profile.name')
      expect(Path.toPatternPath('items.0.warehouseId')).toBe('items[].warehouseId')
      expect(Path.toPatternPath('a.0.b.1.c')).toBe('a[].b[].c')

      expect(Path.toErrorsPath('profile.name')).toBe('errors.profile.name')
      expect(Path.toErrorsPath('items.0.warehouseId')).toBe('errors.items.rows.0.warehouseId')
      expect(Path.toErrorsPath('a.0.b.1.c')).toBe('errors.a.rows.0.b.rows.1.c')

      expect(Path.toUiPath('profile.name')).toBe('ui.profile.name')
      expect(Path.toUiPath('items.0.warehouseId')).toBe('ui.items.0.warehouseId')

      expect(Path.toFieldPath('items.0.warehouseId')).toEqual(['items', 'warehouseId'])
      expect(Path.toFieldPath('items[].warehouseId')).toEqual(['items', 'warehouseId'])

      expect(Path.toListPath('items.0.warehouseId')).toBe('items')
      expect(Path.toListPath('group.items.0.warehouseId')).toBe('group.items')
      expect(Path.toListPath('items')).toBeUndefined()
    }),
  )
})
