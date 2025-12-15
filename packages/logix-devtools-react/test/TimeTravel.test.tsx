// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logix/core'
import {
  RuntimeProvider,
  useModule,
  useDispatch,
  useSelector,
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
  ;(window as any).matchMedia = function matchMedia(query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
  }
}

const CounterModule = Logix.Module.make('TimeTravelCounter', {
  state: Schema.Struct({ value: Schema.Number, isEven: Schema.Boolean }),
  actions: {
    set: Schema.Number,
  },
  reducers: {
    set: (state, action) => ({
      ...state,
      value: (action as any).payload as number,
    }),
  },
  traits: Logix.StateTrait.from(Schema.Struct({ value: Schema.Number, isEven: Schema.Boolean }))({
    // 故意制造 deps mismatch：实际读取 value，但 declared deps 为空。
    isEven: Logix.StateTrait.computed({
      deps: [],
      get: (state) => state.value % 2 === 0,
    }),
  }),
})

const CounterImpl = CounterModule.implement({
  initial: { value: 0, isEven: true },
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'TimeTravelRuntime',
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterImpl.module)
  const value = useSelector(runtimeHandle, (s) => s.value)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <div>
      <button
        type="button"
        onClick={() => dispatch({ _tag: 'set', payload: 1 })}
      >
        set-1
      </button>
      <button
        type="button"
        onClick={() => dispatch({ _tag: 'set', payload: 2 })}
      >
        set-2
      </button>
      <span data-testid="value">value: {value}</span>
    </div>
  )
}

describe('@logix/devtools-react · TimeTravel UI', () => {
  it('applies time-travel before/after and marks DevtoolsState.timeTravel, then returns to latest state', async () => {
    render(
      <RuntimeProvider runtime={runtime}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const set1 = screen.getByText('set-1')
    const set2 = screen.getByText('set-2')

    // 先产生两次事务：value = 1 -> value = 2
    fireEvent.click(set1)
    fireEvent.click(set2)

    // 等待 DevtoolsState 中出现事件与运行时最新状态 value = 2
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

    // 打开 Inspector：点击 Sidebar 中的模块与实例，使 Transaction Summary 可用。
    // Sidebar 结构：先选 Runtime，再选 Module，再选 Instance。
    const runtimeLabels = await screen.findAllByText('TimeTravelRuntime')
    fireEvent.click(runtimeLabels[0]!)

    const moduleLabels = await screen.findAllByText('TimeTravelCounter')
    fireEvent.click(moduleLabels[0]!)

    // 等待 Transaction Summary 渲染出来（基于最新一条事务事件）。
    await screen.findByText(/Transaction Summary/i)

    // deps mismatch 警告应出现在 Inspector 中，并可点击定位到字段。
    await screen.findByText(/Deps Mismatch/i)
    const mismatchField = screen.getByLabelText('DepsMismatchFieldPath:isEven')
    expect(mismatchField).not.toBeNull()

    // 点击「回到事务前状态」
    const beforeButton = screen.getByText('回到事务前状态')
    fireEvent.click(beforeButton)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(state.timeTravel).toBeDefined()
      expect(state.timeTravel?.mode).toBe('before')
    })

    // 点击「返回最新状态」
    const latestButton = screen.getByText('返回最新状态')
    fireEvent.click(latestButton)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(state.timeTravel).toBeUndefined()
    })

    // 运行时状态应回到最新业务状态（value = 2）
    await waitFor(() => {
      const valueText = screen.getByTestId('value')
      expect(valueText.textContent).toContain('value: 2')
    })

    // 点击 deps mismatch 的字段路径，应写入 selectedFieldPath（用于按字段过滤时间线）。
    fireEvent.click(mismatchField)
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<
          DevtoolsState,
          never,
          any
        >,
      ) as DevtoolsState
      expect(state.selectedFieldPath).toBe('isEven')
    })
  })
})
