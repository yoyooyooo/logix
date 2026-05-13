import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-debug-source',
  moduleId: 'DebugSourceModule',
  instanceId: 'default',
})

describe('live debug source bridge contract', () => {
  it('keeps RuntimeDebugEventRef records as bounded source material until diagnostic reads normalize them', () => {
    const store = createLiveOperationLedgerStore({
      enabled: true,
      diagnosticsEnabled: true,
      retention: { maxCarrierQueueEntries: 2 },
    })

    for (let index = 1; index <= 3; index += 1) {
      const ref = CoreDebug.toRuntimeDebugEventRef(
        {
          type: 'diagnostic',
          moduleId: 'DebugSourceModule',
          instanceId: 'default',
          runtimeLabel: 'runtime-debug-source',
          code: `debug.source.${index}`,
          severity: 'warning',
          message: `Debug source ${index}.`,
          txnSeq: index,
          opSeq: index,
        },
        { diagnosticsLevel: 'full', eventSeq: index },
      )
      expect(ref).toBeDefined()
      store.addRuntimeDebugEventRef(ref!, target)
    }

    expect(store.getDiagnostics()).toMatchObject({
      carrierQueueEntries: 2,
      ledgerEventAllocations: 0,
      diagnosticProjectionAllocations: 0,
    })

    const window = store.readWindow({ target, eventKinds: ['diagnostic'], limit: 10 })

    expect(window.events.map((event) => event.label)).toEqual(['debug.source.2', 'debug.source.3'])
    expect(window.events.map((event) => event.sourceAuthority)).toEqual(['runtime-live', 'runtime-live'])
    expect(window.events.map((event) => event.order.coordinate)).toEqual([
      { kind: 'txn-op', txnSeq: 2, opSeq: 2 },
      { kind: 'txn-op', txnSeq: 3, opSeq: 3 },
    ])
    expect(store.getDiagnostics()).toMatchObject({
      carrierQueueEntries: 2,
      ledgerEventAllocations: 2,
      diagnosticProjectionAllocations: 2,
    })
  })

  it('normalizes process source refs through runtime-live event windows without changing owner authority', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: true })
    const ref = CoreDebug.toRuntimeDebugEventRef(
      {
        type: 'process:start',
        moduleId: 'DebugSourceModule',
        instanceId: 'default',
        runtimeLabel: 'runtime-debug-source',
        identity: {
          moduleId: 'DebugSourceModule',
          instanceId: 'default',
          processId: 'sync-user',
        },
        severity: 'info',
        eventSeq: 9,
        timestampMs: 100,
        txnSeq: 4,
      } as any,
      { diagnosticsLevel: 'full', eventSeq: 1 },
    )
    expect(ref).toBeDefined()

    store.addRuntimeDebugEventRef(ref!, target)
    const window = store.readWindow({ target, eventKinds: ['process'] })

    expect(window.events).toHaveLength(1)
    expect(window.events[0]).toMatchObject({
      eventKind: 'process',
      label: 'process:start',
      sourceAuthority: 'runtime-live',
      txnSeq: 4,
      order: { coordinate: { kind: 'txn-event', txnSeq: 4, eventSeq: 9 } },
      payload: {
        kind: 'bounded-summary',
        owner: 'runtime-live',
        summary: expect.objectContaining({
          type: 'process:start',
          label: 'process:start',
        }),
      },
    })
  })
})
