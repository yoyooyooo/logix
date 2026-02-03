import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { autofillAnchors } from '../../src/Autofill.js'
import { buildAnchorIndex } from '../../src/Parser.js'

const copyDir = async (from: string, to: string): Promise<void> => {
  await fs.mkdir(to, { recursive: true })
  await fs.cp(from, to, { recursive: true })
}

describe('079 autofill write idempotency', () => {
  it('should be idempotent for module anchors', async () => {
    const srcRoot = path.resolve(__dirname, '../fixtures/repo-autofill-services')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-autofill-'))
    const repoRoot = path.join(tmp, 'repo')
    await copyDir(srcRoot, repoRoot)

    const index1 = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const w1 = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'write', runId: 'w1', anchorIndex: index1 }))
    expect(w1.writeBackResult?.failed.length ?? 0).toBe(0)

    const index2 = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const w2 = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'write', runId: 'w2', anchorIndex: index2 }))
    expect(w2.patchPlan.summary.writableTotal).toBe(0)
  })
})

