import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildPatchPlan } from '../../src/Rewriter.js'
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

describe('anchor-engine rewriter (plan equivalence)', () => {
  it('should keep operations identical between report and write (except mode)', async () => {
    const tmp = await makeTempRepo('repo-missing-anchors')
    try {
      const index = await Effect.runPromise(buildAnchorIndex({ repoRoot: tmp.repoRoot }))
      const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')
      const missingServices = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingServices')

      const ops = [
        {
          file: 'mod-missing.ts',
          kind: 'AddObjectProperty' as const,
          targetSpan: missingServices!.missing.services!.insertSpan,
          property: { name: 'services', valueCode: '{}' },
          reasonCodes: ['test.missing.services'],
        },
      ]

      const report = await Effect.runPromise(buildPatchPlan({ repoRoot: tmp.repoRoot, mode: 'report', operations: ops }))
      const write = await Effect.runPromise(buildPatchPlan({ repoRoot: tmp.repoRoot, mode: 'write', operations: ops }))

      expect(report.mode).toBe('report')
      expect(write.mode).toBe('write')
      expect(write.operations).toEqual(report.operations)
    } finally {
      await tmp.cleanup()
    }
  })
})

