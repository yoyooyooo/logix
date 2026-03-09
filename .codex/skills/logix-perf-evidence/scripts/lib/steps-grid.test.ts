import { describe, expect, it } from 'vitest'
import { compareStepsGrid, computeStepsGridHash, describeStepsGrid } from './steps-grid'

describe('steps-grid', () => {
  it('同一网格在点位顺序不同下应得到相同哈希', () => {
    const before = {
      suites: [
        {
          id: 'converge.txnCommit',
          points: [
            { params: { steps: 2000, dirtyRootsRatio: 0.4, convergeMode: 'auto' } },
            { params: { steps: 3200, dirtyRootsRatio: 0.5, convergeMode: 'auto' } },
            { params: { steps: 8000, dirtyRootsRatio: 0.6, convergeMode: 'full' } },
          ],
        },
      ],
    }

    const after = {
      suites: [
        {
          id: 'converge.txnCommit',
          points: [
            { params: { steps: 8000, dirtyRootsRatio: 0.6, convergeMode: 'full' } },
            { params: { steps: 2000, dirtyRootsRatio: 0.4, convergeMode: 'auto' } },
            { params: { steps: 3200, dirtyRootsRatio: 0.5, convergeMode: 'auto' } },
          ],
        },
      ],
    }

    const result = compareStepsGrid(before, after)
    expect(result.matched).toBe(true)
    expect(result.beforeHash).toBe(result.afterHash)
  })

  it('steps 轴不同应明确识别为不匹配', () => {
    const before = {
      suites: [
        {
          id: 'converge.txnCommit',
          points: [
            { params: { steps: 200, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
            { params: { steps: 400, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
            { params: { steps: 2000, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
          ],
        },
      ],
    }

    const after = {
      suites: [
        {
          id: 'converge.txnCommit',
          points: [
            { params: { steps: 2000, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
            { params: { steps: 3200, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
            { params: { steps: 8000, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
          ],
        },
      ],
    }

    const result = compareStepsGrid(before, after)
    expect(result.matched).toBe(false)
    expect(result.beforeHash).not.toBe(result.afterHash)
    expect(result.beforeSummary).toContain('converge.txnCommit=[steps:200,400,2000')
    expect(result.afterSummary).toContain('converge.txnCommit=[steps:2000,3200,8000')
  })

  it('dirtyRootsRatio 或 convergeMode 轴漂移也应识别为不匹配', () => {
    const before = {
      suites: [
        {
          id: 'converge.txnCommit',
          points: [
            { params: { steps: 2000, dirtyRootsRatio: 0.4, convergeMode: 'auto' } },
            { params: { steps: 3200, dirtyRootsRatio: 0.5, convergeMode: 'auto' } },
          ],
        },
      ],
    }

    const after = {
      suites: [
        {
          id: 'converge.txnCommit',
          points: [
            { params: { steps: 2000, dirtyRootsRatio: 0.4, convergeMode: 'full' } },
            { params: { steps: 3200, dirtyRootsRatio: 0.7, convergeMode: 'full' } },
          ],
        },
      ],
    }

    const result = compareStepsGrid(before, after)
    expect(result.matched).toBe(false)
    expect(result.beforeSummary).toContain('dirtyRootsRatio:0.4,0.5')
    expect(result.afterSummary).toContain('dirtyRootsRatio:0.4,0.7')
    expect(result.beforeSummary).toContain('convergeMode:auto')
    expect(result.afterSummary).toContain('convergeMode:full')
  })

  it('describeStepsGrid 对多 suite 按 suiteId 稳定排序', () => {
    const report = {
      suites: [
        {
          id: 'b-suite',
          points: [
            { params: { steps: 2, dirtyRootsRatio: 0.2, convergeMode: 'auto' } },
            { params: { steps: 1, dirtyRootsRatio: 0.1, convergeMode: 'full' } },
          ],
        },
        {
          id: 'a-suite',
          points: [{ params: { steps: 3, dirtyRootsRatio: 0.3, convergeMode: 'auto' } }],
        },
      ],
    }

    expect(describeStepsGrid(report)).toEqual([
      { suiteId: 'a-suite', stepsLevels: [3], dirtyRootsRatioLevels: [0.3], convergeModes: ['auto'] },
      { suiteId: 'b-suite', stepsLevels: [1, 2], dirtyRootsRatioLevels: [0.1, 0.2], convergeModes: ['auto', 'full'] },
    ])
    const hash = computeStepsGridHash(report)
    expect(hash.hash).toHaveLength(64)
  })
})
