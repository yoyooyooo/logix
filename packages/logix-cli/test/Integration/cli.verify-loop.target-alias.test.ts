import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveVerifyTargetPath } from '../../src/internal/verify-loop/realGateExecutor.js'

describe('logix-cli integration (verify-loop target alias)', () => {
  it('resolves examples:real to examples/logix path', () => {
    const repoRoot = path.resolve(__dirname, '../../../..')
    const resolved = resolveVerifyTargetPath('examples:real', repoRoot)
    expect(resolved).toBe(path.resolve(repoRoot, 'examples/logix'))
  })
})
