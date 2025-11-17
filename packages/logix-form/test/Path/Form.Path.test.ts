import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Form from '../../src/index.js'

describe('Form.Path', () => {
  it.effect('maps valuePath to pattern/errors/ui/fieldPath', () =>
    Effect.sync(() => {
      expect(Form.Path.toPatternPath('profile.name')).toBe('profile.name')
      expect(Form.Path.toPatternPath('items.0.warehouseId')).toBe('items[].warehouseId')
      expect(Form.Path.toPatternPath('a.0.b.1.c')).toBe('a[].b[].c')

      expect(Form.Path.toErrorsPath('profile.name')).toBe('errors.profile.name')
      expect(Form.Path.toErrorsPath('items.0.warehouseId')).toBe('errors.items.rows.0.warehouseId')
      expect(Form.Path.toErrorsPath('a.0.b.1.c')).toBe('errors.a.rows.0.b.rows.1.c')

      expect(Form.Path.toUiPath('profile.name')).toBe('ui.profile.name')
      expect(Form.Path.toUiPath('items.0.warehouseId')).toBe('ui.items.0.warehouseId')

      expect(Form.Path.toFieldPath('items.0.warehouseId')).toEqual(['items', 'warehouseId'])
      expect(Form.Path.toFieldPath('items[].warehouseId')).toEqual(['items', 'warehouseId'])

      expect(Form.Path.toListPath('items.0.warehouseId')).toBe('items')
      expect(Form.Path.toListPath('group.items.0.warehouseId')).toBe('group.items')
      expect(Form.Path.toListPath('items')).toBeUndefined()
    }),
  )
})
