import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

describe('logix check command', () => {
  it('routes a Program entry to Runtime.check', async () => {
    const entryPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
    const entry = `${entryPath}#BasicProgram`
    const out = await Effect.runPromise(runCli(['check', '--runId', 'check-program-1', '--entry', entry]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.command).toBe('check')
    expect(out.result.ok).toBe(true)
    expect(out.result.primaryReportOutputKey).toBe('checkReport')
    expect(out.result.inputCoordinate.entry).toEqual({
      modulePath: entryPath,
      exportName: 'BasicProgram',
    })

    const artifact = out.result.artifacts.find((item) => item.outputKey === out.result.primaryReportOutputKey)
    expect(artifact?.kind).toBe('VerificationControlPlaneReport')
    expect(artifact?.schemaVersion).toBe(1)
    expect(artifact?.digest).toMatch(/^sha256:/)
    expect(isVerificationControlPlaneReport(artifact?.inline)).toBe(true)

    const report = artifact?.inline as any
    expect(report?.stage).toBe('check')
    expect(report?.mode).toBe('static')
    expect(report?.verdict).toBe('PASS')
    expect(report?.nextRecommendedStage).toBe('trial')

    const manifestArtifact = out.result.artifacts.find((item) => item.outputKey === 'reflectionManifest')
    expect(manifestArtifact?.kind).toBe('RuntimeReflectionManifest')
    expect(manifestArtifact?.digest).toMatch(/^runtime-manifest:/)
    expect((manifestArtifact?.inline as any)?.digest).toBe(manifestArtifact?.digest)
    expect((manifestArtifact?.inline as any)?.actions.map((action: any) => action.actionTag)).toEqual(['noop'])
  })

  it('writes primary report to file when inline budget is too small', async () => {
    const outDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'logix-cli-check-budget-'))
    const entryPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
    const entry = `${entryPath}#BasicProgram`
    const out = await Effect.runPromise(
      runCli(['check', '--runId', 'check-budget-1', '--entry', entry, '--budgetBytes', '16', '--out', outDir]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    const artifact = out.result.artifacts.find((item) => item.outputKey === out.result.primaryReportOutputKey)
    expect(artifact?.kind).toBe('VerificationControlPlaneReport')
    expect(artifact?.inline).toMatchObject({ _tag: 'oversized' })
    expect(artifact?.truncated).toBe(true)
    expect(artifact?.budgetBytes).toBe(16)
    expect(typeof artifact?.file).toBe('string')
    expect(fs.existsSync(artifact?.file ?? '')).toBe(true)
  })
})
