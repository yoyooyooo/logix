import { describe, beforeEach, afterEach, vi } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect } from 'effect'
import * as Logix from '../src/index.js'

class TokenString extends Context.Tag('test/ScopeRegistry/TokenString')<TokenString, string>() {}
class TokenNumber extends Context.Tag('test/ScopeRegistry/TokenNumber')<TokenNumber, number>() {}

const makeRegistry = (): Logix.ScopeRegistry.ScopeRegistry =>
  Effect.runSync(Logix.ScopeRegistry.ScopeRegistryTag.pipe(Effect.provide(Logix.ScopeRegistry.layer())))

describe('ScopeRegistry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('register/get: last registration wins (LIFO)', () => {
    const registry = makeRegistry()

    registry.register('scope:1', TokenString, 'a')
    expect(registry.get('scope:1', TokenString)).toBe('a')

    registry.register('scope:1', TokenString, 'b')
    expect(registry.get('scope:1', TokenString)).toBe('b')
  })

  it('release: supports LIFO release and restores previous value', () => {
    const registry = makeRegistry()

    const leaseA = registry.register('scope:1', TokenString, 'a')
    const leaseB = registry.register('scope:1', TokenString, 'b')

    expect(registry.get('scope:1', TokenString)).toBe('b')

    leaseB.release()
    expect(registry.get('scope:1', TokenString)).toBe('a')

    leaseA.release()
    expect(registry.get('scope:1', TokenString)).toBeUndefined()
  })

  it('release: supports non-LIFO (middle) release', () => {
    const registry = makeRegistry()

    const leaseA = registry.register('scope:1', TokenString, 'a')
    const leaseB = registry.register('scope:1', TokenString, 'b')

    leaseA.release()
    expect(registry.get('scope:1', TokenString)).toBe('b')

    leaseB.release()
    expect(registry.get('scope:1', TokenString)).toBeUndefined()
  })

  it('clearToken: removes all registrations for a token', () => {
    const registry = makeRegistry()

    const leaseA = registry.register('scope:1', TokenString, 'a')
    registry.register('scope:1', TokenString, 'b')

    registry.clearToken('scope:1', TokenString)
    expect(registry.get('scope:1', TokenString)).toBeUndefined()

    // release must be idempotent even after clearToken
    leaseA.release()
    leaseA.release()
  })

  it('clearScope: removes all tokens under a scope', () => {
    const registry = makeRegistry()

    const leaseA = registry.register('scope:1', TokenString, 'a')
    const leaseB = registry.register('scope:1', TokenNumber, 1)

    registry.clearScope('scope:1')
    expect(registry.get('scope:1', TokenString)).toBeUndefined()
    expect(registry.get('scope:1', TokenNumber)).toBeUndefined()

    // release must be idempotent even after clearScope
    leaseA.release()
    leaseB.release()
  })

  it('clearAll: removes all scopes', () => {
    const registry = makeRegistry()

    const leaseA = registry.register('scope:1', TokenString, 'a')
    const leaseB = registry.register('scope:2', TokenString, 'b')

    registry.clearAll()
    expect(registry.get('scope:1', TokenString)).toBeUndefined()
    expect(registry.get('scope:2', TokenString)).toBeUndefined()

    leaseA.release()
    leaseB.release()
  })
})
