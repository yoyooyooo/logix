import { describe, expect, it } from 'vitest'
import { collectEffectV4MatrixViolations } from './effect-v4-matrix'

describe('effect v4 workspace matrix', () => {
  it('keeps workspace manifests free from legacy effect 3.x / @effect 0.x pins', () => {
    const violations = collectEffectV4MatrixViolations()

    expect(violations).toEqual([])
  })
})
