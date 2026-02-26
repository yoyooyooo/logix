import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (ir validate fields)', () => {
  it('should keep gate-critical artifact fields stable (reasonCodes/digest/budgetBytes/schemaVersion)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-validate-fields-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const ir = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'fv-r1', '--entry', entry, '--out', tmp]))
    expect(ir.kind).toBe('result')
    if (ir.kind !== 'result') throw new Error('expected result')
    expect(ir.exitCode).toBe(0)

    await fs.unlink(path.join(tmp, 'control-surface.manifest.json'))

    const validate = await Effect.runPromise(
      runCli(['ir', 'validate', '--runId', 'fv-v1', '--in', tmp, '--budgetBytes', '512']),
    )
    expect(validate.kind).toBe('result')
    if (validate.kind !== 'result') throw new Error('expected result')
    expect(validate.exitCode).toBe(2)
    expect(validate.result.ok).toBe(false)

    const artifact = validate.result.artifacts.find((item) => item.outputKey === 'irValidateReport')
    expect(artifact).toBeDefined()
    expect(artifact?.kind).toBe('IrValidateReport')
    expect(artifact?.schemaVersion).toBe(1)
    expect(artifact?.digest).toMatch(/^sha256:/)
    expect(typeof artifact?.budgetBytes).toBe('number')
    expect(Array.isArray(artifact?.reasonCodes)).toBe(true)
    expect(artifact?.reasonCodes).toContain('MISSING_REQUIRED_FILE:control-surface.manifest.json')
  })
})

