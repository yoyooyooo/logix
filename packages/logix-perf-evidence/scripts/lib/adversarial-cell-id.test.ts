import { describe, expect, it } from 'vitest'

import { makeAdversarialCellId, makeAdversarialMatrixHash } from './adversarial-cell-id.js'

const axesA = {
  seed: 1337,
  dirtyRootsRatio: 0.05,
  patternKind: 'randomHighCardinality',
  nested: { b: true, a: 'x' },
}

const axesB = {
  patternKind: 'randomHighCardinality',
  nested: { a: 'x', b: true },
  dirtyRootsRatio: 0.05,
  seed: 1337,
}

describe('adversarial matrix cell IDs', () => {
  it('keeps cell IDs stable for reordered axis objects', () => {
    expect(makeAdversarialCellId({ hotPath: 'fieldKernel.negativeDirtyPattern', axes: axesA })).toBe(
      makeAdversarialCellId({ hotPath: 'fieldKernel.negativeDirtyPattern', axes: axesB }),
    )
  })

  it('changes cell IDs when a meaningful axis changes', () => {
    expect(makeAdversarialCellId({ hotPath: 'fieldKernel.negativeDirtyPattern', axes: axesA })).not.toBe(
      makeAdversarialCellId({ hotPath: 'fieldKernel.negativeDirtyPattern', axes: { ...axesA, seed: 42 } }),
    )
  })

  it('keeps matrix hashes stable for reordered cells and required paths', () => {
    const a = makeAdversarialMatrixHash({
      matrixId: 'logix.adversarial.runtime.v1',
      profile: 'adversarial-default',
      requiredHotPaths: ['b', 'a'],
      cells: [
        { hotPath: 'b', axes: { seed: 2 } },
        { hotPath: 'a', axes: { seed: 1 } },
      ],
    })
    const b = makeAdversarialMatrixHash({
      matrixId: 'logix.adversarial.runtime.v1',
      profile: 'adversarial-default',
      requiredHotPaths: ['a', 'b'],
      cells: [
        { hotPath: 'a', axes: { seed: 1 } },
        { hotPath: 'b', axes: { seed: 2 } },
      ],
    })

    expect(a).toBe(b)
    expect(a).toMatch(/^sha256:[a-f0-9]{64}$/)
  })
})
