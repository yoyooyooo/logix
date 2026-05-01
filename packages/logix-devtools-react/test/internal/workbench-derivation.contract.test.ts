import { describe, expect, it } from 'vitest'
import {
  deriveWorkbenchHostViewModel,
  normalizeImportedEvidencePackage,
  normalizeLiveSnapshot,
} from '../../src/internal/state/workbench/index.js'

const event = (override: Record<string, unknown>) => ({
  kind: 'state',
  label: 'state:update',
  runtimeLabel: 'app',
  moduleId: 'FormModule',
  instanceId: 'form-1',
  timestamp: 100,
  txnSeq: 1,
  opSeq: 1,
  eventSeq: 1,
  meta: {},
  ...override,
})

describe('DVTools workbench derivation', () => {
  it('normalizes live and imported evidence through the same event shape', () => {
    const live = normalizeLiveSnapshot({
      events: [event({ eventSeq: 1 }), event({ eventSeq: 2, opSeq: 2 })],
      latestStates: new Map(),
      runtimes: [],
    } as any)

    const imported = normalizeImportedEvidencePackage({
      events: [event({ eventSeq: 1 }), event({ eventSeq: 2, opSeq: 2 })],
      summary: { staticIrByDigest: {} },
      artifacts: [],
    } as any)

    expect(imported.events).toEqual(live.events)
    expect(imported.source.kind).toBe('imported-evidence')
    expect(live.source.kind).toBe('live-snapshot')
  })

  it('derives live and imported inputs through the same core projection law', () => {
    const live = deriveWorkbenchHostViewModel(
      normalizeLiveSnapshot({
        events: [event({ eventSeq: 1 }), event({ eventSeq: 2, opSeq: 2 })],
        latestStates: new Map(),
        runtimes: [],
      } as any),
    )

    const imported = deriveWorkbenchHostViewModel(
      normalizeImportedEvidencePackage({
        events: [event({ eventSeq: 1 }), event({ eventSeq: 2, opSeq: 2 })],
        summary: { staticIrByDigest: {} },
        artifacts: [],
      } as any),
    )

    expect(imported.projection.sessions.map((session) => session.runtimeCoordinate)).toEqual(
      live.projection.sessions.map((session) => session.runtimeCoordinate),
    )
    expect(imported.projection.sessions.every((session) => session.authorityRef.kind === 'debug-event-batch')).toBe(true)
  })

  it('derives sessions by txnSeq before timestamp', () => {
    const model = deriveWorkbenchHostViewModel(
      normalizeLiveSnapshot({
        events: [
          event({ timestamp: 300, txnSeq: 2, opSeq: 1, eventSeq: 3 }),
          event({ timestamp: 100, txnSeq: 1, opSeq: 1, eventSeq: 1 }),
          event({ timestamp: 200, txnSeq: 1, opSeq: 2, eventSeq: 2 }),
        ],
        latestStates: new Map(),
        runtimes: [],
      } as any),
    )

    expect(model.sessions.map((session) => session.coordinate.txnSeqRange)).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 2 },
    ])
  })

  it('uses structured runtime coordinates instead of misleading message text', () => {
    const model = deriveWorkbenchHostViewModel(
      normalizeLiveSnapshot({
        events: [
          event({
            kind: 'devtools',
            label: 'diagnostic',
            moduleId: 'A',
            instanceId: 'i1',
            message: 'moduleId=B instanceId=i2 artifactKey=fake',
            meta: {
              focusRef: { sourceRef: 'src/a.ts:1' },
              artifactKey: 'real-artifact',
            },
          }),
        ],
        latestStates: new Map(),
        runtimes: [],
      } as any),
    )

    expect(JSON.stringify(model)).not.toContain('fake')
    expect(model.sessions[0]?.coordinate.moduleId).toBe('A')
    expect(model.projection.sessions[0]?.runtimeCoordinate?.moduleId).toBe('A')
  })
})
