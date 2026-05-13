---
title: useModuleList
description: 把动态 items 映射为稳定的模块定义或 program 列表。
---

`useModuleList` 用于把动态 items 映射为稳定的模块定义或 program 列表。

当重复渲染的一组 UI 需要按 item key 保持实例 identity，而不跟随 render 顺序漂移时，可以使用它。

## 用法

```tsx
import { useModuleList } from "@logixjs/react"
import * as Logix from "@logixjs/core"
import { RowDef } from "./modules/row"

function RowList({ rows }: { rows: Array<{ id: string; name: string }> }) {
  const modules = useModuleList(
    rows,
    (row) => row.id,
    (id, row) => Logix.Program.make(RowDef, { initial: { id, name: row.name } }),
  )

  return (
    <div>
      {rows.map((row, i) => (
        <Row key={row.id} module={modules[i]!} />
      ))}
    </div>
  )
}
```

## 说明

- identity 跟随 item key，而不是 render 顺序
- runtime ownership 仍然留在 `useModule(...)` 或 `useLocalModule(...)`
- 这是高级 helper，不属于 canonical host law

## 相关页面

- [useModule](./use-module)
- [useLocalModule](./use-local-module)
