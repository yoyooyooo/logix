import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { deriveWorkbenchHostViewModel, normalizeLiveSnapshot } from '../../src/internal/state/workbench/index.js'

describe('DVTools workbench derivation baseline', () => {
  it('records 500-event derivation cost', () => {
    const events = Array.from({ length: 500 }, (_, index) => ({
      kind: index % 10 === 0 ? 'react-render' : 'state',
      label: index % 10 === 0 ? 'react:render' : 'state:update',
      runtimeLabel: 'app',
      moduleId: 'FormModule',
      instanceId: 'form-1',
      timestamp: index,
      txnSeq: Math.floor(index / 5) + 1,
      opSeq: (index % 5) + 1,
      eventSeq: index + 1,
      meta: {},
    }))

    const input = normalizeLiveSnapshot({ events, latestStates: new Map(), instances: new Map() } as any)

    const startedAt = performance.now()
    const model = deriveWorkbenchHostViewModel(input)
    const durationMs = performance.now() - startedAt

    expect(model.sessions.length).toBeGreaterThan(0)
    expect(durationMs).toBeLessThan(200)
  })
})
