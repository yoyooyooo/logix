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

describe('079 workflow stepKey autofill', () => {
  it('should write missing step keys and be idempotent', async () => {
    const srcRoot = path.resolve(__dirname, '../fixtures/repo-autofill-workflow-stepkey')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-autofill-wf-'))
    const repoRoot = path.join(tmp, 'repo')
    await copyDir(srcRoot, repoRoot)

    const index1 = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'write', runId: 'w1', anchorIndex: index1 }))

    const wfFile = path.join(repoRoot, 'workflow.ts')
    const text = await fs.readFile(wfFile, 'utf8')
    expect(text.includes('key: \"dispatch.a\"')).toBe(true)
    expect(text.includes('key: \"dispatch.a.2\"')).toBe(true)
    expect(text.includes('key: \"call.svc/one\"')).toBe(true)
    expect(text.includes('key: \"delay.10ms\"')).toBe(true)

    const index2 = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const out2 = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r2', anchorIndex: index2 }))
    expect(out2.patchPlan.summary.writableTotal).toBe(0)
  })
})

