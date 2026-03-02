import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'

describe('args: verify-loop / next-actions', () => {
  it('parses verify-loop executor and emitNextActions', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(
        ['verify-loop', '--runId', 'verify-args-1', '--mode', 'run', '--target', 'fixture:pass', '--executor', 'fixture', '--emitNextActions'],
        { helpText: 'help' },
      ),
    )

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('verify-loop')
    if (parsed.command !== 'verify-loop') throw new Error('expected verify-loop command')
    expect(parsed.executor).toBe('fixture')
    expect(parsed.emitNextActions).toBe(true)
  })

  it('parses verify-loop emitNextActions file path compatibility', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(
        [
          'verify-loop',
          '--runId',
          'verify-args-emit-path-1',
          '--mode',
          'run',
          '--target',
          'fixture:retryable',
          '--executor',
          'fixture',
          '--emitNextActions',
          '.artifacts/bootstrap-loop/next-actions.run.json',
        ],
        { helpText: 'help' },
      ),
    )

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('verify-loop')
    if (parsed.command !== 'verify-loop') throw new Error('expected verify-loop command')
    expect(parsed.emitNextActions).toBe(true)
    expect(parsed.emitNextActionsOut).toBe('.artifacts/bootstrap-loop/next-actions.run.json')
  })

  it('parses next-actions exec with default report path', async () => {
    const parsed = await Effect.runPromise(parseCliInvocation(['next-actions', 'exec', '--runId', 'next-actions-args-1'], { helpText: 'help' }))

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('next-actions.exec')
    if (parsed.command !== 'next-actions.exec') throw new Error('expected next-actions.exec command')
    expect(parsed.reportPath).toBe('verify-loop.report.json')
    expect(parsed.engine).toBe('bootstrap')
    expect(parsed.strict).toBe(false)
  })

  it('parses next-actions exec dsl alias', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(
        ['next-actions', 'exec', '--runId', 'next-actions-args-dsl-1', '--dsl', '.artifacts/bootstrap-loop/next-actions.run.json'],
        {
          helpText: 'help',
        },
      ),
    )

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('next-actions.exec')
    if (parsed.command !== 'next-actions.exec') throw new Error('expected next-actions.exec command')
    expect(parsed.reportPath).toBe('.artifacts/bootstrap-loop/next-actions.run.json')
    expect(parsed.engine).toBe('bootstrap')
    expect(parsed.strict).toBe(false)
  })

  it('parses next-actions exec engine/strict flags', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(
        [
          'next-actions',
          'exec',
          '--runId',
          'next-actions-args-strict-1',
          '--report',
          '.artifacts/bootstrap-loop/next-actions.run.json',
          '--engine',
          'bootstrap',
          '--strict',
        ],
        {
          helpText: 'help',
        },
      ),
    )

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('next-actions.exec')
    if (parsed.command !== 'next-actions.exec') throw new Error('expected next-actions.exec command')
    expect(parsed.engine).toBe('bootstrap')
    expect(parsed.strict).toBe(true)
  })
})
