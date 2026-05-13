import { describe, expect, it } from 'vitest'
import { collectSchemaV4OutdatedViolations } from './schema-v4-outdated'

describe('schema-v4 outdated scan', () => {
  it('keeps Stage 2 target modules free from current outdated schema patterns', () => {
    const violations = collectSchemaV4OutdatedViolations({
      roots: [
        'packages/logix-core/src',
        'packages/logix-form/src',
        'packages/logix-query/src',
      ],
    })

    expect(violations).toEqual([])
  })
})
