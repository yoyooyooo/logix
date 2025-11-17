import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Form from '../src/index.js'

describe('SchemaErrorMapping', () => {
  it('auto maps schema error path to errors.$schema.* writes', () => {
    const schemaError = { path: ['profile', 'user_id'] }
    const next = Form.SchemaErrorMapping.applySchemaErrorToState({}, schemaError, {
      rename: { user_id: 'userId' },
      toLeaf: () => 'E',
    })

    expect(next).toEqual({
      errors: { $schema: { profile: { userId: 'E' } } },
    })
  })

  it('uses errorMap escape hatch when provided', () => {
    const schemaError = { path: ['meta'] }
    const next = Form.SchemaErrorMapping.applySchemaErrorToState({}, schemaError, {
      errorMap: () => ['foo', 'items.0.bar'],
      toLeaf: () => 'E2',
    })

    expect(next).toEqual({
      errors: {
        $schema: {
          foo: 'E2',
          items: { rows: [{ bar: 'E2' }] },
        },
      },
    })
  })
})
