---
title: RuntimeProvider
description: 把 Logix runtime 投影到 React 子树。
---

`RuntimeProvider` 让 React hooks 可以看到已有的 Logix runtime。

```tsx
import { RuntimeProvider } from "@logixjs/react"
import * as Logix from "@logixjs/core"
import { RootProgram } from "./root-program"

const runtime = Logix.Runtime.make(RootProgram)

export function Root() {
  return (
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>
  )
}
```

## Props

| Prop | 角色 |
| --- | --- |
| `runtime` | 必填。由 `Runtime.make(...)` 或其他 owner boundary 创建的 runtime。 |
| `layer` | 可选。子树局部 Effect Layer。 |
| `fallback` | 可选。用于 gated startup path 的 React fallback。 |
| `policy` | 可选。provider startup/read policy，例如 sync/suspend/defer 行为。 |

## 它持有什么

`RuntimeProvider` 只持有 runtime scope 的 React 可见性。它不选择 Program，不创建第二个 runtime，也不定义第二套 verification control plane。

`@logixjs/react` 的公开 hooks 都必须在 provider 之下运行：

- `useModule(...)`
- `useSelector(...)`
- `useDispatch(...)`
- `useImportedModule(...)`

## See also

- [Runtime](/cn/docs/api/core/runtime)
- [useModule](./use-module)
- [useSelector](./use-selector)
