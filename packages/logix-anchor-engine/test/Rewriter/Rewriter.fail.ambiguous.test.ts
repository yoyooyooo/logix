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

describe('anchor-engine rewriter (ambiguous/unsafe shapes)', () => {
  it('should fail when target object contains spread', async () => {
    const tmp = await makeTempRepo('repo-rewrite-ambiguous')
    try {
      const index = await Effect.runPromise(buildAnchorIndex({ repoRoot: tmp.repoRoot }))
      const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')
      const target = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'rewriteAmbiguous')
      expect(target?.missing.services?.insertSpan).toBeTruthy()

      const plan = await Effect.runPromise(
        buildPatchPlan({
          repoRoot: tmp.repoRoot,
          mode: 'write',
          operations: [
            {
              file: 'mod.ts',
              kind: 'AddObjectProperty',
              targetSpan: target!.missing.services!.insertSpan,
              property: { name: 'services', valueCode: '{}' },
              reasonCodes: ['test.spread'],
            },
          ],
        }),
      )

      expect(plan.summary.failedTotal).toBe(1)
      expect(plan.operations[0]?.reasonCodes ?? []).toContain('rewriter.target.object_has_spread')

      const result = await Effect.runPromise(applyPatchPlan({ repoRoot: tmp.repoRoot, plan }))
      expect(result.modifiedFiles).toEqual([])
      expect(result.failed.length).toBe(1)
    } finally {
      await tmp.cleanup()
    }
  })
})

