import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import type { JsonValue, VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'
import {
  argvFromCoordinate,
  normalizeCommandResultForRepeatability,
  primaryReportInline,
} from '../support/commandResult.js'

const entryPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const entry = `${entryPath}#BasicProgram`

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
})

const expectResult = async (argv: ReadonlyArray<string>) => {
  const out = await Effect.runPromise(runCli(argv))
  expect(out.kind).toBe('result')
  if (out.kind !== 'result') throw new Error('expected result')
  return out.result
}

describe('CLI exact rerun coordinate', () => {
  it('reruns check from inputCoordinate argv snapshot', async () => {
    const first = await expectResult(['check', '--runId', 'rerun-check', '--entry', entry])
    const second = await expectResult(argvFromCoordinate(first))

    expect(first.inputCoordinate.entry).toEqual({ modulePath: entryPath, exportName: 'BasicProgram' })
    expect(first.inputCoordinate.argvSnapshot?.digest).toMatch(/^sha256:/)
    expect(normalizeCommandResultForRepeatability(second)).toEqual(normalizeCommandResultForRepeatability(first))
  })

  it('reruns startup trial from inputCoordinate argv snapshot', async () => {
    const first = await expectResult(['trial', '--runId', 'rerun-trial', '--entry', entry, '--mode', 'startup'])
    const second = await expectResult(argvFromCoordinate(first))

    expect(first.inputCoordinate.trialMode).toBe('startup')
    expect(first.inputCoordinate.diagnosticsLevel).toBe('light')
    expect(normalizeCommandResultForRepeatability(second)).toEqual(normalizeCommandResultForRepeatability(first))
  })

  it('carries enough coordinate to upgrade check to startup trial', async () => {
    const check = await expectResult(['check', '--runId', 'rerun-upgrade-check', '--entry', entry])
    const report = primaryReportInline(check)

    expect(report).toMatchObject({ nextRecommendedStage: 'trial' })
    const trial = await expectResult([
      'trial',
      '--runId',
      'rerun-upgrade-trial',
      '--entry',
      `${check.inputCoordinate.entry?.modulePath}#${check.inputCoordinate.entry?.exportName}`,
      '--mode',
      'startup',
    ])
    expect(trial.command).toBe('trial')
    expect(trial.inputCoordinate.entry).toEqual(check.inputCoordinate.entry)
  })

  it('keeps evidence and selection as refs instead of inline payloads', async () => {
    const evidenceRef = path.resolve(__dirname, '../fixtures/evidence-package')
    const selectionRef = path.resolve(__dirname, '../fixtures/selection-manifest.json')
    const result = await expectResult([
      'check',
      '--runId',
      'rerun-evidence-refs',
      '--entry',
      entry,
      '--evidence',
      evidenceRef,
      '--selection',
      selectionRef,
    ])

    expect(result.inputCoordinate.evidence).toEqual({ ref: evidenceRef })
    expect(result.inputCoordinate.selection).toEqual({ ref: selectionRef })
    expect(JSON.stringify(result.inputCoordinate)).not.toContain('fixture:evidence:cli-basic')
  })

  it('keeps compare report refs and evidence refs in the exact rerun coordinate', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-rerun-compare-'))
    const before = await writeReport(tmp, 'before.report.json', makeReport('before', { host: 'node' }))
    const after = await writeReport(tmp, 'after.report.json', makeReport('after', { host: 'node' }))
    const evidenceRef = path.resolve(__dirname, '../fixtures/dvtools-roundtrip/evidence-package')
    const first = await expectResult([
      'compare',
      '--runId',
      'rerun-compare',
      '--beforeReport',
      before,
      '--afterReport',
      after,
      '--beforeEvidence',
      evidenceRef,
      '--afterEvidence',
      evidenceRef,
    ])
    const second = await expectResult(argvFromCoordinate(first))

    expect(first.inputCoordinate.beforeReport).toBe(before)
    expect(first.inputCoordinate.afterReport).toBe(after)
    expect(first.inputCoordinate.beforeEvidence).toEqual({ ref: evidenceRef })
    expect(first.inputCoordinate.afterEvidence).toEqual({ ref: evidenceRef })
    expect(first.inputCoordinate.argvSnapshot?.digest).toMatch(/^sha256:/)
    expect(normalizeCommandResultForRepeatability(second)).toEqual(normalizeCommandResultForRepeatability(first))
  })
})
