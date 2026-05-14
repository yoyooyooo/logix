---
title: RuntimeProvider
description: Logix runtime 与可选 subtree layer 的 React provider。
---

`RuntimeProvider` 把 Logix runtime 投影到 React。

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

## Props

| Prop | 含义 |
| --- | --- |
| `runtime` | 由 `Runtime.make` 创建的 managed runtime。 |
| `layer` | 合并到当前 runtime context 的可选 subtree layer。 |
| `fallback` | provider 异步 setup 期间的 fallback。 |
| `policy` | preload、sync budget 和 local cache behavior 的 provider policy。 |
| `onError` | provider 与 diagnostic failure 的 host error sink。 |

## Development lifecycle boundary

`RuntimeProvider` 只做投影。开发期 HMR 属于一个 host dev lifecycle carrier，在 host 边界通过 `logixReactDevLifecycle()` 或 `installLogixDevLifecycleForVitest()` 一次性启用。

```ts
import { logixReactDevLifecycle } from "@logixjs/react/dev/vite"

export default defineConfig({
  plugins: [logixReactDevLifecycle()],
})
```

```ts
import { installLogixDevLifecycleForVitest } from "@logixjs/react/dev/vitest"

installLogixDevLifecycleForVitest()
```

dev lifecycle carrier 把 hot boundary 交给 runtime owner。owner 选择 `reset` 或 `dispose`。传入 `RuntimeProvider` 的 runtime 默认是 borrowed，除非内部 carrier binding 显式 owned，所以 provider 不调用 `runtime.dispose()`。evidence 统一导出为 `runtime.hot-lifecycle`。

## 边界

state transaction policy 在 program/runtime 边界配置。provider 投影 runtime，不创建另一套 transaction mode。
