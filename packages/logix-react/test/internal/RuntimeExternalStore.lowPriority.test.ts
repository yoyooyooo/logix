import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import {
  getRuntimeExternalStoreLastPulseEnvelope,
  getRuntimeModuleExternalStore,
  getRuntimeReadQueryExternalStore,
  runtimeSelectorDeltaMaybeChanged,
} from '../../src/internal/store/RuntimeExternalStore.js'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const makeStarvedRafHostScheduler = () => {
  let nextId = 1
  const animationFrames = new Map<number, () => void>()

  return {
    scheduler: {
      nowMs: () => Date.now(),
      scheduleMicrotask: (cb: () => void) => queueMicrotask(cb),
      scheduleMacrotask: (cb: () => void) => {
        const id = setTimeout(cb, 0)
        return () => {
          clearTimeout(id)
        }
      },
      scheduleAnimationFrame: (cb: () => void) => {
        const id = nextId
        nextId += 1
        animationFrames.set(id, cb)
        return () => {
          animationFrames.delete(id)
        }
      },
      scheduleTimeout: (ms: number, cb: () => void) => {
        const id = setTimeout(cb, ms)
        return () => {
          clearTimeout(id)
        }
      },
    },
    getAnimationFrameCount: () => animationFrames.size,
  } as const
}

describe('RuntimeExternalStore lowPriority scheduling', () => {
  it('lowPriority updates are delayed/merged and bounded by maxDelayMs', async () => {
    const hostScheduler = makeStarvedRafHostScheduler()

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
      hostScheduler: hostScheduler.scheduler,
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const rt: any = runtime.runSync(Effect.service(M.tag).pipe(Effect.orDie))

    const store = getRuntimeModuleExternalStore(runtime as any, rt, {
      lowPriorityDelayMs: 40,
      lowPriorityMaxDelayMs: 80,
    })

    let notifyCount = 0
    const unsub = store.subscribe(() => {
      notifyCount += 1
    })

    try {
      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))

      await sleep(20)
      expect(notifyCount).toBe(0)
      expect(hostScheduler.getAnimationFrameCount()).toBe(0)

      await sleep(30)
      expect(notifyCount).toBe(0)
      expect(hostScheduler.getAnimationFrameCount()).toBe(1)

      await sleep(60)
      expect(notifyCount).toBe(1)
      expect(hostScheduler.getAnimationFrameCount()).toBe(0)

      notifyCount = 0

      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))
      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))

      await sleep(20)
      expect(notifyCount).toBe(0)
      expect(hostScheduler.getAnimationFrameCount()).toBe(0)

      await sleep(30)
      expect(notifyCount).toBe(0)
      expect(hostScheduler.getAnimationFrameCount()).toBe(1)

      await sleep(60)
      expect(notifyCount).toBe(1)
      expect(hostScheduler.getAnimationFrameCount()).toBe(0)
    } finally {
      unsub()
      await runtime.dispose()
    }
  })

  it('coalesces module/readQuery lowPriority pulses into one module-level raf window', async () => {
    const hostScheduler = makeStarvedRafHostScheduler()

    const State = Schema.Struct({ value: Schema.Number })
    const Actions = { inc: Schema.Void }

    const M = Logix.Module.make('ExternalStoreLowPriorityModulePulseHub', {
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
      hostScheduler: hostScheduler.scheduler,
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const rt: any = runtime.runSync(Effect.service(M.tag).pipe(Effect.orDie))
    const readQuery = Logix.ReadQuery.make({
      selectorId: 'rq_low_priority_module_pulse_hub',
      reads: ['value'],
      select: (state: { readonly value: number }) => state.value,
      equalsKind: 'objectIs',
    })

    const moduleStore = getRuntimeModuleExternalStore(runtime as any, rt, {
      lowPriorityDelayMs: 40,
      lowPriorityMaxDelayMs: 80,
    })
    const readQueryStore = getRuntimeReadQueryExternalStore(runtime as any, rt, readQuery as any, {
      lowPriorityDelayMs: 40,
      lowPriorityMaxDelayMs: 80,
    })

    let moduleNotifyCount = 0
    let readQueryNotifyCount = 0
    const unsubModule = moduleStore.subscribe(() => {
      moduleNotifyCount += 1
    })
    const unsubReadQuery = readQueryStore.subscribe(() => {
      readQueryNotifyCount += 1
    })

    try {
      await runtime.runPromise(rt.dispatchLowPriority({ _tag: 'inc', payload: undefined } as any))

      await sleep(20)
      expect(moduleNotifyCount).toBe(0)
      expect(readQueryNotifyCount).toBe(0)
      expect(hostScheduler.getAnimationFrameCount()).toBe(0)

      await sleep(30)
      expect(moduleNotifyCount).toBe(0)
      expect(readQueryNotifyCount).toBe(0)
      expect(hostScheduler.getAnimationFrameCount()).toBe(1)

      await sleep(60)
      expect(moduleNotifyCount).toBe(1)
      expect(readQueryNotifyCount).toBe(1)
      expect(hostScheduler.getAnimationFrameCount()).toBe(0)

      const moduleEnvelope = getRuntimeExternalStoreLastPulseEnvelope(moduleStore)
      const readQueryEnvelope = getRuntimeExternalStoreLastPulseEnvelope(readQueryStore)
      expect(moduleEnvelope).toBeDefined()
      expect(readQueryEnvelope).toBeDefined()
      expect(moduleEnvelope?.moduleInstanceKey).toBe(`${rt.moduleId}::${rt.instanceId}`)
      expect(moduleEnvelope?.priorityMax).toBe('low')
      expect(moduleEnvelope?.topicDeltaCount).toBe(2)
      expect(moduleEnvelope?.topicDeltaHash).toMatch(/^[0-9a-f]{8}$/)
      expect(moduleEnvelope?.selectorDelta.anySelectorChanged).toBe(true)
      expect(moduleEnvelope?.selectorDelta.topK).toContain(readQuery.selectorId)
      expect(moduleEnvelope?.selectorDelta.bloomWords).toHaveLength(4)
      expect(runtimeSelectorDeltaMaybeChanged(moduleEnvelope!.selectorDelta, readQuery.selectorId)).toBe(true)
      expect(readQueryEnvelope?.selectorDelta.hash).toBe(moduleEnvelope?.selectorDelta.hash)
    } finally {
      unsubReadQuery()
      unsubModule()
      await runtime.dispose()
    }
  })
})
