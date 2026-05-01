import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

describe('logix trial command', () => {
  it('routes startup mode to Runtime.trial', async () => {
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const out = await Effect.runPromise(runCli(['trial', '--runId', 'trial-startup-1', '--entry', entry, '--mode', 'startup']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.command).toBe('trial')
    expect(out.result.primaryReportOutputKey).toBe('trialReport')
    expect(out.result.error?.code).not.toBe('CLI_NOT_IMPLEMENTED')

    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(reportArtifact?.kind).toBe('VerificationControlPlaneReport')
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    expect((reportArtifact?.inline as any).stage).toBe('trial')
    expect((reportArtifact?.inline as any).mode).toBe('startup')

    const manifestArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'reflectionManifest')
    expect(manifestArtifact?.kind).toBe('RuntimeReflectionManifest')
    expect(manifestArtifact?.digest).toMatch(/^runtime-manifest:/)
    expect((manifestArtifact?.inline as any)?.digest).toBe(manifestArtifact?.digest)
  })

  it('requires scenario input for scenario mode', async () => {
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const out = await Effect.runPromise(runCli(['trial', '--runId', 'trial-scenario-missing', '--entry', entry, '--mode', 'scenario']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.error?.code).toBe('CLI_SCENARIO_INPUT_REQUIRED')
  })

  it('does not pretend scenario mode is implemented when scenario input is present', async () => {
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const out = await Effect.runPromise(
      runCli(['trial', '--runId', 'trial-scenario-explicit', '--entry', entry, '--mode', 'scenario', '--scenario', './scenario.json']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.error?.code).toBe('CLI_SCENARIO_NOT_IMPLEMENTED')
    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect((reportArtifact?.inline as any)?.nextRecommendedStage).toBeNull()
  })
})
