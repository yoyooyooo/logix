import { describe, expect, it } from 'vitest'
import {
  createInitialProgramSession,
  createRestartedProgramSession,
  markProgramSessionStale,
  recordProgramSessionFailure,
  recordProgramSessionOperation,
} from '../src/internal/session/programSession.js'

describe('Program session state', () => {
  it('creates stable ids and records operations', () => {
    const session = createInitialProgramSession({
      projectId: 'logix-react.local-counter',
      revision: 0,
      seq: 1,
    })

    expect(session.sessionId).toBe('logix-react.local-counter:r0:s1')
    expect(session.status).toBe('ready')
    expect(session.stale).toBe(false)

    const afterOperation = recordProgramSessionOperation(session, {
      operation: { kind: 'dispatch', actionTag: 'increment', payload: undefined },
      state: { count: 1 },
      logs: [{ level: 'info', message: 'dispatch increment', source: 'runner' }],
      traces: [{ traceId: 'trace-1', label: 'dispatch increment' }],
    })

    expect(afterOperation.operationSeq).toBe(1)
    expect(afterOperation.status).toBe('ready')
    expect(afterOperation.state).toEqual({ count: 1 })
    expect(afterOperation.lastOperation?.actionTag).toBe('increment')
    expect(afterOperation.logs.map((log) => log.message)).toContain('dispatch increment')
    expect(afterOperation.logs.map((log) => log.message)).toContain('dispatch completed increment')
  })

  it('can mark a session stale for lower-level diagnostics', () => {
    const afterOperation = recordProgramSessionOperation(
      createInitialProgramSession({ projectId: 'logix-react.local-counter', revision: 0, seq: 1 }),
      {
        operation: { kind: 'dispatch', actionTag: 'increment', payload: undefined },
        state: { count: 1 },
        logs: [],
        traces: [],
      },
    )

    const stale = markProgramSessionStale(afterOperation, { revision: 2 })
    expect(stale.stale).toBe(true)
    expect(stale.staleReason).toContain('r2')
    expect(stale.logs.map((log) => log.message)).toContain('session stale after source revision r2')
  })

  it('restarts onto a new source revision with a clean log window', () => {
    const previous = recordProgramSessionOperation(
      createInitialProgramSession({ projectId: 'logix-react.local-counter', revision: 0, seq: 1 }),
      {
        operation: { kind: 'dispatch', actionTag: 'increment', payload: undefined },
        state: { count: 1 },
        logs: [{ level: 'info', message: 'dispatch increment', source: 'runner' }],
        traces: [],
      },
    )

    const restarted = createRestartedProgramSession({
      projectId: 'logix-react.local-counter',
      revision: 1,
      seq: 2,
      previousSessionId: previous.sessionId,
      previousRevision: previous.revision,
    })

    expect(restarted.sessionId).toBe('logix-react.local-counter:r1:s2')
    expect(restarted.stale).toBe(false)
    expect(restarted.state).toBeUndefined()
    expect(restarted.logs.map((log) => log.message)).toEqual([
      'session started logix-react.local-counter:r1:s2',
      'session auto restarted from logix-react.local-counter:r0:s1 after source revision r1',
    ])
    expect(restarted.traces.map((trace) => trace.label)).toEqual(['restart from r0 to r1'])
  })

  it('records classified failures without replacing previous state', () => {
    const session = recordProgramSessionOperation(
      createInitialProgramSession({ projectId: 'logix-react.local-counter', revision: 0, seq: 1 }),
      {
        operation: { kind: 'dispatch', actionTag: 'increment' },
        state: { count: 1 },
        logs: [],
        traces: [],
      },
    )

    const failed = recordProgramSessionFailure(session, {
      operation: { kind: 'dispatch', actionTag: 'decrement' },
      error: { kind: 'runtime', message: 'boom' },
      logs: [{ level: 'error', message: 'boom', source: 'runner' }],
    })

    expect(failed.status).toBe('failed')
    expect(failed.state).toEqual({ count: 1 })
    expect(failed.error).toEqual({ kind: 'runtime', message: 'boom' })
    expect(failed.operationSeq).toBe(2)
  })
})
