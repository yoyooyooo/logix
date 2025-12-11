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
import { LogixDevtools } from '../src/LogixDevtools.js'
import { devtoolsLayer } from '../src/snapshot.js'

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

    const counterButton = screen.getByText(/count:/i)

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

    // 默认状态下不应存在 Selected Event 区块。
    expect(screen.queryByText(/Selected Event/i)).toBeNull()

    // 在 Timeline 中找到 trace:increment 事件行，并点击以选中该事件。
    const traceRow = await waitFor(() => screen.getByText('trace:increment'))
    fireEvent.click(traceRow)

    // Inspector 应切换到 Selected Event 视图。
    await waitFor(() => {
      expect(screen.getByText(/Selected Event/i)).not.toBeNull()
    })

    // 再次点击同一行，取消选中，恢复到 Latest Event 模式。
    fireEvent.click(traceRow)

    await waitFor(() => {
      expect(screen.getByText(/Latest Event/i)).not.toBeNull()
      expect(screen.queryByText(/Selected Event/i)).toBeNull()
    })
  })
}
