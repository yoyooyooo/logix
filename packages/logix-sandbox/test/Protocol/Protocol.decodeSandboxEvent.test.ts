import { describe, it, expect } from 'vitest'
import { decodeSandboxEvent } from '@logixjs/sandbox'

describe('Protocol: decodeSandboxEvent', () => {
  it('rejects non-object input', () => {
    const res = decodeSandboxEvent(null)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe('$')
    }
  })

  it('accepts READY', () => {
    const res = decodeSandboxEvent({ type: 'READY', payload: { version: '0.0.0', compilerReady: true } })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.type).toBe('READY')
    }
  })

  it('rejects READY with invalid payload', () => {
    const res = decodeSandboxEvent({ type: 'READY', payload: { version: '0.0.0', compilerReady: 'nope' } })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues.some((i) => i.path === '$.payload.compilerReady')).toBe(true)
    }
  })

  it('rejects unsupported protocolVersion', () => {
    const res = decodeSandboxEvent({ protocolVersion: 'v2', type: 'READY', payload: { version: '0.0.0', compilerReady: true } })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues.some((i) => i.path === '$.protocolVersion')).toBe(true)
    }
  })

  it('accepts ERROR (PROTOCOL_ERROR) with protocol details', () => {
    const res = decodeSandboxEvent({
      type: 'ERROR',
      payload: {
        code: 'PROTOCOL_ERROR',
        message: 'bad message',
        protocol: {
          direction: 'HostToWorker',
          messageType: 'INIT',
          issues: [{ path: '$.payload', message: 'expected object' }],
        },
      },
    })
    expect(res.ok).toBe(true)
    if (res.ok && res.value.type === 'ERROR') {
      expect(res.value.payload.code).toBe('PROTOCOL_ERROR')
      expect(res.value.payload.protocol?.direction).toBe('HostToWorker')
    }
  })

  it('rejects ERROR with unknown code', () => {
    const res = decodeSandboxEvent({ type: 'ERROR', payload: { code: 'NOPE', message: 'x' } })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.issues.some((i) => i.path === '$.payload.code')).toBe(true)
    }
  })
})
