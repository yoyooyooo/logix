import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

describe('Query/Form source owner final boundary', () => {
  it('keeps invalidation/refetch naming in Query, not Form source public API', () => {
    const queryIndex = read('packages/logix-query/src/index.ts')
    const formIndex = read('packages/logix-form/src/index.ts')
    expect(queryIndex).toMatch(/Query|Engine|TanStack|invalidate|refresh/i)
    expect(formIndex).not.toContain('source.refresh')
    expect(formIndex).not.toContain('Form.Source')
  })
})
