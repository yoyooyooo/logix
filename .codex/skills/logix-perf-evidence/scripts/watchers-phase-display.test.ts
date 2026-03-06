import { describe, expect, it } from 'vitest'
import {
  applyWatchersPhaseDisplayToNotes,
  buildWatchersPhaseDisplay,
  buildWatchersPhaseHighlight,
} from './watchers-phase-display'

describe('watchers-phase-display', () => {
  it('builds paired phase display for watcher suites', () => {
    const display = buildWatchersPhaseDisplay('watchers.clickToPaint', [
      {
        name: 'watchers.phase.clickInvokeToNativeCaptureMs',
        before: { ok: 0, unavailable: 0, missing: 14 },
        after: { ok: 14, unavailable: 0, missing: 0, value: 24.4 },
      },
      {
        name: 'watchers.phase.nativeCaptureToHandlerMs',
        before: { ok: 0, unavailable: 0, missing: 14 },
        after: { ok: 14, unavailable: 0, missing: 0, value: 9.5 },
      },
      {
        name: 'watchers.phase.handlerToDomStableMs',
        before: { ok: 0, unavailable: 0, missing: 14 },
        after: { ok: 14, unavailable: 0, missing: 0, value: 13.3 },
      },
      {
        name: 'watchers.phase.domStableToPaintGapMs',
        before: { ok: 0, unavailable: 0, missing: 14 },
        after: { ok: 14, unavailable: 0, missing: 0, value: 6.6 },
      },
    ])

    expect(display).toBeDefined()
    expect(display?.headline).toContain('watchers.clickToPaint paired phase')
    expect(display?.headline).toContain('clickInvokeToNativeCapture=24.4ms')
    expect(display?.headline).toContain('nativeCaptureToHandler=9.5ms')
    expect(display?.dominantSegment.label).toBe('clickInvokeToNativeCapture')
    expect(display?.dominantSegment.shareOfTrackedAfter).toBeCloseTo(24.4 / 53.8, 6)
    expect(display?.guidance).toContain('do not subtract independent suite aggregates')

    const highlight = buildWatchersPhaseHighlight(display)
    expect(highlight?.suiteId).toBe('watchers.clickToPaint')
    expect(highlight?.headline).toContain('dominant=clickInvokeToNativeCapture')

    const notes = applyWatchersPhaseDisplayToNotes('stabilityWarning: sample', display)
    expect(notes).toContain('paired phase')
    expect(notes).toContain('stabilityWarning: sample')
  })

  it('skips non-watcher suites or missing after values', () => {
    expect(
      buildWatchersPhaseDisplay('converge.txnCommit', [
        {
          name: 'watchers.phase.clickInvokeToNativeCaptureMs',
          before: { ok: 0, unavailable: 0, missing: 14 },
          after: { ok: 14, unavailable: 0, missing: 0, value: 24.4 },
        },
      ]),
    ).toBeUndefined()

    expect(
      buildWatchersPhaseDisplay('watchers.clickToPaint', [
        {
          name: 'watchers.phase.clickInvokeToNativeCaptureMs',
          before: { ok: 0, unavailable: 0, missing: 14 },
          after: { ok: 14, unavailable: 0, missing: 0 },
        },
      ]),
    ).toBeUndefined()
  })
})
