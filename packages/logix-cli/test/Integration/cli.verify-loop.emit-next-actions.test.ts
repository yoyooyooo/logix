import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (verify-loop emitNextActions)', () => {
  it('emits nextActions artifact when --emitNextActions is enabled', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-emit-next-actions-1',
        '--mode',
        'run',
        '--target',
        'fixture:retryable',
        '--executor',
        'fixture',
        '--emitNextActions',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const report = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')?.inline as
      | { readonly nextActions?: ReadonlyArray<unknown> }
      | undefined
    const nextActionsArtifact = out.result.artifacts.find((item) => item.outputKey === 'nextActions')

    expect(report).toBeDefined()
    expect(nextActionsArtifact).toBeDefined()
    expect(Array.isArray(nextActionsArtifact?.inline)).toBe(true)
    expect(nextActionsArtifact?.inline).toEqual(report?.nextActions)
  })

  it('writes next-actions dsl file when --emitNextActions <path> is used', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-emit-next-actions-path-'))
    const nextActionsOut = path.join(tmp, 'next-actions.run.json')
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-emit-next-actions-path-1',
        '--mode',
        'run',
        '--target',
        'fixture:retryable',
        '--executor',
        'fixture',
        '--emitNextActions',
        nextActionsOut,
        '--out',
        tmp,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.ok).toBe(false)
    expect(out.result.exitCode).toBe(3)
    const text = await fs.readFile(nextActionsOut, 'utf8')
    const parsed = JSON.parse(text) as ReadonlyArray<{ readonly id: string; readonly action: string }>
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
    expect(typeof parsed[0]?.id).toBe('string')
    expect(typeof parsed[0]?.action).toBe('string')
  })
})
