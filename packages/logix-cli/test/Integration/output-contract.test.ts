import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { printHelp, runCli } from '../../src/internal/entry.js'

const writeReport = async (dir: string, file: string, report: any): Promise<string> => {
  const out = path.join(dir, file)
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return out
}

const makeReport = (runId: string, env: Record<string, unknown>) => ({
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

const expectSharedFields = (report: any, stage: 'check' | 'trial' | 'compare') => {
  expect(isVerificationControlPlaneReport(report)).toBe(true)
  expect(report?.schemaVersion).toBe(1)
  expect(report?.stage).toBe(stage)
  expect(typeof report?.mode).toBe('string')
  expect(report?.kind).toBe('VerificationControlPlaneReport')
  expect(['PASS', 'FAIL', 'INCONCLUSIVE']).toContain(report?.verdict)
  expect(report).toHaveProperty('errorCode')
  expect(typeof report?.summary).toBe('string')
  expect(typeof report?.environment).toBe('object')
  expect(Array.isArray(report?.artifacts)).toBe(true)
  for (const artifact of report?.artifacts ?? []) {
    expect('role' in (artifact ?? {})).toBe(false)
  }
  expect(Array.isArray(report?.repairHints)).toBe(true)
  expect(['check', 'trial', 'compare', 'done', null]).toContain(report?.nextRecommendedStage ?? null)
}

describe('logix-cli integration (output contract)', () => {
  it('keeps shared control-plane output fields stable across check/trial/compare', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-output-'))
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const beforeReport = await writeReport(tmp, 'before.report.json', makeReport('before', { host: 'node' }))
    const afterReport = await writeReport(tmp, 'after.report.json', makeReport('after', { host: 'browser' }))

    const checkOut = await Effect.runPromise(runCli(['check', '--runId', 'output-check-1', '--entry', entry]))
    const trialOut = await Effect.runPromise(runCli(['trial', '--runId', 'output-trial-1', '--entry', entry]))
    const compareOut = await Effect.runPromise(
      runCli(['compare', '--runId', 'output-compare-1', '--beforeReport', beforeReport, '--afterReport', afterReport]),
    )

    if (checkOut.kind !== 'result' || trialOut.kind !== 'result' || compareOut.kind !== 'result') {
      throw new Error('expected result')
    }

    expectSharedFields(checkOut.result.artifacts.find((x) => x.outputKey === checkOut.result.primaryReportOutputKey)?.inline, 'check')
    expectSharedFields(trialOut.result.artifacts.find((x) => x.outputKey === trialOut.result.primaryReportOutputKey)?.inline, 'trial')
    expectSharedFields(compareOut.result.artifacts.find((x) => x.outputKey === compareOut.result.primaryReportOutputKey)?.inline, 'compare')

    for (const result of [checkOut.result, trialOut.result, compareOut.result]) {
      expect(result).not.toHaveProperty('mode')
      expect(typeof result.primaryReportOutputKey).toBe('string')
      expect(result.artifacts.some((artifact) => artifact.outputKey === result.primaryReportOutputKey)).toBe(true)
      expect(typeof result.inputCoordinate.command).toBe('string')
    }

    const helpText = printHelp()
    expect(helpText).toContain('logix check')
    expect(helpText).toContain('logix trial')
    expect(helpText).toContain('logix compare')
    expect(helpText).not.toContain('logix describe')
    expect(helpText).not.toContain('logix ir export')
    expect(helpText).not.toContain('logix ir validate')
    expect(helpText).not.toContain('logix ir diff')
    expect(helpText).not.toContain('logix contract-suite run')
    expect(helpText).not.toContain('logix transform module')
  })
})
