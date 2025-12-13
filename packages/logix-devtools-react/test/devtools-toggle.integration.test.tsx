// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { LogixDevtools } from '../src/ui/shell/LogixDevtools.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../src/state.js'

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

describe('@logix/devtools-react · toggle behavior', () => {
  it('opens the panel when clicking the floating Logix Devtools button', () => {
    render(<LogixDevtools position="bottom-left" />)

    // 初始渲染应只看到浮动按钮
    const toggleButton = screen.getByText(/Logix Devtools/i)
    expect(toggleButton).not.toBeNull()

    const before = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any,
    ) as DevtoolsState
    expect(before.open).toBe(false)

    fireEvent.click(toggleButton)

    // 状态更新与订阅是异步的，这里通过轮询等待 open 变为 true
    // 并确认 DOM 中出现 Devtools 顶部标题。
    return waitFor(() => {
      const after = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any,
      ) as DevtoolsState
      expect(after.open).toBe(true)

      const header = screen.getByText(/Developer Tools/i)
      expect(header).not.toBeNull()
    })
  })
})
