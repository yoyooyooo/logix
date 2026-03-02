import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (describe --json)', () => {
  it('should expose machine-readable command contracts and config visibility', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-describe-'))
    const configFile = path.join(tmp, 'logix.cli.json')
    await fs.writeFile(
      configFile,
      JSON.stringify(
        {
          schemaVersion: 1,
          defaults: { timeout: 1200, diagnosticsLevel: 'off' },
          profiles: { ci: { timeout: 3600, diagnosticsLevel: 'full' } },
        },
        null,
        2,
      ),
      'utf8',
    )

    const out = await Effect.runPromise(runCli([
      'describe',
      '--runId',
      'describe-1',
      '--json',
      '--cliConfig',
      configFile,
      '--profile',
      'ci',
      '--timeout',
      '5000',
    ]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const describeArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')
    expect(describeArtifact).toBeDefined()
    expect(describeArtifact?.kind).toBe('CliDescribeReport')
    expect(describeArtifact?.schemaVersion).toBe(1)
    expect(describeArtifact?.digest).toMatch(/^sha256:/)
    expect(Array.isArray(describeArtifact?.inline)).toBe(false)

    const report = describeArtifact?.inline as any
    expect(report?.kind).toBe('CliDescribeReport')
    expect(Array.isArray(report?.commands)).toBe(true)
    expect(report.commands.some((command: any) => command.name === 'ir.export')).toBe(true)
    expect(report.commands.some((command: any) => command.name === 'describe')).toBe(true)
    const trialRunContract = report.commands.find((command: any) => command.name === 'trialrun')
    const irValidateContract = report.commands.find((command: any) => command.name === 'ir.validate')
    expect(trialRunContract?.options?.find((option: any) => option.name === '--emit')).toMatchObject({
      name: '--emit',
      type: 'enum',
      enumValues: ['evidence'],
    })
    expect(irValidateContract?.options?.find((option: any) => option.name === '--profile')).toMatchObject({
      name: '--profile',
      type: 'enum',
      enumValues: ['contract', 'cross-module'],
    })

    expect(report?.protocol?.commandResultSchemaRef).toContain('command-result.v2.schema.json')
    expect(report?.protocol?.exitCodes?.map((entry: any) => entry.code)).toEqual([0, 1, 2, 3, 4, 5])
    expect(report?.protocol?.exitCodes?.map((entry: any) => entry.meaning)).toEqual([
      'PASS',
      'ERROR',
      'VIOLATION',
      'RETRYABLE',
      'NOT_IMPLEMENTED',
      'NO_PROGRESS',
    ])
    expect(report?.runtimeExecutableTruth?.source).toBe('command-registry.availability')
    expect(Array.isArray(report?.runtimeExecutableTruth?.executableCommandNames)).toBe(true)
    expect(Array.isArray(report?.runtimeExecutableTruth?.migrationCommandNames)).toBe(true)
    expect(Array.isArray(report?.runtimeExecutableTruth?.unavailableCommandNames)).toBe(true)
    expect(report?.agentGuidance?.source).toBe('primitives.capability-model.v1')
    expect(Array.isArray(report?.agentGuidance?.verificationChains)).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.some((item: any) => item.id === 'static-contract')).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.some((item: any) => item.id === 'dynamic-evidence')).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.every((item: any) => Array.isArray(item.primitiveChain))).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.every((item: any) => Array.isArray(item.expectedArtifacts))).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.every((item: any) => item.expectedArtifacts.length > 0)).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.every((item: any) => Array.isArray(item.expectedOutputKeys))).toBe(true)
    expect(report?.agentGuidance?.verificationChains?.every((item: any) => item.expectedOutputKeys.length > 0)).toBe(true)
    const executableCommandNames = report?.runtimeExecutableTruth?.executableCommandNames ?? []
    const migrationCommandNames = report?.runtimeExecutableTruth?.migrationCommandNames ?? []
    expect([...executableCommandNames].sort()).toEqual([...report.commands.map((command: any) => command.name)].sort())
    expect(migrationCommandNames).toContain('contract-suite.run')
    expect(migrationCommandNames).toContain('spy.evidence')
    expect(migrationCommandNames).toContain('anchor.index')
    expect(report?.migrationEntries?.some((entry: any) => entry.command === 'contract-suite.run')).toBe(true)
    expect(report?.migrationEntries?.some((entry: any) => entry.command === 'spy.evidence')).toBe(true)
    expect(report?.migrationEntries?.some((entry: any) => entry.command === 'anchor.index')).toBe(true)

    expect(report?.configVisibility?.profile).toBe('ci')
    expect(report?.configVisibility?.discovery?.found).toBe(true)
    expect(report?.configVisibility?.layers?.map((layer: any) => layer.source)).toEqual(['defaults', 'profile'])
    expect((report?.configVisibility?.argvWithConfigPrefix ?? []).length).toBeGreaterThan(
      (report?.configVisibility?.argv ?? []).length,
    )
  })
})
