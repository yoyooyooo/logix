import { describe, it, expect } from 'vitest'
import { diffTypeIr } from '../../src/workbench/ports/diffTypeIr.js'

describe('ports (035): TypeIr diff - degrade', () => {
  it('warns when TypeIr is unavailable', () => {
    const diff = diffTypeIr(undefined, undefined)
    expect(diff.verdict).toBe('WARN')
    expect(diff.changes[0]?.code).toBe('typeir::unavailable')
  })

  it('warns when TypeIr is truncated', () => {
    const truncated = {
      protocolVersion: 'v1',
      moduleId: 'M',
      truncated: true,
      types: [{ id: 'port:action:a', kind: 'action' }],
    } as const

    const diff = diffTypeIr(truncated, truncated)
    expect(diff.verdict).toBe('WARN')
    expect(diff.changes[0]?.code).toBe('typeir::truncated')
  })
})

