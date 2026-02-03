import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Named logic slots (083) - required missing', () => {
  it('should fail with structured SlotsValidationError', () => {
    const M = Logix.Module.make('Slots.RequiredMissing', {
      state: Schema.Void,
      actions: {},
      slots: {
        Primary: { required: true },
      },
    })

    let error: unknown
    try {
      M.implement({ initial: undefined, logics: [] })
    } catch (e) {
      error = e
    }

    expect((error as any)?.name).toBe('SlotsValidationError')
    expect((error as any)?.code).toBe('slots.requiredMissing')
    expect((error as any)?.slotName).toBe('Primary')
  })
})

