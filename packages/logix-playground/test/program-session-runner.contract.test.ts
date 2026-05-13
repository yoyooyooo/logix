import { describe, expect, it } from 'vitest'
import { createProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Program session runner', () => {
  it('dispatches action history through transport and returns state/logs', async () => {
    const calls: Array<unknown> = []
    const runner = createProgramSessionRunner({
      transport: {
        init: async () => {
          calls.push('init')
        },
        compile: async (code) => {
          calls.push({ compile: code })
          return { success: true }
        },
        run: async (options) => {
          calls.push({ run: options })
          return {
            stateSnapshot: {
              state: { count: 1 },
              logs: [{ level: 'info', message: 'dispatch increment', source: 'runner' }],
            },
            logs: [{ level: 'info', message: 'transport log', source: 'runner' }],
          }
        },
        trial: async () => ({ stateSnapshot: undefined }),
      },
    })

    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const result = await runner.dispatch({
      snapshot,
      sessionId: 'logix-react.local-counter:r0:s1',
      actions: [{ _tag: 'increment', payload: undefined }],
      operationSeq: 1,
    })

    expect(result.state).toEqual({ count: 1 })
    expect(result.logs.map((log) => log.message)).toEqual(['dispatch increment', 'transport log'])
    expect(JSON.stringify(calls)).toContain('increment')
    expect(JSON.stringify(calls)).toContain('op1')
    expect(JSON.stringify(calls)).toContain('__logixPlaygroundUndefined')
    expect(JSON.stringify(calls)).toContain('payload: action.payload && action.payload.__logixPlaygroundUndefined === true ? undefined : action.payload')
  })

  it('returns one synthetic runner dispatch log for the current operation when replaying action history', async () => {
    const runner = createProgramSessionRunner({
      transport: {
        init: async () => {},
        compile: async () => ({ success: true }),
        run: async () => ({
          stateSnapshot: {
            state: { count: 1 },
            logs: [
              { level: 'info' as const, message: 'dispatch decrement', source: 'runner' as const },
              { level: 'info' as const, message: 'dispatch increment', source: 'runner' as const },
            ],
          },
        }),
        trial: async () => ({ stateSnapshot: undefined }),
      },
    })

    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const result = await runner.dispatch({
      snapshot,
      sessionId: 'logix-react.local-counter:r0:s1',
      actions: [
        { _tag: 'decrement', payload: undefined },
        { _tag: 'increment', payload: undefined },
      ],
      operationSeq: 2,
    })

    expect(result.state).toEqual({ count: 1 })
    expect(result.logs.map((log) => log.message)).toEqual(['dispatch increment'])
    expect(result.traces).toEqual([
      {
        traceId: 'logix-react.local-counter:r0:s1::t0::o2::operation.accepted',
        label: 'operation.accepted dispatch increment',
      },
      {
        traceId: 'logix-react.local-counter:r0:s1::t0::o2::operation.completed',
        label: 'operation.completed dispatch increment',
      },
    ])
  })

  it('classifies compile failure before runtime dispatch', async () => {
    const runner = createProgramSessionRunner({
      transport: {
        init: async () => {},
        compile: async () => ({ success: false, errors: ['bad source'] }),
        run: async () => ({ stateSnapshot: undefined }),
        trial: async () => ({ stateSnapshot: undefined }),
      },
    })
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))

    await expect(
      runner.dispatch({
        snapshot,
        sessionId: 'logix-react.local-counter:r0:s1',
        actions: [{ _tag: 'increment', payload: undefined }],
        operationSeq: 1,
      }),
    ).rejects.toMatchObject({ kind: 'compile', message: 'bad source' })
  })

  it('preserves sandbox runtime error details instead of generic Effect.tryPromise messages', async () => {
    const runner = createProgramSessionRunner({
      transport: {
        init: async () => {},
        compile: async () => ({ success: true }),
        run: async () => {
          throw Object.assign(new Error('Missing reducer for action increment'), {
            sandboxError: {
              code: 'RUNTIME_ERROR',
              message: 'Missing reducer for action increment',
              stack: 'Error: Missing reducer for action increment',
            },
          })
        },
        trial: async () => ({ stateSnapshot: undefined }),
      },
    })
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))

    await expect(
      runner.dispatch({
        snapshot,
        sessionId: 'logix-react.local-counter:r0:s1',
        actions: [{ _tag: 'increment', payload: undefined }],
        operationSeq: 1,
      }),
    ).rejects.toMatchObject({
      kind: 'runtime',
      message: 'Missing reducer for action increment',
    })
  })
})
