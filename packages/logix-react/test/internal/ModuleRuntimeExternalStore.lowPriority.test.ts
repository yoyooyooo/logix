import { describe, it, expect, vi } from 'vitest'
import { Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { getModuleRuntimeExternalStore } from '../../src/internal/store/ModuleRuntimeExternalStore.js'

describe('ModuleRuntimeExternalStore lowPriority scheduling', () => {
  it('lowPriority updates are delayed/merged and bounded by maxDelayMs', async () => {
    vi.useFakeTimers()

    const originalRaf = (globalThis as any).requestAnimationFrame
    const originalCancelRaf = (globalThis as any).cancelAnimationFrame
    ;(globalThis as any).requestAnimationFrame = () => 1
    ;(globalThis as any).cancelAnimationFrame = () => undefined

    try {
      const State = Schema.Struct({ value: Schema.Number })
      const Actions = { inc: Schema.Void }

      const M = Logix.Module.make('ExternalStoreLowPriority', {
        state: State,
        actions: Actions,
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const impl = M.implement({ initial: { value: 0 }, logics: [] })
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const rt: any = runtime.runSync(M.tag)

      const store = getModuleRuntimeExternalStore(runtime as any, rt, {
        lowPriorityMaxDelayMs: 20,
      })

      let notifyCount = 0
      const unsub = store.subscribe(() => {
        notifyCount += 1
      })

      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))

      expect(notifyCount).toBe(0)

      vi.advanceTimersByTime(19)
      expect(notifyCount).toBe(0)

      vi.advanceTimersByTime(1)
      expect(notifyCount).toBe(1)

      // merge: multiple lowPriority commits should coalesce into (at most) one scheduled notify
      notifyCount = 0

      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))
      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))

      expect(notifyCount).toBe(0)

      vi.advanceTimersByTime(20)
      expect(notifyCount).toBe(1)

      unsub()
      await runtime.dispose()
    } finally {
      ;(globalThis as any).requestAnimationFrame = originalRaf
      ;(globalThis as any).cancelAnimationFrame = originalCancelRaf
      vi.useRealTimers()
    }
  })
})
