import { describe, it, expect } from '@effect/vitest'
import {
  buildSelectorWarningHint,
  evaluateSelectorWarning,
  makeSelectorDiagnosticsConfig,
  makeSelectorSamplingTracker,
} from '../../src/internal/runtime/core/process/selectorDiagnostics.js'

describe('process: selector diagnostics helpers', () => {
  it('should emit high-frequency warning when threshold is reached outside cooldown', () => {
    const config = makeSelectorDiagnosticsConfig(true)
    const now = 60_000
    const state = {
      windowStartedMs: now - 100,
      triggersInWindow: config.triggerWarningThreshold - 1,
      lastWarningAtMs: 0,
    }

    const [decision, next] = evaluateSelectorWarning(state, now, {
      config,
      sampling: {
        sampled: 0,
        maxSampleMs: 0,
      },
    })

    expect(decision.shouldWarn).toBe(true)
    expect(decision.tooFrequent).toBe(true)
    expect(decision.tooSlow).toBe(false)
    expect(next.windowStartedMs).toBe(now)
    expect(next.triggersInWindow).toBe(0)
    expect(next.lastWarningAtMs).toBe(now)
  })

  it('should suppress warning during cooldown even when frequency/slow conditions match', () => {
    const config = makeSelectorDiagnosticsConfig(true)
    const now = 50_000
    const state = {
      windowStartedMs: now - 100,
      triggersInWindow: config.triggerWarningThreshold - 1,
      lastWarningAtMs: now - 1,
    }

    const [decision, next] = evaluateSelectorWarning(state, now, {
      config,
      sampling: {
        sampled: 1,
        maxSampleMs: config.slowSampleThresholdMs + 1,
      },
    })

    expect(decision.shouldWarn).toBe(false)
    expect(decision.tooFrequent).toBe(true)
    expect(decision.tooSlow).toBe(true)
    expect(next.windowStartedMs).toBe(state.windowStartedMs)
    expect(next.triggersInWindow).toBe(config.triggerWarningThreshold)
    expect(next.lastWarningAtMs).toBe(state.lastWarningAtMs)
  })

  it('should keep hint content stable for diagnostics tooling', () => {
    const config = makeSelectorDiagnosticsConfig(true)
    const hint = buildSelectorWarningHint({
      moduleId: 'Host',
      path: 'n',
      decision: {
        shouldWarn: true,
        tooFrequent: true,
        tooSlow: false,
        triggersInWindow: 28,
      },
      config,
      sampling: {
        calls: 256,
        sampled: 2,
        slowSamples: 1,
        maxSampleMs: 7.4,
      },
    })

    expect(hint).toContain('moduleId=Host')
    expect(hint).toContain('path=n')
    expect(hint).toContain(`threshold=${config.triggerWarningThreshold}`)
    expect(hint).toContain(`cooldownMs=${config.warningCooldownMs}`)
    expect(hint).toContain('calls=256')
    expect(hint).toContain('slowSamples(>=4ms)=1')
    expect(hint).toContain('maxSampleMs=7.40')
  })

  it('should sample with mask and reset only per-window metrics', () => {
    const tracker = makeSelectorSamplingTracker({
      sampleEveryMask: 0x3, // sample every 4 calls
      slowSampleThresholdMs: 4,
    })

    expect(tracker.onSelectorCall()).toBe(false) // 1
    expect(tracker.onSelectorCall()).toBe(false) // 2
    expect(tracker.onSelectorCall()).toBe(false) // 3
    expect(tracker.onSelectorCall()).toBe(true) // 4
    tracker.recordSample(6)

    expect(tracker.onSelectorCall()).toBe(false) // 5
    expect(tracker.onSelectorCall()).toBe(false) // 6
    expect(tracker.onSelectorCall()).toBe(false) // 7
    expect(tracker.onSelectorCall()).toBe(true) // 8
    tracker.recordSample(2)

    expect(tracker.snapshot()).toEqual({
      calls: 8,
      sampled: 2,
      slowSamples: 1,
      maxSampleMs: 6,
    })

    tracker.resetSampling()

    expect(tracker.snapshot()).toEqual({
      calls: 8,
      sampled: 0,
      slowSamples: 0,
      maxSampleMs: 0,
    })

    expect(tracker.onSelectorCall()).toBe(false) // 9
    expect(tracker.onSelectorCall()).toBe(false) // 10
    expect(tracker.onSelectorCall()).toBe(false) // 11
    expect(tracker.onSelectorCall()).toBe(true) // 12
  })
})
