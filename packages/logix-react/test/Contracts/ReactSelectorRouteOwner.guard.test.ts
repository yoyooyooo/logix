import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('React selector route owner guard', () => {
  it('does not keep local selector topic eligibility policy in useSelector', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/internal/hooks/useSelector.ts'),
      'utf8',
    )

    expect(source).not.toContain('selectorTopicEligible')
    expect(source).not.toContain('lane ===')
    expect(source).toContain('RuntimeContracts.Selector.route')
  })
})
