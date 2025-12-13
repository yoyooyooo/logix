// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logix/core'
import {
  RuntimeProvider,
  useModule,
  useSelector,
  useDispatch,
} from '@logix/react'
import { LogixDevtools } from '../src/ui/shell/LogixDevtools.js'
import { devtoolsLayer } from '../src/snapshot.js'
import {
  devtoolsRuntime,
  devtoolsModuleRuntime,
  type DevtoolsState,
} from '../src/state.js'

// jsdom 默认不提供稳定的 matchMedia，这里为测试环境补一个最小 polyfill，
// 避免 DevtoolsShell 内部的主题探测逻辑在浏览器外环境抛错。
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// 一个极简 Counter Module，用于驱动 Devtools Timeline 生成 EffectOp / Debug 事件。
const CounterModule = Logix.Module.make('DevtoolsTimelineCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const CounterImpl = CounterModule.implement({
  initial: { count: 0 },
  logics: [
    CounterModule.logic(($) =>
      Effect.gen(function* () {
        // 通过 DebugSink 记录一条可见的 trace 事件，方便在 Timeline 中定位。
        yield* $.onAction('increment').run(() =>
          Logix.Debug.record({
            type: 'trace:increment',
            moduleId: CounterModule.id,
            data: { source: 'EffectOpTimelineView.test' },
          }),
        )
      }),
    ),
  ],
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'DevtoolsTimelineRuntime',
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterImpl.module)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <button
      type="button"
      onClick={() => dispatch({ _tag: 'increment', payload: undefined })}
    >
      count: {count}
    </button>
  )
}

describe('@logix/devtools-react · EffectOpTimelineView & Inspector behavior', () => {
  it('shows latest event details by default, and toggles to selected event details on click', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // 触发多次 increment，以确保 Timeline 中有多条事件。
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // 等待 Devtools 面板渲染，并且 Inspector 展示「Latest Event」详情。
    await waitFor(() => {
      // Devtools 面板标题出现，说明面板已打开。
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
      expect(screen.getByText(/Latest Event/i)).not.toBeNull()
    })

    // Inspector 中应展示当前事务的概要信息。
    expect(screen.getByText(/Transaction Summary/i)).not.toBeNull()

    // 默认状态下不应存在 Selected Event 区块。
    expect(screen.queryByText(/Selected Event/i)).toBeNull()

    // 等待 DevtoolsModule 派生出时间线数据。
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const stateAfterEvents = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<
        DevtoolsState,
        never,
        any
      >,
    ) as DevtoolsState
    const lastEntry =
      stateAfterEvents.timeline[stateAfterEvents.timeline.length - 1]
    const lastRef = Logix.Debug.internal.toRuntimeDebugEventRef(
      lastEntry.event as Logix.Debug.Event,
    )
    const targetLabel = lastRef?.label ?? String(lastEntry.event.type)

    // 在 Timeline 中找到对应事件行，并点击以选中该事件。
    let eventRow: HTMLElement | undefined
    await waitFor(() => {
      const rows = screen.getAllByRole('button', {
        name: new RegExp(targetLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      })
      expect(rows.length).toBeGreaterThan(0)
      eventRow = rows[0] as HTMLElement
    })
    if (!eventRow) {
      throw new Error('Timeline event row not found')
    }
    fireEvent.click(eventRow)

    // Inspector 应切换到 Selected Event 视图。
    await waitFor(() => {
      expect(screen.getByText(/Selected Event/i)).not.toBeNull()
    })

    // 再次点击同一行，取消选中，恢复到 Latest Event 模式。
    fireEvent.click(eventRow)

    await waitFor(() => {
      expect(screen.getByText(/Latest Event/i)).not.toBeNull()
      expect(screen.queryByText(/Selected Event/i)).toBeNull()
    })
  })

  it('normalizes timeline events to RuntimeDebugEventRef and supports filtering by kind + txnId', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // 触发多次 increment，以生成多个事务（每次交互 = 一次 StateTransaction）。
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // 等待 DevtoolsModule 派生出时间线数据。
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const state = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState

    // 将时间线上的 Debug.Event 归一化为 RuntimeDebugEventRef，
    // 便于按 kind + txnId 对事务进行筛选。
    const refs = state.timeline
      .map((entry) => Logix.Debug.internal.toRuntimeDebugEventRef(entry.event as Logix.Debug.Event))
      .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null)

    // 至少应存在一条带 txnId 的 state 事件。
    const stateEventsWithTxn = refs.filter((ref) => ref.kind === 'state' && ref.txnId != null)
    expect(stateEventsWithTxn.length).toBeGreaterThan(0)

    const targetTxnId = stateEventsWithTxn[0].txnId!

    // 基于同一个 txnId 过滤出该事务下的所有事件，
    // 期望至少包含 action + state 两类事件，证明可以按 kind + txnId 聚合事务视图。
    const eventsForTxn = refs.filter((ref) => ref.txnId === targetTxnId)
    expect(eventsForTxn.length).toBeGreaterThanOrEqual(2)

    const kindsForTxn = new Set(eventsForTxn.map((ref) => ref.kind))
    expect(kindsForTxn.has('state')).toBe(true)
    expect(kindsForTxn.has('action')).toBe(true)
  })

  it('visualizes react-render events and supports View kind filter', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // 触发多次 increment，以产生若干事务与渲染事件。
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // 等待 DevtoolsModule 派生出时间线数据。
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const state = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState

    const refs = state.timeline
      .map((entry) => Logix.Debug.internal.toRuntimeDebugEventRef(entry.event as Logix.Debug.Event))
      .filter(
        (ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null,
      )

    const renderEvents = refs.filter((ref) => ref.kind === 'react-render')
    expect(renderEvents.length).toBeGreaterThan(0)
    const targetRenderLabel = renderEvents[0].label

    // 切换到 View kind 过滤，仅保留 react-render 事件。
    const viewFilterButton = screen.getAllByRole('button', {
      name: /^View$/i,
    })[0]
    fireEvent.click(viewFilterButton)

    await waitFor(() => {
      // 至少存在一条 react-render 事件行（label 已归一化，不再依赖 trace:* type 字符串）。
      const viewRows = screen.getAllByRole('button', {
        name: new RegExp(
          targetRenderLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i',
        ),
      })
      expect(viewRows.length).toBeGreaterThan(0)
    })
  })
})
