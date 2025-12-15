// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, afterEach } from 'vitest'
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react'
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

// jsdom 下补充 matchMedia polyfill，避免 DevtoolsShell 中的主题探测逻辑报错。
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

const CounterModule = Logix.Module.make('OverviewStripCounter', {
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
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'OverviewRuntime',
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

afterEach(() => {
  cleanup()
  Logix.Debug.clearDevtoolsEvents()
})

describe('@logix/devtools-react · OverviewStrip', () => {
  it('aggregates events into buckets and drives timeline range when clicking a bucket', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // 触发多次 increment，产生若干事务与渲染事件。
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // 等待 DevtoolsState 中出现事件，并且 Overview 区块渲染出来。
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
      // Overview 标题存在（使用更精确的 Text 匹配，避免误中 runtime 名称）。
      const titles = screen.getAllByText(/^Overview$/i)
      expect(titles.length).toBeGreaterThan(0)
    })

    const before = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<
        DevtoolsState,
        never,
        any
      >,
    ) as DevtoolsState
    expect(before.timelineRange).toBeUndefined()

    // 点击 overview 中的某个 bucket，期望设置 timelineRange。
    const bucketButtons = screen.getAllByLabelText('OverviewBucket')
    // 取一个“非空 bucket”作为测试对象（空 bucket 会被 disabled）。
    const targetBucket =
      bucketButtons.find((b) => !(b as HTMLButtonElement).disabled) ??
      bucketButtons[0]
    fireEvent.click(targetBucket)

    await waitFor(() => {
      const after = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(after.timelineRange).toBeDefined()
    })
  })

  it('shows last operation summary and can be dismissed', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    fireEvent.click(counterButton)

    await screen.findAllByText(/Last Operation/i)
    const close = screen.getAllByLabelText('CloseOperationSummary')[0]
    fireEvent.click(close)

    await waitFor(() => {
      expect(screen.queryAllByText(/Last Operation/i)).toHaveLength(0)
    })
  })

  it('does not crash when clearing events (hook order stays stable)', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

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

    const clearButtons = screen.getAllByText('Clear')
    fireEvent.click(clearButtons[0] as HTMLButtonElement)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(state.timeline.length).toBe(0)
      expect(screen.getAllByText('Overview: no events yet').length).toBeGreaterThan(0)
    })
  })
})
