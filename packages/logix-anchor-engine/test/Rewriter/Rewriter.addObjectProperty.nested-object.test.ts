import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { applyPatchPlan, buildPatchPlan } from '../../src/Rewriter.js'
import { buildAnchorIndex } from '../../src/Parser.js'

const makeTempRepo = async (fixtureName: string): Promise<{ readonly repoRoot: string; readonly cleanup: () => Promise<void> }> => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-anchor-engine-rewriter-'))
  const repoRoot = path.join(tmpRoot, fixtureName)
  const src = path.resolve(__dirname, '..', 'fixtures', fixtureName)
  await fs.cp(src, repoRoot, { recursive: true })
  return {
    repoRoot,
    cleanup: async () => {
      await fs.rm(tmpRoot, { recursive: true, force: true })
    },
  }
}

describe('anchor-engine rewriter (nested object literal)', () => {
  it('should support AddObjectProperty on workflow step args object', async () => {
    const tmp = await makeTempRepo('repo-autofill-workflow-stepkey')
    try {
      const index = await Effect.runPromise(buildAnchorIndex({ repoRoot: tmp.repoRoot }))
      const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')
      const wfTarget = targets.find((t) => t.target.kind === 'workflow' && t.target.workflowLocalIdLiteral === 'WStepKey')
      expect(wfTarget?.missing.workflowStepKey?.insertSpan).toBeTruthy()

      const valueCode = JSON.stringify('nested.key')
      const plan = await Effect.runPromise(
        buildPatchPlan({
          repoRoot: tmp.repoRoot,
          mode: 'write',
          operations: [
            {
              file: 'workflow.ts',
              kind: 'AddObjectProperty',
              targetSpan: wfTarget!.missing.workflowStepKey!.insertSpan,
              property: { name: 'key', valueCode },
              reasonCodes: ['test.nested.object'],
            },
          ],
        }),
      )

      expect(plan.summary.writableTotal).toBe(1)

      const result = await Effect.runPromise(applyPatchPlan({ repoRoot: tmp.repoRoot, plan }))
      expect(result.failed).toEqual([])

      const wfFile = path.join(tmp.repoRoot, 'workflow.ts')
      const text = await fs.readFile(wfFile, 'utf8')
      expect(text.includes(`key: ${valueCode}`)).toBe(true)
    } finally {
      await tmp.cleanup()
    }
  })
})

