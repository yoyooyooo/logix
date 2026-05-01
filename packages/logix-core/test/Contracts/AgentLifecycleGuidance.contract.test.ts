import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Agent lifecycle guidance', () => {
  it('teaches $.readyAfter and rejects replacement lifecycle families', () => {
    const source = readFileSync(
      new URL('../../../../skills/logix-best-practices/references/agent-first-api-generation.md', import.meta.url),
      'utf8',
    )

    expect(source).toContain('$.readyAfter(effect, { id?: string })')
    expect(source).toContain('不要生成 `$.lifecycle.*`')
    expect(source).toContain('`$.startup.*`')
    expect(source).toContain('`$.ready.*`')
    expect(source).toContain('`$.resources.*`')
    expect(source).toContain('`$.signals.*`')
  })
})
