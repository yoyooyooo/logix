import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import {
  currentExecVmMode,
  execVmModeLayer,
  withExecVmMode,
} from '../../../src/internal/state-trait/exec-vm-mode.js'

describe('ExecVmMode reference', () => {
  it.effect('defaults to false and can be locally overridden', () =>
    Effect.gen(function* () {
      const current = Effect.service(currentExecVmMode).pipe(Effect.orDie)
      expect(yield* current).toBe(false)
      expect(yield* withExecVmMode(current)).toBe(true)
      expect(yield* current).toBe(false)
    }),
  )

  it.effect('execVmModeLayer provides the configured value', () =>
    Effect.gen(function* () {
      const current = Effect.service(currentExecVmMode).pipe(Effect.orDie)
      expect(yield* current).toBe(false)
      const provided = current.pipe(Effect.provide(execVmModeLayer(true)))
      expect(yield* provided).toBe(true)
    }),
  )
})
