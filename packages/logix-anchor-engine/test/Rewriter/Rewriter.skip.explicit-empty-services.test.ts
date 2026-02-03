import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { Node, Project, SyntaxKind } from 'ts-morph'

import { buildPatchPlan } from '../../src/Rewriter.js'
import { insertSpanForObjectLiteral } from '../../src/internal/missingField.js'

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

describe('anchor-engine rewriter (explicit declaration skip)', () => {
  it('should skip when target property is already declared (services: {})', async () => {
    const tmp = await makeTempRepo('repo-missing-anchors')
    try {
      const absPath = path.join(tmp.repoRoot, 'mod-missing.ts')
      const fileText = await fs.readFile(absPath, 'utf8')

      const project = new Project({ useInMemoryFileSystem: true })
      const sourceFile = project.createSourceFile(absPath, fileText, { overwrite: true })

      const call = sourceFile
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .find((c) => c.getArguments()[0]?.getText() === "'missingDevSource'")
      expect(call).toBeTruthy()

      const defArg = call?.getArguments()[1]
      expect(defArg && Node.isObjectLiteralExpression(defArg)).toBe(true)

      const insertSpan = insertSpanForObjectLiteral(defArg as any)

      const plan = await Effect.runPromise(
        buildPatchPlan({
          repoRoot: tmp.repoRoot,
          mode: 'report',
          operations: [
            {
              file: 'mod-missing.ts',
              kind: 'AddObjectProperty',
              targetSpan: insertSpan,
              property: { name: 'services', valueCode: '{}' },
              reasonCodes: ['test.explicit.services'],
            },
          ],
        }),
      )

      const op = plan.operations[0]
      expect(op?.decision).toBe('skip')
      expect(op?.reasonCodes.join('|')).toContain('rewriter.property.already_declared')
    } finally {
      await tmp.cleanup()
    }
  })
})
