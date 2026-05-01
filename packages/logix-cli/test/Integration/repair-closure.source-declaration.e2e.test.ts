import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { primaryCompareReport, runCompareProofPack } from '../support/closureProofPack.js'

describe('CLI repair closure proof: source declaration', () => {
  it('closes before -> after compare through logix compare', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-source-closure-'))
    const result = await runCompareProofPack({ dir, family: 'source-declaration', runId: 'closure-source-declaration' })

    expect(result.command).toBe('compare')
    expect(result.ok).toBe(true)
    expect(primaryCompareReport(result)).toMatchObject({
      stage: 'compare',
      mode: 'compare',
      verdict: 'PASS',
      summary: 'Verification repair closed',
    })
  })
})
