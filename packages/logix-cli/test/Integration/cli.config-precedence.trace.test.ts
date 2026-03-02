import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (config precedence trace)', () => {
  it('explains effective value source and override trail for defaults/profile/env/argv', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-trace-'))
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

    const stateFile = path.join(tmp, 'state', 'extensions.state.json')

    const out = await Effect.runPromise(
      runCli(
        [
          'describe',
          '--runId',
          'config-trace-1',
          '--json',
          '--cliConfig',
          configFile,
          '--profile',
          'ci',
          '--stateFile',
          stateFile,
          '--timeout',
          '5000',
        ],
        {
          env: {
            ...process.env,
            LOGIX_CLI_TIMEOUT: '4800',
          },
        },
      ),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const describeArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')
    expect(describeArtifact).toBeDefined()
    const report = describeArtifact?.inline as any

    expect(report?.configVisibility?.precedence).toEqual(['defaults', 'profile', 'env', 'argv'])

    const timeoutEffective = (report?.configVisibility?.effective ?? []).find((item: any) => item?.option === '--timeout')
    expect(timeoutEffective).toEqual({
      option: '--timeout',
      value: '5000',
      source: 'argv',
    })

    const timeoutTrail = (report?.configVisibility?.overrideTrail ?? []).find((item: any) => item?.option === '--timeout')
    expect(timeoutTrail).toBeDefined()
    expect((timeoutTrail?.applied ?? []).map((step: any) => step?.source)).toEqual(['defaults', 'profile', 'env', 'argv'])
    expect((timeoutTrail?.applied ?? []).map((step: any) => step?.value)).toEqual(['1200', '3600', '4800', '5000'])
    expect(timeoutTrail?.applied?.[2]?.via).toBe('LOGIX_CLI_TIMEOUT')

    const stateFileEffective = (report?.configVisibility?.effective ?? []).find((item: any) => item?.option === '--stateFile')
    expect(stateFileEffective).toEqual({
      option: '--stateFile',
      value: stateFile,
      source: 'argv',
    })
    expect(stateFileEffective?.value).not.toBe('true')

    const stateFileTrail = (report?.configVisibility?.overrideTrail ?? []).find((item: any) => item?.option === '--stateFile')
    expect(stateFileTrail).toBeDefined()
    expect(stateFileTrail?.applied).toEqual([
      {
        source: 'argv',
        value: stateFile,
      },
    ])
  })
})
