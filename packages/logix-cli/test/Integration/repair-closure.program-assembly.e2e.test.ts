import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { primaryCompareReport, runCompareProofPack } from '../support/closureProofPack.js'

describe('CLI repair closure proof: Program assembly', () => {
  it('closes before -> after compare through logix compare', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-program-closure-'))
    const result = await runCompareProofPack({ dir, family: 'program-assembly', runId: 'closure-program-assembly' })

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
