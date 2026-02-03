import { describe, it, expect } from 'vitest'
import { diffPortSpec } from '../../src/workbench/ports/diffPortSpec.js'

describe('ports (035): PortSpec diff - breaking', () => {
  it('fails when an action key is removed', () => {
    const before = {
      protocolVersion: 'v1',
      moduleId: 'M',
      actions: [{ key: 'a' }, { key: 'b' }],
      events: [{ key: 'a' }, { key: 'b' }],
      outputs: [],
      exports: [],
    } as const

    const after = {
      protocolVersion: 'v1',
      moduleId: 'M',
      actions: [{ key: 'b' }],
      events: [{ key: 'b' }],
      outputs: [],
      exports: [],
    } as const

    const diff = diffPortSpec(before, after)
    expect(diff.verdict).toBe('FAIL')
    expect(diff.breaking).toBe(true)
    expect(diff.changes.some((c) => c.code === 'portspec::removed_action')).toBe(true)
  })
})

