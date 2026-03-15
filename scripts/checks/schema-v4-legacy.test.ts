import { describe, expect, it } from 'vitest'
import { collectSchemaV4LegacyViolations } from './schema-v4-legacy'

describe('schema-v4 legacy scan', () => {
  it('keeps Stage 2 target modules free from current legacy schema patterns', () => {
    const violations = collectSchemaV4LegacyViolations({
      roots: [
        'packages/logix-core/src',
        'packages/logix-form/src',
        'packages/logix-query/src',
      ],
    })

    expect(violations).toEqual([])
  })
})
