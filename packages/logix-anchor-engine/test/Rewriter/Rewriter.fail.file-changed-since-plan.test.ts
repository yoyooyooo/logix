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

describe('anchor-engine rewriter (plan→write race guard)', () => {
  it('should fail when file changed since plan', async () => {
    const tmp = await makeTempRepo('repo-missing-anchors')
    try {
      const index = await Effect.runPromise(buildAnchorIndex({ repoRoot: tmp.repoRoot }))
      const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')
      const missingServices = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingServices')

      const plan = await Effect.runPromise(
        buildPatchPlan({
          repoRoot: tmp.repoRoot,
          mode: 'write',
          operations: [
            {
              file: 'mod-missing.ts',
              kind: 'AddObjectProperty',
              targetSpan: missingServices!.missing.services!.insertSpan,
              property: { name: 'services', valueCode: '{}' },
              reasonCodes: ['test.missing.services'],
            },
          ],
        }),
      )

      const filePath = path.join(tmp.repoRoot, 'mod-missing.ts')
      await fs.appendFile(filePath, '\n// changed since plan\n', 'utf8')

      const result = await Effect.runPromise(applyPatchPlan({ repoRoot: tmp.repoRoot, plan }))
      expect(result.modifiedFiles).toEqual([])
      expect(result.failed.length).toBe(1)
      expect(result.failed[0]?.reasonCodes.join('|')).toContain('rewriter.file.changed_since_plan')
    } finally {
      await tmp.cleanup()
    }
  })
})

