// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule } from '../../src/index.js'

const Counter = Logix.Module.make('ReactRenderCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const Impl = Counter.implement({
  initial: { count: 0 },
})

describe('@logix/react · react-render Debug events', () => {
  it('emits component-level react-render events and selector-level react-selector metadata', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(Impl, {
      layer: debugLayer,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    // 为测试挂上带有 debugKey/fieldPaths 元信息的 selector，
    // 便于在 Debug 事件 meta 中验证这些字段是否被透传。
    const selectCount = Object.assign((state: { count: number }) => state.count, {
      debugKey: 'countSelector',
      fieldPaths: ['count'],
    })

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter.tag)
        const value = useModule(counter, selectCount)
        return { value, inc: counter.actions.inc }
      },
      { wrapper },
    )

    // 通过一次 inc 派发触发状态更新与重新渲染，
    // 再等待一小段时间让 Debug 事件通过 runtime.runFork 落入 sink。
    await act(async () => {
      await runtime.runPromise(
        Effect.gen(function* () {
          result.current.inc()
          yield* Effect.sleep(10)
        }),
      )
    })

    // 将收集到的 Debug.Event 归一化为 RuntimeDebugEventRef，
    // 验证存在 kind = "react-render" 的组件级事件。
    const renderRefs = events
      .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
      .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null && ref.kind === 'react-render')

    expect(renderRefs.length).toBeGreaterThan(0)
    const renderEvent = renderRefs[renderRefs.length - 1]
    const renderMeta = renderEvent.meta as any
    expect(renderMeta).toBeDefined()
    expect(renderMeta.componentLabel).toBe('useModule')

    const stateRefs = events
      .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
      .filter(
        (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
          ref != null && ref.kind === 'state' && ref.label === 'state:update',
      )

    expect(stateRefs.length).toBeGreaterThan(0)
    const lastState = stateRefs[stateRefs.length - 1]

    // react-render / react-selector 事件应能与同 instance 的最新 state:update 事务对齐。
    expect(renderEvent.txnId).toBe(lastState.txnId)
    expect(renderEvent.txnSeq).toBe(lastState.txnSeq)

    // 同时验证 selector 级诊断事件：应携带 debugKey/fieldPaths 元信息。
    const selectorRefs = events
      .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
      .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null && ref.kind === 'react-selector')

    expect(selectorRefs.length).toBeGreaterThan(0)
    const selectorEvent = selectorRefs[selectorRefs.length - 1]
    const selectorMeta = selectorEvent.meta as any
    expect(selectorMeta).toBeDefined()
    expect(selectorMeta.componentLabel).toBe('useSelector')
    expect(selectorMeta.selectorKey === 'countSelector' || selectorMeta.selectorKey === 'selectCount').toBe(true)
    expect(selectorMeta.fieldPaths).toEqual(['count'])
    expect(typeof selectorMeta.selectorId).toBe('string')
    expect(selectorMeta.lane).toBe('static')
    expect(selectorMeta.producer).toBe('jit')
    expect(selectorMeta.fallbackReason).toBeUndefined()
    expect(selectorMeta.readsDigest).toBeDefined()
    expect(selectorMeta.readsDigest.count).toBe(1)
    expect(typeof selectorMeta.readsDigest.hash).toBe('number')

    expect(selectorEvent.txnId).toBe(lastState.txnId)
    expect(selectorEvent.txnSeq).toBe(lastState.txnSeq)
  })

  it('still emits react-render events in production when devtools is explicitly enabled', async () => {
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      Logix.Debug.clearDevtoolsEvents()

      const runtimeLabel = 'ProdReactRenderRuntime'
      const runtime = Logix.Runtime.make(Impl, {
        label: runtimeLabel,
        devtools: true,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          {children}
        </RuntimeProvider>
      )

      const { result } = renderHook(
        () => {
          const counter = useModule(Counter.tag)
          const value = useModule(counter, (s) => (s as any).count)
          return { value, inc: counter.actions.inc }
        },
        { wrapper },
      )

      await act(async () => {
        await runtime.runPromise(
          Effect.gen(function* () {
            result.current.inc()
            yield* Effect.sleep(10)
          }),
        )
      })

      const refs = Logix.Debug.getDevtoolsSnapshot().events.filter(
        (ref) => ref.kind === 'react-render' && ref.runtimeLabel === runtimeLabel,
      )

      expect(refs.length).toBeGreaterThan(0)
    } finally {
      process.env.NODE_ENV = prevEnv
    }
  })
})
