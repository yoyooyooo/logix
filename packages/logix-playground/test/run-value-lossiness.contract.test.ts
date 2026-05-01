import { describe, expect, it } from 'vitest'
import { projectRunFailure, projectRunValue } from '../src/internal/runner/runProjection.js'

describe('Run value lossiness projection', () => {
  it('distinguishes business null from projected undefined', () => {
    expect(projectRunValue('r-null', null)).toMatchObject({
      status: 'passed',
      value: null,
      valueKind: 'null',
      lossy: false,
    })
    expect(projectRunValue('r-undefined', undefined)).toMatchObject({
      status: 'passed',
      value: null,
      valueKind: 'undefined',
      lossy: true,
    })
    expect(projectRunValue('r-undefined', undefined).lossReasons).toContain('undefined-to-null')
  })

  it('marks top-level truncation as lossy', () => {
    const projected = projectRunValue('r-truncated', 'x'.repeat(10_010))

    expect(projected.valueKind).toBe('truncated')
    expect(projected.lossy).toBe(true)
    expect(projected.lossReasons).toContain('string-truncated')
  })

  it('keeps failed Run separate from value projection', () => {
    const failure = projectRunFailure('r-failed', 'runtime', new Error('boom'))

    expect(failure.status).toBe('failed')
    expect((failure as any).value).toBeUndefined()
    expect(failure.failure).toMatchObject({ kind: 'runtime', message: 'boom' })
  })
})
