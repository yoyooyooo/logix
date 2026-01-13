---
title: useProcesses
description: 为某个 React UI 子树安装一组 Processes/Links，并以 subtree 边界管理其生命周期。
---

`useProcesses` 会把一组长期运行程序（Processes / Links）安装到当前 Runtime，并以 **React UI 子树边界** 管理其生命周期。

当你希望“某个 feature 的后台编排”随 UI 子树挂载/卸载，同时仍运行在 Logix Runtime 内时，它很有用。

## 基本用法

```tsx
import { useMemo } from 'react'
import { useProcesses } from '@logixjs/react'
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'

export function SettingsRoute() {
  const processes = useMemo(() => [Logix.Process.make('settings:boot', Effect.void)], [])
  useProcesses(processes, { subtreeId: 'route:settings' })

  return null
}
```

> 提示：请用 `useMemo` 等方式 memoize `processes` 数组，避免不必要的 install/uninstall 抖动。

## Options

- `subtreeId?`：用于诊断/过滤的稳定标识（推荐：route/feature key）。
- `gcTime?`：卸载后的保活时间，用于吸收 StrictMode/Suspense 抖动。
- `mode?`：stop → start 的重启语义（默认 `switch`；可选 `exhaust`）。
- `deps?`：额外依赖变化时触发重新安装。

## 延伸阅读

- [API: Process](../core/process)
- [API: Link](../core/link)
