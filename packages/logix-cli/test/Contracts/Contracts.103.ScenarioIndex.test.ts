import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SCENARIO_INDEX = path.resolve(__dirname, '../../../../specs/103-cli-minimal-kernel-self-loop/contracts/scenario-index.md')

describe('contracts 103 scenario-index', () => {
  it('contains S01-S10 and primitive-only chain guidance', async () => {
    const text = await fs.readFile(SCENARIO_INDEX, 'utf8')

    for (const scenarioId of ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10']) {
      expect(text).toContain(`| ${scenarioId} `)
    }

    expect(text).toContain('describe -> ir export -> trialrun --emit evidence')
    expect(text).toContain('不新增 CLI 子命令')
    expect(text).toContain('next-actions exec')
    expect(text).toContain('verify-loop')
  })
})
