import { describe, it, expect } from '@effect/vitest'
import * as SchemaPathMapping from '../src/SchemaPathMapping.js'

describe('SchemaPathMapping', () => {
  it('maps rename (segment) + array index', () => {
    const out = SchemaPathMapping.mapSchemaErrorToFieldPaths(
      { path: ['users', 0, 'user_id'] },
      { rename: { user_id: 'userId' } },
    )
    expect(out).toEqual(['users.0.userId'])
  })

  it('supports prefix flatten via rename mapping', () => {
    const out = SchemaPathMapping.mapSchemaErrorToFieldPaths({ path: ['meta', 'foo'] }, { rename: { meta: '' } })
    expect(out).toEqual(['foo'])
  })

  it('supports pattern rename with [] placeholders', () => {
    const out = SchemaPathMapping.mapSchemaErrorToFieldPaths(
      { path: ['items', 2, 'user_id'] },
      { rename: { 'items[].user_id': 'users[].userId' } },
    )
    expect(out).toEqual(['users.2.userId'])
  })

  it('does not infer paths from legacy issues arrays', () => {
    const out = SchemaPathMapping.mapSchemaErrorToFieldPaths({
      issues: [{ path: ['profile', 'email'] }],
    } as any)
    expect(out).toEqual([])
  })

  it('maps only explicit path from normalized decode fact', () => {
    const out = SchemaPathMapping.mapSchemaErrorToFieldPaths({
      path: ['profile', 'email'],
      code: 'invalid_email',
    } as any)
    expect(out).toEqual(['profile.email'])
  })
})
