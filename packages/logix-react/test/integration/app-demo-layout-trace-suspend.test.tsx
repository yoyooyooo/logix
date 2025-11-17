// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

describe('AppDemoLayout-style runtime + Debug.traceLayer + Suspense', () => {
  //
  // 这份测试基本复刻 examples/logix-react/src/demos/AppDemoLayout.tsx 的结构，
  // 用来验证：
  // - Runtime.make + Debug.layer({ mode: 'dev' }) + Debug.traceLayer 组合不会触发 AsyncFiberException；
  // - 在 React.StrictMode + Suspense 场景下，useModule(Impl, { suspend: true, key }) 能正常完成初始化并响应点击。
  //

  const AppCounterModule = Logix.Module.make('AppCounterDemoTest', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {
      increment: Schema.Void,
      decrement: Schema.Void,
    },
    reducers: {
      increment: Logix.Module.Reducer.mutate((draft, _action) => {
        draft.count += 1
      }),
      decrement(s) {
        return { ...s, count: s.count - 1 }
      },
    },
  })

  const AppCounterLogic = AppCounterModule.logic(($) => {
    // setup-only：注册全局兜底错误处理
    $.lifecycle.onError((cause) => Effect.logError('AppCounterLogic (test) error', cause))

    return Effect.gen(function* () {
      yield* Effect.log('AppCounterLogic (test) setup')

      // 每次 increment 打一条业务日志 + 一条 trace:* Debug 事件
      yield* $.onAction('increment').run(() =>
        Effect.gen(function* () {
          yield* Effect.log('increment dispatched from AppCounterLogic (test)')
          yield* Logix.Debug.record({
            type: 'trace:increment',
            moduleId: AppCounterModule.id,
            data: { source: 'app-demo-layout-trace-suspend.test' },
          })
        }),
      )
    })
  })

  const AppCounterImpl = AppCounterModule.implement({
    initial: { count: 0 },
    logics: [AppCounterLogic],
  })

  // 应用级 Runtime：与 AppDemoLayout 一致，挂 Debug.layer + Debug.traceLayer
  const appRuntime = Logix.Runtime.make(AppCounterImpl, {
    layer: Logix.Debug.traceLayer(Logix.Debug.layer({ mode: 'dev' })) as Layer.Layer<any, never, never>,
  })

  const AppCounterView: React.FC = () => {
    const counter = useModule(AppCounterImpl, {
      suspend: true,
      key: 'app-runtime-demo-test',
      initTimeoutMs: 5_000,
    })
    const count = useModule(counter, (s) => (s as { count: number }).count)

    return (
      <div>
        <span data-testid="count">{count}</span>
        <button type="button" onClick={() => counter.actions.increment()}>
          inc
        </button>
        <button type="button" onClick={() => counter.actions.decrement()}>
          dec
        </button>
      </div>
    )
  }

  it('should initialize and update without throwing AsyncFiberException', async () => {
    const { getByTestId, getByText } = render(
      <React.StrictMode>
        <RuntimeProvider runtime={appRuntime}>
          <React.Suspense fallback={<div>loading...</div>}>
            <AppCounterView />
          </React.Suspense>
        </RuntimeProvider>
      </React.StrictMode>,
    )

    // 初始渲染：Suspense 完成后 count 应为 0
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0')
    })

    // 点击 inc，期望 count 递增到 1
    fireEvent.click(getByText('inc'))
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1')
    })

    // 再点击 dec 回到 0，证明 ModuleRuntime 正常工作
    fireEvent.click(getByText('dec'))
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0')
    })
  })
})
