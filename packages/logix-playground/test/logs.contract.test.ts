import { describe, expect, it } from 'vitest'
import {
  makeLifecycleLog,
  makeOperationLog,
  makeRunnerErrorLog,
} from '../src/internal/session/logs.js'

describe('Playground session log helpers', () => {
  it('builds bounded lifecycle and operation log entries', () => {
    expect(
      makeLifecycleLog({
        message: 'session started logix-react.local-counter:r0:s1',
        sessionId: 'logix-react.local-counter:r0:s1',
      }),
    ).toEqual({
      level: 'info',
      message: 'session started logix-react.local-counter:r0:s1',
      source: 'session',
      sessionId: 'logix-react.local-counter:r0:s1',
      operationSeq: 0,
    })

    expect(
      makeOperationLog({
        message: 'dispatch completed increment',
        sessionId: 'logix-react.local-counter:r0:s1',
        operationSeq: 1,
      }),
    ).toMatchObject({
      level: 'info',
      source: 'session',
      message: 'dispatch completed increment',
      operationSeq: 1,
    })

    expect(
      makeRunnerErrorLog({
        message: 'boom',
        sessionId: 'logix-react.local-counter:r0:s1',
        operationSeq: 1,
      }),
    ).toMatchObject({
      level: 'error',
      source: 'runner',
      message: 'boom',
      operationSeq: 1,
    })
  })
})
