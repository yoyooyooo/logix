import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (anchor autofill fields)', () => {
  it('should expose stable artifact fields for report-only autofill', async () => {
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const repoRoot = path.join(root, 'packages/logix-anchor-engine/test/fixtures/repo-autofill-services')

    const out = await Effect.runPromise(
      runCli([
        'anchor',
        'autofill',
        '--runId',
        'fa-a1',
        '--repoRoot',
        repoRoot,
        '--mode',
        'report',
        '--budgetBytes',
        '2048',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const autofillReport = out.result.artifacts.find((item) => item.outputKey === 'autofillReport')
    expect(autofillReport).toBeDefined()
    expect(autofillReport?.kind).toBe('AutofillReport')
    expect(autofillReport?.schemaVersion).toBe(1)
    expect(autofillReport?.digest).toMatch(/^sha256:/)
    expect(typeof autofillReport?.budgetBytes).toBe('number')
    expect(autofillReport?.reasonCodes).toContain('AUTOFILL_REPORT_ONLY')

    const patchPlan = out.result.artifacts.find((item) => item.outputKey === 'patchPlan')
    expect(patchPlan).toBeDefined()
    expect(patchPlan?.schemaVersion).toBe(1)
    expect(patchPlan?.digest).toMatch(/^sha256:/)
  })
})

