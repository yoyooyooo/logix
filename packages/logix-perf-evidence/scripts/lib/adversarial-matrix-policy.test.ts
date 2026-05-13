import { describe, expect, it } from 'vitest'
import { evaluateAdversarialMatrixPolicy } from './adversarial-matrix-policy.js'
import matrix from '../../assets/matrix.json'

describe('adversarial matrix policy', () => {
  it('keeps the default policy sparse and rejects full Cartesian expansion without evidence override', () => {
    const report = evaluateAdversarialMatrixPolicy({
      profile: 'default',
      mode: 'cartesian',
      cellCount: 81,
      axes: {
        dirtyRootsRatio: ['low', 'high', 'extreme'],
        selectorFanout: ['low', 'field', 'graph'],
        diagnosticsLevel: ['off', 'light', 'full'],
        txnQueueBacklog: ['none', 'medium', 'high'],
      },
    })

    expect(report.status).toBe('blocked')
    expect(report.mode).toBe('cartesian')
    expect(report.maxCells).toBe(80)
    expect(report.reasons.join('\n')).toContain('full Cartesian matrix requires blocked-marker or maintainer override')
  })

  it('allows selected sparse pair interactions inside the profile budget', () => {
    const report = evaluateAdversarialMatrixPolicy({
      profile: 'default',
      mode: 'sparse',
      cellCount: 12,
      anchors: ['default baseline', 'diagnostics off', 'dirty precision pressure'],
      pairs: ['dirty precision x selector'],
    })

    expect(report.status).toBe('pass')
    expect(report.reasons).toEqual([])
  })

  it('keeps the checked-in matrix policy sparse with explicit expansion evidence requirement', () => {
    expect(matrix.matrixPolicy.mode).toBe('sparse')
    expect(matrix.matrixPolicy.expansionRequires).toBe('blocked-marker-or-maintainer-override')
    expect(matrix.matrixPolicy.maxCellsByProfile.default).toBeLessThan(100)
    expect(matrix.matrixPolicy.selectedPairs).toContain('txn burst x runtime store')
  })
})
