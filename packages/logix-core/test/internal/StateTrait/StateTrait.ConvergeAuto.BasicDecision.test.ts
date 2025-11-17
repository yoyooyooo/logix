import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import type * as Debug from '../../../src/Debug.js'
import { makeConvergeAutoFixture, pickConvergeTraceEvents } from '../../StateTrait/StateTrait.ConvergeAuto.fixtures.js'

const getConvergeData = (ring: Debug.RingBufferSink): ReadonlyArray<any> =>
  pickConvergeTraceEvents(ring.getSnapshot()).map((e) => (e as any).data)

describe('StateTrait converge auto basic decision', () => {
  it.scoped('decides executedMode + reasons for typical distributions', () =>
    Effect.gen(function* () {
      const { M, ring, runtime } = makeConvergeAutoFixture({
        diagnosticsLevel: 'light',
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        // txn#1: cold start must use full
        yield* rt.dispatch({ _tag: 'bumpA' } as any)

        // txn#2: sparse write should choose dirty
        yield* rt.dispatch({ _tag: 'bumpA' } as any)

        // txn#3: near-full should fall back to full
        yield* rt.dispatch({ _tag: 'bumpAB' } as any)

        // txn#4: unknown write (only '*') should fall back to full
        const prev = yield* rt.getState
        yield* rt.setState({ ...prev, a: prev.a + 1 })
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const data = getConvergeData(ring)
      expect(data.length).toBe(4)

      expect(data[0]?.executedMode).toBe('full')
      expect(data[0]?.reasons).toContain('cold_start')

      expect(data[1]?.executedMode).toBe('dirty')
      expect(data[1]?.reasons).toEqual(expect.not.arrayContaining(['cold_start']))

      expect(data[2]?.executedMode).toBe('full')
      expect(data[2]?.reasons).toContain('near_full')

      expect(data[3]?.executedMode).toBe('full')
      expect(data[3]?.reasons).toContain('unknown_write')
    }),
  )
})
