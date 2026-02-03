import { describe, it, expect } from 'vitest'
import { queryReferenceSpace } from '../../src/workbench/ports/query.js'

describe('ports (035): reference space query - degrade', () => {
  it('falls back to PortSpec keys when TypeIr is missing', () => {
    const res = queryReferenceSpace({
      portSpec: {
        protocolVersion: 'v1',
        moduleId: 'M',
        actions: [{ key: 'a' }, { key: 'b' }],
        events: [{ key: 'a' }, { key: 'b' }],
        outputs: [{ key: 'out' }],
        exports: [{ path: 'ok' }],
      },
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.keys.actions).toEqual(['a', 'b'])
    expect(res.typeIr.availability).toBe('missing')
  })

  it('keeps PortSpec keys when TypeIr is truncated', () => {
    const res = queryReferenceSpace({
      portSpec: {
        protocolVersion: 'v1',
        moduleId: 'M',
        actions: [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
        events: [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
        outputs: [],
        exports: [{ path: 'nested.value' }],
      },
      typeIr: {
        protocolVersion: 'v1',
        moduleId: 'M',
        types: [{ id: 'port:action:a', kind: 'action' }],
        truncated: true,
        budget: { maxNodes: 1 },
      },
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.keys.actions).toEqual(['a', 'b', 'c'])
    expect(res.typeIr.availability).toBe('truncated')
    expect(res.typeIr.budget?.maxNodes).toBe(1)
  })
})

