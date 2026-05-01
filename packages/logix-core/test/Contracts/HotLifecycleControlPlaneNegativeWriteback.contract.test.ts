import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(import.meta.dirname, '../../../..')

describe('hot lifecycle control-plane negative writeback', () => {
  it('keeps HMR lifecycle out of root runtime command surface', () => {
    const control = readFileSync(
      resolve(repoRoot, 'docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md'),
      'utf8',
    )

    expect(control).toContain('no new runtime.hmr')
    expect(control).toContain('no new Runtime.hmr')
    expect(control).toContain('no HMR-specific report protocol')
  })
})
