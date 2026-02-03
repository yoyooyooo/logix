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

describe('anchor-engine rewriter (write-back)', () => {
  it('should write minimal diffs for AddObjectProperty and be deterministic', async () => {
    const tmp = await makeTempRepo('repo-missing-anchors')
    try {
      const index = await Effect.runPromise(buildAnchorIndex({ repoRoot: tmp.repoRoot }))
      const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')

      const missingServices = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingServices')
      const missingDevSource = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingDevSource')

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
            {
              file: 'mod-missing.ts',
              kind: 'AddObjectProperty',
              targetSpan: missingDevSource!.missing.devSource!.insertSpan,
              property: {
                name: 'source',
                valueCode: "{ file: 'mod-missing.ts', line: 1, column: 1 }",
              },
              reasonCodes: ['test.missing.devSource'],
            },
          ],
        }),
      )

      const result = await Effect.runPromise(applyPatchPlan({ repoRoot: tmp.repoRoot, plan }))
      expect(result.kind).toBe('WriteBackResult')
      expect(result.mode).toBe('write')
      expect(result.failed).toEqual([])

      const filePath = path.join(tmp.repoRoot, 'mod-missing.ts')
      const text = await fs.readFile(filePath, 'utf8')

      expect(text).toContain("services: {},")
      expect(text).toContain("dev: { source: { file: 'mod-missing.ts', line: 1, column: 1 } },")

      expect(result.modifiedFiles).toEqual([{ file: 'mod-missing.ts', changeKind: 'updated' }])
    } finally {
      await tmp.cleanup()
    }
  })
})

