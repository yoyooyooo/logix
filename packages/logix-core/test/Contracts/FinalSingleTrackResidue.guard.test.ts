import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')

describe('Final single-track docs/source residue scanner', () => {
  it('passes for current docs, specs, packages, and examples', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        ['scripts/final-cutover/scan-single-track-residue.mjs', '--profile', 'all', '--format', 'table'],
        { cwd: repoRoot, stdio: 'pipe' },
      ),
    ).not.toThrow()
  })
})
