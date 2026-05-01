import { describe, expect, it } from 'vitest'
import {
  assertKnownAuthorityOrGapText,
  formatGapFailure,
  isKnownOwnerClass,
} from './playground-gap-harvest'

describe('Playground gap harvest helpers', () => {
  it('keeps ownerClass as test attribution without creating runtime gap codes', () => {
    expect(isKnownOwnerClass('runtime-dispatch')).toBe(true)
    expect(isKnownOwnerClass('new-runtime-gap-code')).toBe(false)
    expect(formatGapFailure({
      projectId: 'logix-react.local-counter',
      packId: 'boundaryProbe',
      ownerClass: 'runtime-dispatch',
      message: 'dispatch did not expose failed event',
    })).toContain('ownerClass=runtime-dispatch')
  })

  it('accepts only existing authority, failure, or evidence gap faces', () => {
    expect(() => assertKnownAuthorityOrGapText({
      projectId: 'logix-react.local-counter',
      packId: 'gapHarvest',
      ownerClass: 'reflection',
      regionLabel: 'Action workbench',
      text: 'authority=runtime-reflection actionTag=increment',
    })).not.toThrow()
    expect(() => assertKnownAuthorityOrGapText({
      projectId: 'logix-react.local-counter',
      packId: 'gapHarvest',
      ownerClass: 'projection',
      regionLabel: 'Diagnostics detail',
      text: 'rendered empty panel',
    })).toThrow(/ownerClass=projection/)
  })
})
