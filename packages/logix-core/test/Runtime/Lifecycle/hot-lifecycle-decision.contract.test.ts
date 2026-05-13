import { describe, expect, it } from 'vitest'
import {
  makeHotLifecycleEventId,
  normalizeHotLifecycleDecision,
} from '../../../src/internal/runtime/core/hotLifecycle/index.js'

describe('hot lifecycle decision contract', () => {
  it('accepts only reset and dispose', () => {
    expect(normalizeHotLifecycleDecision('reset')).toBe('reset')
    expect(normalizeHotLifecycleDecision('dispose')).toBe('dispose')
    expect(() => normalizeHotLifecycleDecision('retain' as never)).toThrow(/Unsupported hot lifecycle decision/)
  })

  it('creates deterministic owner-scoped event ids', () => {
    expect(makeHotLifecycleEventId('task-runner', 1)).toBe('task-runner::hmr:1')
    expect(makeHotLifecycleEventId('task-runner', 2)).toBe('task-runner::hmr:2')
  })
})
