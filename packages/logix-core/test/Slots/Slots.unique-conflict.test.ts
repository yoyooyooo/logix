import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Named logic slots (083) - unique conflict', () => {
  it('should fail with structured SlotsValidationError', () => {
    const M = Logix.Module.make('Slots.UniqueConflict', {
      state: Schema.Void,
      actions: {},
      slots: {
        Primary: { unique: true },
      },
    })

    const A = M.logic(() => Effect.void, { id: 'A', slotName: 'Primary' })
    const B = M.logic(() => Effect.void, { id: 'B', slotName: 'Primary' })

    let error: unknown
    try {
      M.implement({ initial: undefined, logics: [A, B] })
    } catch (e) {
      error = e
    }

    expect((error as any)?.name).toBe('SlotsValidationError')
    expect((error as any)?.code).toBe('slots.uniqueConflict')
    expect((error as any)?.slotName).toBe('Primary')
  })
})

