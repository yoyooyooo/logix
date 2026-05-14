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

## 边界

state transaction policy 在 program/runtime 边界配置。provider 投影 runtime，不创建另一套 transaction mode。
