import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (describe scenario projection)', () => {
  it('hides scenario projection by default to keep user-facing describe primitive-only', async () => {
    const out = await Effect.runPromise(runCli(['describe', '--runId', 'describe-scenario-projection-default-1', '--json']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)

    const describeArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')
    expect(describeArtifact).toBeDefined()

    const report = describeArtifact?.inline as any
    expect(report?.kind).toBe('CliDescribeReport')
    expect(report?.ext).toBeUndefined()
    expect(Array.isArray(report?.commands)).toBe(true)
    expect(report.commands.every((item: any) => item?.name !== 'contract-suite.run')).toBe(true)
  })

  it('emits internal orchestration projection only when LOGIX_DESCRIBE_INTERNAL=1', async () => {
    const out = await Effect.runPromise(
      runCli(['describe', '--runId', 'describe-scenario-projection-internal-1', '--json'], {
        env: {
          ...process.env,
          LOGIX_DESCRIBE_INTERNAL: '1',
        },
      }),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)

    const describeArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')
    expect(describeArtifact).toBeDefined()

    const report = describeArtifact?.inline as any
    const orchestration = report?.ext?.internal?.orchestration
    expect(orchestration?.source).toBe('spec-103.scenario-index')
    expect(orchestration?.contractRef).toContain('contracts/scenario-index.md')
    expect(orchestration?.remediationMapRef).toContain('contracts/scenario-remediation-map.md')
    expect(Array.isArray(orchestration?.scenarios)).toBe(true)
    expect(orchestration.scenarios.some((item: any) => item.id === 'S08')).toBe(true)
  })
})
