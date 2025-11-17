import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Stream } from 'effect'
import * as Logix from '../../src/index.js'

describe('FlowRuntime.fromState(ReadQuery)', () => {
  it('passes ReadQuery.select into runtime.changes', () => {
    type S = { count: number; other: number }

    let received: unknown = undefined
    const runtime = {
      moduleId: 'FlowRuntime.fromState.ReadQuery.unit',
      instanceId: 'unit-instance',
      actions$: Stream.empty,
      changes: (selector: unknown) => {
        received = selector
        return Stream.empty
      },
    }

    const flow = Logix.Flow.make(runtime as any)
    const rq = Logix.ReadQuery.compile((s: S) => s.count)

    flow.fromState(rq as any)
    expect(received).toBe(rq.select)
  })

  it('passes selector into runtime.changes', () => {
    type S = { count: number; other: number }

    let received: unknown = undefined
    const runtime = {
      moduleId: 'FlowRuntime.fromState.selector.unit',
      instanceId: 'unit-instance',
      actions$: Stream.empty,
      changes: (selector: unknown) => {
        received = selector
        return Stream.empty
      },
    }

    const flow = Logix.Flow.make(runtime as any)
    const selector = (s: S) => s.count

    flow.fromState(selector as any)
    expect(received).toBe(selector)
  })
})
