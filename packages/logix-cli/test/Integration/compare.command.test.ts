import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport, type JsonValue, type VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

const writeReport = async (dir: string, file: string, report: VerificationControlPlaneReport): Promise<string> => {
  const out = path.join(dir, file)
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return out
}

const makeReport = (runId: string, env: Record<string, JsonValue>): VerificationControlPlaneReport => ({
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: 'trial',
  mode: 'startup',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: { runId, ...env },
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: null,
} as const)

describe('logix compare command', () => {
  it('routes before/after reports to core compare authority', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-compare-'))
    const before = await writeReport(tmp, 'before.report.json', makeReport('before', { host: 'node' }))
    const after = await writeReport(tmp, 'after.report.json', makeReport('after', { host: 'browser' }))
    const evidenceRef = path.resolve(__dirname, '../fixtures/dvtools-roundtrip/evidence-package')

    const out = await Effect.runPromise(
      runCli([
        'compare',
        '--runId',
        'compare-authority-1',
        '--beforeReport',
        before,
        '--afterReport',
        after,
        '--beforeEvidence',
        evidenceRef,
        '--afterEvidence',
        evidenceRef,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.command).toBe('compare')
    expect(out.result.primaryReportOutputKey).toBe('compareReport')
    expect(out.result.inputCoordinate).toMatchObject({
      command: 'compare',
      beforeReport: before,
      afterReport: after,
      beforeEvidence: { ref: evidenceRef },
      afterEvidence: { ref: evidenceRef },
    })
    expect(out.result.inputCoordinate.argvSnapshot?.digest).toMatch(/^sha256:/)

    const artifact = out.result.artifacts.find((item) => item.outputKey === out.result.primaryReportOutputKey)
    expect(artifact?.kind).toBe('VerificationControlPlaneReport')
    expect(isVerificationControlPlaneReport(artifact?.inline)).toBe(true)
    if (!isVerificationControlPlaneReport(artifact?.inline)) throw new Error('expected compare report')
    const report = artifact.inline
    expect(report?.stage).toBe('compare')
    expect(report?.mode).toBe('compare')
    expect(report?.verdict).toBe('INCONCLUSIVE')
    expect(report?.errorCode).toBe('COMPARE_ENVIRONMENT_FINGERPRINT_MISMATCH')

    const beforeRef = out.result.artifacts.find((item) => item.outputKey === 'beforeReportRef')
    const afterRef = out.result.artifacts.find((item) => item.outputKey === 'afterReportRef')
    expect(beforeRef?.kind).toBe('VerificationControlPlaneReportRef')
    expect(beforeRef?.inline).toEqual({ ref: before, role: 'before' })
    expect(afterRef?.kind).toBe('VerificationControlPlaneReportRef')
    expect(afterRef?.inline).toEqual({ ref: after, role: 'after' })
  })

  it('validates optional compare entry as Program before writing coordinates', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-compare-entry-'))
    const before = await writeReport(tmp, 'before.report.json', makeReport('before', { host: 'node' }))
    const after = await writeReport(tmp, 'after.report.json', makeReport('after', { host: 'node' }))
    const badEntry = `${path.resolve(__dirname, '../fixtures/BasicModuleOnly.ts')}#ModuleOnly`

    const out = await Effect.runPromise(
      runCli(['compare', '--runId', 'compare-entry-reject', '--beforeReport', before, '--afterReport', after, '--entry', badEntry]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.error?.code).toBe('CLI_ENTRY_NOT_PROGRAM')
    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    if (!isVerificationControlPlaneReport(reportArtifact?.inline)) throw new Error('expected error report')
    expect(reportArtifact.inline.nextRecommendedStage).toBeNull()
  })

  it('keeps missing compare report refs as transport gate failure', async () => {
    const out = await Effect.runPromise(runCli(['compare', '--runId', 'compare-missing-input']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.error?.code).toBe('CLI_INVALID_ARGUMENT')
    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    if (!isVerificationControlPlaneReport(reportArtifact?.inline)) throw new Error('expected error report')
    expect(reportArtifact.inline.nextRecommendedStage).toBeNull()
  })
})
