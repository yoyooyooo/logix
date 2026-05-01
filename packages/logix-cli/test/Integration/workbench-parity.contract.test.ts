import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport, type VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'

import { runCli } from '../../src/internal/entry.js'
import { deriveCliWorkbenchProjection } from '../../src/internal/workbenchProjection.js'

const missingServiceEntry = (): string =>
  `${path.resolve(__dirname, '../fixtures/MissingServiceProgram.ts')}#MissingServiceProgram`

describe('CLI Workbench parity contract', () => {
  it('projects CLI trial report to the same Workbench finding identity as core report input', async () => {
    const out = await Effect.runPromise(runCli([
      'trial',
      '--runId',
      'cli-workbench-missing-service',
      '--entry',
      missingServiceEntry(),
      '--mode',
      'startup',
    ]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected CLI result')

    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    const report = reportArtifact?.inline as VerificationControlPlaneReport

    const cliProjection = deriveCliWorkbenchProjection({
      report,
      artifacts: out.result.artifacts,
    })
    const coreProjection = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report }],
    })

    expect(cliProjection.indexes?.findingsById).toBeDefined()
    const cliFinding = Object.values(cliProjection.indexes?.findingsById ?? {}).find((finding) => finding.code === 'MissingDependency')
    const coreFinding = Object.values(coreProjection.indexes?.findingsById ?? {}).find((finding) => finding.code === 'MissingDependency')

    expect(cliFinding?.id).toBe(coreFinding?.id)
    expect(cliFinding?.code).toBe('MissingDependency')
  })
})
