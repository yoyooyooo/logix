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

    expect(report?.protocol?.commandResultSchemaRef).toContain('cli-command-result.schema.json')
    expect(report?.configVisibility?.profile).toBe('ci')
    expect(report?.configVisibility?.discovery?.found).toBe(true)
    expect(report?.configVisibility?.layers?.map((layer: any) => layer.source)).toEqual(['defaults', 'profile'])
    expect((report?.configVisibility?.argvWithConfigPrefix ?? []).length).toBeGreaterThan(
      (report?.configVisibility?.argv ?? []).length,
    )
  })
})

