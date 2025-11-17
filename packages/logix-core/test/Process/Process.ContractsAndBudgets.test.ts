import { describe, it, expect } from '@effect/vitest'
import type * as Logix from '../../src/index.js'

const stringify = (value: unknown): string => JSON.stringify(value)

const byteLength = (text: string): number =>
  typeof Buffer !== 'undefined' ? Buffer.byteLength(text, 'utf8') : new TextEncoder().encode(text).length

describe('process: contracts & budgets (012)', () => {
  it('keeps static IR (definition/installation) serializable', () => {
    const definition: Logix.Process.ProcessDefinition = {
      processId: 'boot',
      name: 'Boot',
      description: 'Process that runs on app start',
      requires: ['A', 'B'],
      triggers: [{ kind: 'platformEvent', platformEvent: 'app:boot' }],
      concurrency: { mode: 'latest' },
      errorPolicy: { mode: 'failStop' },
      diagnosticsLevel: 'off',
    }

    const installation: Logix.Process.ProcessInstallation = {
      identity: {
        processId: 'boot',
        scope: { type: 'app', appId: 'app' },
      },
      enabled: true,
      installedAt: 'manual',
    }

    expect(() => stringify(definition)).not.toThrow()
    expect(() => stringify(installation)).not.toThrow()
  })

  it('keeps process events slim & serializable (single-event <= 4KB)', () => {
    const identity: Logix.Process.ProcessInstanceIdentity = {
      identity: {
        processId: 'boot',
        scope: { type: 'app', appId: 'app' },
      },
      runSeq: 1,
    }

    const trigger: Logix.Process.ProcessTrigger = {
      kind: 'moduleAction',
      moduleId: 'A',
      instanceId: 'A::1',
      actionId: 'inc',
      txnSeq: 1,
      triggerSeq: 1,
    }

    const events: ReadonlyArray<Logix.Process.ProcessEvent> = [
      {
        type: 'process:start',
        identity,
        severity: 'info',
        eventSeq: 1,
        timestampMs: 0,
      },
      {
        type: 'process:trigger',
        identity,
        trigger,
        severity: 'info',
        eventSeq: 2,
        timestampMs: 1,
      },
      {
        type: 'process:dispatch',
        identity,
        trigger,
        dispatch: { moduleId: 'B', instanceId: 'B::1', actionId: 'sync' },
        severity: 'info',
        eventSeq: 3,
        timestampMs: 2,
      },
      {
        type: 'process:error',
        identity,
        error: {
          message: 'boom',
          code: 'process::serial_queue_overflow',
          hint: 'configure maxQueue or use latest/drop',
        },
        severity: 'error',
        eventSeq: 4,
        timestampMs: 3,
      },
      {
        type: 'process:stop',
        identity,
        severity: 'info',
        eventSeq: 5,
        timestampMs: 4,
      },
    ]

    for (const event of events) {
      const json = stringify(event)
      expect(byteLength(json)).toBeLessThanOrEqual(4 * 1024)
    }
  })
})
