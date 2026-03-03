import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (verify-loop transient => retryable)', () => {
  it('maps transient faults to RETRYABLE(exitCode=3)', async () => {
    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-transient-1', '--mode', 'run', '--target', 'fixture:transient']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(3)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('VERIFY_RETRYABLE')

    const reportArtifact = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')
    const report = reportArtifact?.inline as any
    expect(report?.verdict).toBe('RETRYABLE')
    expect(report?.reasonCode).toBe('VERIFY_RETRYABLE')
    expect(report?.reasons?.[0]?.data?.signal).toBeDefined()
  })

  it('maps transient real gate execution failures to RETRYABLE(exitCode=3)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-transient-real-'))
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify(
        {
          name: 'verify-transient-real',
          private: true,
          version: '0.0.0',
          scripts: {
            typecheck: 'node -e "process.exit(75)"',
          },
        },
        null,
        2,
      ),
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-transient-real-1', '--mode', 'run', '--executor', 'real', '--target', tmp]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(3)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('VERIFY_RETRYABLE')

    const report = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')?.inline as any
    expect(report?.verdict).toBe('RETRYABLE')
    expect(report?.gateResults?.[0]?.status).toBe('retryable')
    expect(report?.gateResults?.[0]?.reasonCode).toBe('VERIFY_RETRYABLE')
  })
})
