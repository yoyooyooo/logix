import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US4 ir diff)', () => {
  it('should gate diffs with PASS/VIOLATION/ERROR exit codes', async () => {
    const beforeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-diff-before-'))
    const afterDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-diff-after-'))
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-diff-out-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const ir1 = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'r1', '--entry', entry, '--out', beforeDir]))
    expect(ir1.kind).toBe('result')
    if (ir1.kind !== 'result') throw new Error('expected result')
    expect(ir1.exitCode).toBe(0)

    const ir2 = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'r2', '--entry', entry, '--out', afterDir]))
    expect(ir2.kind).toBe('result')
    if (ir2.kind !== 'result') throw new Error('expected result')
    expect(ir2.exitCode).toBe(0)

    const pass = await Effect.runPromise(
      runCli(['ir', 'diff', '--runId', 'd1', '--before', beforeDir, '--after', afterDir, '--out', outDir]),
    )
    expect(pass.kind).toBe('result')
    if (pass.kind !== 'result') throw new Error('expected result')
    expect(pass.exitCode).toBe(0)
    expect(pass.result.ok).toBe(true)
    const report1 = await readJson(path.join(outDir, 'ir.diff.report.json'))
    expect((report1 as any).kind).toBe('IrDiffReport')
    expect((report1 as any).status).toBe('pass')

    const manifestPath = path.join(afterDir, 'control-surface.manifest.json')
    const manifest = (await readJson(manifestPath)) as any
    manifest.__diffTest = 1
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

    const nonGating = await Effect.runPromise(runCli([
      'ir',
      'diff',
      '--runId',
      'd2',
      '--before',
      beforeDir,
      '--after',
      afterDir,
      '--out',
      outDir,
    ]))
    expect(nonGating.kind).toBe('result')
    if (nonGating.kind !== 'result') throw new Error('expected result')
    expect(nonGating.exitCode).toBe(0)
    expect(nonGating.result.ok).toBe(true)
    const report2 = await readJson(path.join(outDir, 'ir.diff.report.json'))
    expect((report2 as any).status).toBe('pass')
    expect(((report2 as any).nonGatingChangedFiles ?? []).length).toBeGreaterThan(0)

    const tampered = (await readJson(manifestPath)) as any
    tampered.digest = `${String(tampered.digest)}-tampered`
    await fs.writeFile(manifestPath, `${JSON.stringify(tampered, null, 2)}\n`, 'utf8')

    const violation = await Effect.runPromise(runCli([
      'ir',
      'diff',
      '--runId',
      'd3',
      '--before',
      beforeDir,
      '--after',
      afterDir,
      '--out',
      outDir,
    ]))
    expect(violation.kind).toBe('result')
    if (violation.kind !== 'result') throw new Error('expected result')
    expect(violation.exitCode).toBe(2)
    expect(violation.result.ok).toBe(false)
    expect(violation.result.error?.code).toMatch(/^CLI_VIOLATION_/)
    const report3 = await readJson(path.join(outDir, 'ir.diff.report.json'))
    expect((report3 as any).status).toBe('violation')
    expect(((report3 as any).changedFiles ?? []).length).toBeGreaterThan(0)

    await fs.writeFile(manifestPath, '{', 'utf8')
    const error = await Effect.runPromise(
      runCli(['ir', 'diff', '--runId', 'd4', '--before', beforeDir, '--after', afterDir, '--out', outDir]),
    )
    expect(error.kind).toBe('result')
    if (error.kind !== 'result') throw new Error('expected result')
    expect(error.exitCode).toBe(2)
    expect(error.result.ok).toBe(false)
    expect(error.result.error?.code).toBe('CLI_INVALID_INPUT')
    const report4 = await readJson(path.join(outDir, 'ir.diff.report.json'))
    expect((report4 as any).status).toBe('error')
    expect(((report4 as any).parseErrors ?? []).length).toBeGreaterThan(0)
  })
})
