import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US4 ir validate)', () => {
  it('should gate exported artifacts with PASS/VIOLATION/ERROR exit codes', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-validate-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const ir = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'r1', '--entry', entry, '--out', tmp]))
    expect(ir.kind).toBe('result')
    if (ir.kind !== 'result') throw new Error('expected result')
    expect(ir.exitCode).toBe(0)

    const pass = await Effect.runPromise(runCli(['ir', 'validate', '--runId', 'v1', '--in', tmp, '--out', tmp]))
    expect(pass.kind).toBe('result')
    if (pass.kind !== 'result') throw new Error('expected result')
    expect(pass.exitCode).toBe(0)
    expect(pass.result.ok).toBe(true)

    const report1 = await readJson(path.join(tmp, 'ir.validate.report.json'))
    expect((report1 as any).kind).toBe('IrValidateReport')
    expect((report1 as any).status).toBe('pass')

    await fs.unlink(path.join(tmp, 'control-surface.manifest.json'))
    const violation = await Effect.runPromise(runCli(['ir', 'validate', '--runId', 'v2', '--in', tmp, '--out', tmp]))
    expect(violation.kind).toBe('result')
    if (violation.kind !== 'result') throw new Error('expected result')
    expect(violation.exitCode).toBe(2)
    expect(violation.result.ok).toBe(false)
    expect(violation.result.error?.code).toMatch(/^CLI_VIOLATION_/)

    const report2 = await readJson(path.join(tmp, 'ir.validate.report.json'))
    expect((report2 as any).status).toBe('violation')
    expect((report2 as any).missingRequiredFiles).toContain('control-surface.manifest.json')

    await fs.writeFile(path.join(tmp, 'control-surface.manifest.json'), '{', 'utf8')
    const error = await Effect.runPromise(runCli(['ir', 'validate', '--runId', 'v3', '--in', tmp, '--out', tmp]))
    expect(error.kind).toBe('result')
    if (error.kind !== 'result') throw new Error('expected result')
    expect(error.exitCode).toBe(2)
    expect(error.result.ok).toBe(false)
    expect(error.result.error?.code).toBe('CLI_INVALID_INPUT')

    const report3 = await readJson(path.join(tmp, 'ir.validate.report.json'))
    expect((report3 as any).status).toBe('error')
  })
})
