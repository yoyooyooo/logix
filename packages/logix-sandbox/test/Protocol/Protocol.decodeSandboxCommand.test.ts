import { describe, it, expect } from 'vitest'
import { decodeSandboxCommand } from '@logixjs/sandbox'

describe('Protocol: decodeSandboxCommand', () => {
  it('rejects non-object input', () => {
    const res = decodeSandboxCommand(null)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe('$')
    }
  })

  it('accepts INIT without payload', () => {
    const res = decodeSandboxCommand({ type: 'INIT' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.type).toBe('INIT')
    }
  })

  it('rejects unsupported protocolVersion', () => {
    const res = decodeSandboxCommand({ protocolVersion: 'v2', type: 'INIT' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues.some((i) => i.path === '$.protocolVersion')).toBe(true)
    }
  })

  it('rejects INIT with invalid wasmUrl type', () => {
    const res = decodeSandboxCommand({ type: 'INIT', payload: { wasmUrl: 123 } })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues.some((i) => i.path === '$.payload.wasmUrl')).toBe(true)
    }
  })

  it('rejects COMPILE without code', () => {
    const res = decodeSandboxCommand({ type: 'COMPILE', payload: {} })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues.some((i) => i.path === '$.payload.code')).toBe(true)
    }
  })

  it('rejects unknown command type', () => {
    const res = decodeSandboxCommand({ type: 'NOPE' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe('$.type')
    }
  })
})
