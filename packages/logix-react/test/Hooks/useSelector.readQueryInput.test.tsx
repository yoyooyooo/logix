import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, fieldValue, fieldValues, rawFormMeta, useModule, useSelector } from '../../src/index.js'

const Counter = Logix.Module.make('useSelectorReadQueryCounter', {
  state: Schema.Struct({
    count: Schema.Number,
    other: Schema.Number,
    $form: Schema.Struct({
      submitCount: Schema.Number,
      isSubmitting: Schema.Boolean,
      isDirty: Schema.Boolean,
      errorCount: Schema.Number,
    }),
  }),
  actions: { inc: Schema.Void, bumpOther: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
    bumpOther: Logix.Module.Reducer.mutate((draft) => {
      draft.other += 1
    }),
  },
})

describe('useSelector(readQuery input)', () => {
  it('accepts explicit read queries from the form helper layer and keeps static updates narrow', async () => {
    const CounterProgram = Logix.Program.make(Counter, {
      initial: {
        count: 0,
        other: 0,
        $form: {
          submitCount: 0,
          isSubmitting: false,
          isDirty: false,
          errorCount: 0,
        },
      },
    })

    const runtime = Logix.Runtime.make(CounterProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let renderCount = 0

    const { result } = renderHook(
      () => {
        renderCount += 1
        const counter = useModule(Counter.tag)
        const count = useSelector(counter, fieldValue('count'))
        const meta = useSelector(counter, rawFormMeta())
        return {
          counter,
          count,
          meta,
        }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(result.current.meta.errorCount).toBe(0)
      expect(result.current.meta.submitCount).toBe(0)
    })

    const baselineRenderCount = renderCount

    await act(async () => {
      result.current.counter.actions.bumpOther()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    expect(renderCount).toBe(baselineRenderCount)

    await act(async () => {
      result.current.counter.actions.inc()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })

    expect(renderCount).toBeGreaterThan(baselineRenderCount)
  })

  it('accepts exact multi-field selector inputs and only updates affected subscribers', async () => {
    const CounterProgram = Logix.Program.make(Counter, {
      initial: {
        count: 0,
        other: 0,
        $form: {
          submitCount: 0,
          isSubmitting: false,
          isDirty: false,
          errorCount: 0,
        },
      },
    })

    const runtime = Logix.Runtime.make(CounterProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let tupleRenderCount = 0
    let countRenderCount = 0

    const tupleHook = renderHook(
      () => {
        tupleRenderCount += 1
        const counter = useModule(Counter.tag)
        const tuple = useSelector(counter, fieldValues(['count', 'other'] as const))
        return { counter, tuple }
      },
      { wrapper },
    )

    const countHook = renderHook(
      () => {
        countRenderCount += 1
        const counter = useModule(Counter.tag)
        const count = useSelector(counter, fieldValue('count'))
        return { count }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(tupleHook.result.current.tuple).toEqual([0, 0])
      expect(countHook.result.current.count).toBe(0)
    })

    const tupleBaseline = tupleRenderCount
    const countBaseline = countRenderCount

    await act(async () => {
      tupleHook.result.current.counter.actions.bumpOther()
    })

    await waitFor(() => {
      expect(tupleHook.result.current.tuple).toEqual([0, 1])
    })

    expect(tupleRenderCount).toBeGreaterThan(tupleBaseline)
    expect(countRenderCount).toBe(countBaseline)

    await act(async () => {
      tupleHook.result.current.counter.actions.inc()
    })

    await waitFor(() => {
      expect(tupleHook.result.current.tuple).toEqual([1, 1])
      expect(countHook.result.current.count).toBe(1)
    })
  })
})
