import { describe, expect, it } from 'vitest'
import { computeDevtoolsState } from '../../src/internal/state/compute.js'
import type { DevtoolsSnapshot } from '../../src/internal/snapshot/index.js'

const makeStateUpdateEvent = (timestamp: number) =>
  ({
    eventId: `i1::e${timestamp}`,
    eventSeq: timestamp,
    moduleId: 'M',
    instanceId: 'i1',
    runtimeLabel: 'R',
    txnSeq: 1,
    txnId: 'i1::t1',
    timestamp,
    kind: 'state',
    label: 'state:update',
    meta: {
      state: { count: 1 },
    },
  }) as any

const makeSnapshot = (args: {
  events: DevtoolsSnapshot['events']
  dropped?: number
  oversized?: number
  byEvent?: ReadonlyArray<{
    key: string
    dropped: number
    oversized: number
    costClass?: 'runtime_core' | 'controlplane_phase' | 'devtools_projection'
    gateClass?: 'hard' | 'soft'
    samplingPolicy?: 'always' | 'budgeted' | 'sampled'
  }>
}): DevtoolsSnapshot => {
  const byEvent = new Map<string, any>()
  for (const item of args.byEvent ?? []) {
    byEvent.set(item.key, {
      key: item.key,
      source: 'runtime-debug-event',
      eventType: 'state:before_update',
      kind: 'state',
      label: 'state:update',
      dropped: item.dropped,
      oversized: item.oversized,
      costClass: item.costClass ?? 'devtools_projection',
      gateClass: item.gateClass ?? 'soft',
      samplingPolicy: item.samplingPolicy ?? 'sampled',
    })
  }

  return {
    snapshotToken: 1,
    instances: new Map([['R::M', 1]]),
    events: args.events,
    latestStates: new Map([['R::M::i1', { count: 1 }]]),
    latestTraitSummaries: new Map(),
    exportBudget: {
      dropped: args.dropped ?? 0,
      oversized: args.oversized ?? 0,
      byEvent,
    },
  }
}

describe('computeDevtoolsState live projection budget visibility', () => {
  it('injects one synthetic devtools:projectionBudget event from live snapshot.exportBudget hotspots', () => {
    const byEvent = Array.from({ length: 12 }, (_, i) => ({
      key: `k-${i + 1}`,
      dropped: 12 - i,
      oversized: i % 2 === 0 ? 1 : 0,
    }))
    const snapshot = makeSnapshot({
      events: [makeStateUpdateEvent(100)],
      dropped: 12,
      oversized: 4,
      byEvent,
    })

    const state = computeDevtoolsState(undefined, snapshot, {
      userSelectedEvent: false,
    })

    expect(state.timeline.length).toBe(2)
    const synthetic = state.timeline[0]?.event as any
    expect(synthetic.kind).toBe('devtools')
    expect(synthetic.label).toBe('devtools:projectionBudget')
    expect(synthetic.meta?.totals).toEqual({ dropped: 12, oversized: 4 })
    expect(Array.isArray(synthetic.meta?.byEvent)).toBe(true)
    expect(synthetic.meta.byEvent.length).toBe(10)
    expect(synthetic.meta.byEvent[0]?.key).toBe('k-1')
    expect(synthetic.meta.byEvent[0]?.dropped).toBe(12)
    expect(synthetic.meta.byEvent[0]?.costClass).toBe('devtools_projection')
    expect(synthetic.meta.byEvent[0]?.gateClass).toBe('soft')
    expect(synthetic.meta.byEvent[0]?.samplingPolicy).toBe('sampled')
  })

  it('does not inject duplicate synthetic event when snapshot already contains devtools:projectionBudget', () => {
    const snapshot = makeSnapshot({
      events: [
        {
          eventId: 'i1::e99',
          eventSeq: 99,
          moduleId: 'M',
          instanceId: 'i1',
          runtimeLabel: 'R',
          txnSeq: 0,
          timestamp: 99,
          kind: 'devtools',
          label: 'devtools:projectionBudget',
          meta: {
            totals: { dropped: 2, oversized: 1 },
            byEvent: [
              {
                key: 'k-1',
                source: 'runtime-debug-event',
                eventType: 'state:before_update',
                kind: 'state',
                label: 'state:update',
                dropped: 2,
                oversized: 1,
              },
            ],
          },
        } as any,
        makeStateUpdateEvent(100),
      ],
      dropped: 2,
      oversized: 1,
      byEvent: [{ key: 'k-1', dropped: 2, oversized: 1 }],
    })

    const state = computeDevtoolsState(undefined, snapshot, {
      userSelectedEvent: false,
    })

    const hotspotEvents = state.timeline.filter(
      (entry) => (entry.event as any).kind === 'devtools' && (entry.event as any).label === 'devtools:projectionBudget',
    )
    expect(hotspotEvents.length).toBe(1)
  })
})
