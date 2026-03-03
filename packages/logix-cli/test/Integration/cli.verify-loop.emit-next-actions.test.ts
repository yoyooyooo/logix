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

  it('run -> next-actions exec -> resume 在 retryable 样本上必须无协议断链', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-next-actions-resume-chain-'))
    const nextActionsOut = path.join(tmp, 'next-actions.run.json')

    const runOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-chain-run-1',
        '--mode',
        'run',
        '--target',
        'fixture:retryable',
        '--executor',
        'fixture',
        '--emitNextActions',
        nextActionsOut,
        '--out',
        path.join(tmp, 'run'),
      ]),
    )

    expect(runOut.kind).toBe('result')
    if (runOut.kind !== 'result') throw new Error('expected result')
    expect(runOut.result.exitCode).toBe(3)

    const execOut = await Effect.runPromise(
      runCli([
        'next-actions',
        'exec',
        '--runId',
        'verify-chain-exec-1',
        '--dsl',
        nextActionsOut,
        '--out',
        path.join(tmp, 'exec'),
      ]),
    )

    expect(execOut.kind).toBe('result')
    if (execOut.kind !== 'result') throw new Error('expected result')
    expect(execOut.result.ok).toBe(true)
    expect(execOut.result.exitCode).toBe(0)

    const executionArtifact = execOut.result.artifacts.find((item) => item.outputKey === 'nextActionsExecution')
    expect(executionArtifact).toBeDefined()
    expect(typeof executionArtifact?.file).toBe('string')
    const execution = JSON.parse(
      await fs.readFile(path.resolve(path.join(tmp, 'exec'), executionArtifact?.file ?? ''), 'utf8'),
    ) as {
      readonly results: ReadonlyArray<{ readonly id: string; readonly status: string; readonly rerun?: { readonly exitCode: number } }>
    }
    expect(execution?.results.some((item) => item.id === 'resume-after-retryable' && item.status === 'executed')).toBe(true)
    const rerun = execution?.results.find((item) => item.id === 'resume-after-retryable')
    expect(rerun?.rerun?.exitCode).toBe(3)
  })
})
