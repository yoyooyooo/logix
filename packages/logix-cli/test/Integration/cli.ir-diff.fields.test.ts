import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<any> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (ir diff fields)', () => {
  it('should keep diff artifact fields stable for gate automation', async () => {
    const beforeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-diff-fields-before-'))
    const afterDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-diff-fields-after-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const ir1 = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'fd-r1', '--entry', entry, '--out', beforeDir]))
    const ir2 = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'fd-r2', '--entry', entry, '--out', afterDir]))
    expect(ir1.kind).toBe('result')
    expect(ir2.kind).toBe('result')
    if (ir1.kind !== 'result' || ir2.kind !== 'result') throw new Error('expected result')
    expect(ir1.exitCode).toBe(0)
    expect(ir2.exitCode).toBe(0)

    const manifestPath = path.join(afterDir, 'control-surface.manifest.json')
    const manifest = await readJson(manifestPath)
    manifest.digest = `${String(manifest.digest)}-tampered`
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

    const diff = await Effect.runPromise(
      runCli([
        'ir',
        'diff',
        '--runId',
        'fd-d1',
        '--before',
        beforeDir,
        '--after',
        afterDir,
        '--budgetBytes',
        '768',
      ]),
    )

    expect(diff.kind).toBe('result')
    if (diff.kind !== 'result') throw new Error('expected result')
    expect(diff.exitCode).toBe(2)
    expect(diff.result.ok).toBe(false)

    const artifact = diff.result.artifacts.find((item) => item.outputKey === 'irDiffReport')
    expect(artifact).toBeDefined()
    expect(artifact?.kind).toBe('IrDiffReport')
    expect(artifact?.schemaVersion).toBe(1)
    expect(artifact?.digest).toMatch(/^sha256:/)
    expect(typeof artifact?.budgetBytes).toBe('number')
    expect(Array.isArray(artifact?.reasonCodes)).toBe(true)
    expect(artifact?.reasonCodes).toContain('DIFF_CHANGED_FILES')
  })
})

