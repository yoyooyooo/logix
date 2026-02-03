import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { autofillAnchors } from '../../src/Autofill.js'
import { buildAnchorIndex } from '../../src/Parser.js'

describe('079 autofill report-only', () => {
  it('should not modify files in report mode', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-autofill-services')
    const file = path.join(repoRoot, 'mod.ts')
    const before = await fs.readFile(file, 'utf8')

    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r1', anchorIndex: index }))

    const after = await fs.readFile(file, 'utf8')
    expect(after).toBe(before)
  })
})

