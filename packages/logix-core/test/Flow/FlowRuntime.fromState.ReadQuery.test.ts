import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Stream } from 'effect'
import * as Logix from '../../src/index.js'

describe('FlowRuntime.fromState(ReadQuery)', () => {
  it.effect('uses changesReadQueryWithMeta for explicit ReadQuery and only exposes values', () =>
    Effect.gen(function* () {
      type S = { count: number; other: number }

      let receivedReadQuery: unknown = undefined
      let fallbackSelector: unknown = undefined
      const runtime = {
        moduleId: 'FlowRuntime.fromState.ReadQuery.unit',
        instanceId: 'unit-instance',
        actions$: Stream.empty,
        changes: (selector: unknown) => {
          fallbackSelector = selector
          return Stream.empty
        },
        changesReadQueryWithMeta: (readQuery: unknown) => {
          receivedReadQuery = readQuery
          return Stream.succeed({
            value: 7,
            meta: {
              txnSeq: 1,
              txnId: 'txn#1',
              commitMode: 'normal',
              priority: 'normal',
            },
          })
        },
      }

      const flow = Logix.Flow.make(runtime as any)
      const query = Logix.ReadQuery.compile((s: S) => s.count)

      const values = yield* Stream.runCollect(flow.fromState(query as any)).pipe(
        Effect.map((items) => Array.from(items as Iterable<any>)),
      )

      expect(receivedReadQuery).toBe(query)
      expect(fallbackSelector).toBeUndefined()
      expect(values).toEqual([7])
    }),
  )

  it('falls back to runtime.changes(query.select) when changesReadQueryWithMeta is unavailable', () => {
    type S = { count: number; other: number }

    let receivedSelector: unknown = undefined
    const runtime = {
      moduleId: 'FlowRuntime.fromState.ReadQuery.unit',
      instanceId: 'unit-instance',
      actions$: Stream.empty,
      changes: (selector: unknown) => {
        receivedSelector = selector
        return Stream.empty
      },
    }

    const flow = Logix.Flow.make(runtime as any)
    const query = Logix.ReadQuery.compile((s: S) => s.count)

    flow.fromState(query as any)
    expect(receivedSelector).toBe(query.select)
  })

  it.effect('auto-compiles selector and routes static lane through changesReadQueryWithMeta', () =>
    Effect.gen(function* () {
      type S = { count: number; other: number }

      let fallbackSelector: unknown = undefined
      let receivedReadQuery: unknown = undefined
      const runtime = {
        moduleId: 'FlowRuntime.fromState.selector.static',
        instanceId: 'unit-instance',
        actions$: Stream.empty,
        changes: (selector: unknown) => {
          fallbackSelector = selector
          return Stream.empty
        },
        changesReadQueryWithMeta: (readQuery: unknown) => {
          receivedReadQuery = readQuery
          return Stream.succeed({
            value: 11,
            meta: {
              txnSeq: 1,
              txnId: 'txn#1',
              commitMode: 'normal',
              priority: 'normal',
            },
          })
        },
      }

      const flow = Logix.Flow.make(runtime as any)
      const selector = (s: S) => s.count
      const values = yield* Stream.runCollect(flow.fromState(selector as any)).pipe(
        Effect.map((items) => Array.from(items as Iterable<any>)),
      )

      expect(fallbackSelector).toBeUndefined()
      expect(receivedReadQuery).toBeDefined()
      expect((receivedReadQuery as any).lane).toBe('static')
      expect((receivedReadQuery as any).select).toBe(selector)
      expect(values).toEqual([11])
    }),
  )

  it('falls back to runtime.changes(selector) when auto-compile lands on dynamic lane', () => {
    type S = { count: number; other: number }

    let fallbackSelector: unknown = undefined
    let staticLaneCalls = 0
    const runtime = {
      moduleId: 'FlowRuntime.fromState.selector.dynamic',
      instanceId: 'unit-instance',
      actions$: Stream.empty,
      changes: (selector: unknown) => {
        fallbackSelector = selector
        return Stream.empty
      },
      changesReadQueryWithMeta: () => {
        staticLaneCalls += 1
        return Stream.empty
      },
    }

    const flow = Logix.Flow.make(runtime as any)
    const selector = (s: S) => (s.count > 0 ? s.count : 0)

    flow.fromState(selector as any)
    expect(Logix.ReadQuery.compile(selector).lane).toBe('dynamic')
    expect(staticLaneCalls).toBe(0)
    expect(fallbackSelector).toBe(selector)
  })
})
