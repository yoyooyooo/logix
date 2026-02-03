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

describe('anchor-engine rewriter (idempotency)', () => {
  it('should become a no-op after the property is written', async () => {
    const tmp = await makeTempRepo('repo-missing-anchors')
    try {
      const index = await Effect.runPromise(buildAnchorIndex({ repoRoot: tmp.repoRoot }))
      const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')
      const missingServices = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingServices')
      expect(missingServices?.missing.services?.insertSpan).toBeTruthy()

      const op = {
        file: 'mod-missing.ts',
        kind: 'AddObjectProperty' as const,
        targetSpan: missingServices!.missing.services!.insertSpan,
        property: { name: 'services', valueCode: '{}' },
        reasonCodes: ['test.idempotent'],
      }

      const plan1 = await Effect.runPromise(buildPatchPlan({ repoRoot: tmp.repoRoot, mode: 'write', operations: [op] }))
      expect(plan1.summary.writableTotal).toBe(1)
      const result1 = await Effect.runPromise(applyPatchPlan({ repoRoot: tmp.repoRoot, plan: plan1 }))
      expect(result1.failed).toEqual([])

      const plan2 = await Effect.runPromise(buildPatchPlan({ repoRoot: tmp.repoRoot, mode: 'write', operations: [op] }))
      expect(plan2.summary.writableTotal).toBe(0)
      expect(plan2.summary.skippedTotal).toBe(1)
      expect(plan2.operations[0]?.reasonCodes ?? []).toContain('rewriter.property.already_declared')
    } finally {
      await tmp.cleanup()
    }
  })
})

