import { describe, it, expect } from '@effect/vitest'
import { token } from '@logixjs/i18n'
import * as SchemaErrorMapping from '../src/SchemaErrorMapping.js'
import { countErrorLeaves } from '../src/internal/form/errors.js'

describe('SchemaErrorMapping', () => {
  it('auto maps schema error path to errors.$schema.* writes', () => {
    const schemaError = { path: ['profile', 'user_id'] }
    const next = SchemaErrorMapping.applySchemaErrorToState({}, schemaError, {
      rename: { user_id: 'userId' },
      toLeaf: () => 'E',
    })

    expect(next).toEqual({
      errors: { $schema: { profile: { userId: 'E' } } },
    })
  })

  it('uses errorMap escape hatch when provided', () => {
    const schemaError = { path: ['meta'] }
    const next = SchemaErrorMapping.applySchemaErrorToState({}, schemaError, {
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

  it('falls back to submit slot when path is unmappable', () => {
    const tree = SchemaErrorMapping.toSchemaErrorTree({ code: 'invalid_payload' } as any, {
      toLeaf: () => 'E3',
    })

    expect(tree).toEqual({
      $self: 'E3',
    })
  })

  it('does not write raw schema object by default', () => {
    const writes = SchemaErrorMapping.toSchemaErrorWrites({ path: ['name'] } as any)
    expect(writes[0]?.error).not.toEqual({ path: ['name'] })
  })

  it('defaults decode writes to canonical FormErrorLeaf values', () => {
    const writes = SchemaErrorMapping.toSchemaErrorWrites({
      path: ['profile', 'email'],
      code: 'invalid_email',
    } as any)

    expect(writes).toHaveLength(1)
    expect(writes[0]?.error).toEqual({
      origin: 'decode',
      severity: 'error',
      code: 'invalid_email',
      message: token('form.schema.invalid', { code: 'invalid_email' }),
    })
    expect(countErrorLeaves({ profile: { email: writes[0]?.error } })).toBe(1)
  })
})
