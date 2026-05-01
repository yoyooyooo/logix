import { describe, expect, it } from 'vitest'
import * as Logix from '../../src/index.js'
import * as InternalContracts from '../../src/internal/InternalContracts.js'
import * as ReadContracts from '../../src/internal/read-contracts.js'
import pkg from '../../package.json' with { type: 'json' }

describe('core internal contracts boundary', () => {
  it('does not expose InternalContracts on the root barrel', () => {
    expect('InternalContracts' in Logix).toBe(false)
  })

  it('does not keep wildcard repo-internal exports in workspace or publish maps', () => {
    expect(pkg.exports['./repo-internal/*' as keyof typeof pkg.exports]).toBeUndefined()
    expect(pkg.publishConfig.exports['./repo-internal/*' as keyof typeof pkg.publishConfig.exports]).toBeUndefined()
  })

  it('keeps repo-internal exports on an explicit allowlist', () => {
    expect(pkg.exports['./repo-internal/InternalContracts' as keyof typeof pkg.exports]).toBeDefined()
    expect(pkg.exports['./repo-internal/runtime-contracts' as keyof typeof pkg.exports]).toBeDefined()
    expect(pkg.exports['./repo-internal/read-contracts' as keyof typeof pkg.exports]).toBeDefined()
    expect(pkg.exports['./repo-internal/field-contracts' as keyof typeof pkg.exports]).toBeDefined()
    expect(pkg.publishConfig.exports['./repo-internal/runtime-contracts' as keyof typeof pkg.publishConfig.exports]).toBeNull()
    expect(pkg.publishConfig.exports['./repo-internal/read-contracts' as keyof typeof pkg.publishConfig.exports]).toBeNull()
    expect(pkg.publishConfig.exports['./repo-internal/field-contracts' as keyof typeof pkg.publishConfig.exports]).toBeNull()
  })

  it('does not leak read-side residual nouns through repo-internal grouped contracts', () => {
    expect('ReadQuery' in ReadContracts).toBe(false)
    expect('ExternalStore' in ReadContracts).toBe(false)
    expect('Resource' in ReadContracts).toBe(false)
    expect('ReadQuery' in InternalContracts).toBe(false)
    expect('ExternalStore' in InternalContracts).toBe(false)
    expect('Resource' in InternalContracts).toBe(false)
  })
})
