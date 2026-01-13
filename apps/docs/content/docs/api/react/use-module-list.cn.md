---
title: useModuleList
description: 把动态数据列表映射为稳定的模块实例列表，确保实例 identity 不随渲染顺序漂移。
---

`useModuleList` 用于把动态 items 列表映射为**稳定的模块实例列表**，从而在 React 多次渲染中保持实例 identity 不变。

当你渲染一组重复 UI，每个块都“拥有一个本地模块实例”，并且希望实例 identity 绑定到 item id（而不是渲染顺序）时，它很有用。

## 基本用法

```tsx
import { useModuleList } from '@logixjs/react'
import { RowModule } from './modules/row'

function RowList({ rows }: { rows: Array<{ id: string; name: string }> }) {
  const modules = useModuleList(
    rows,
    (row) => row.id,
    (id, row) => RowModule.implement({ initial: { id, name: row.name } }),
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

## Notes

- 内部 cache 不会在 items 移除时主动清理。多数情况下 module def/impl 足够轻量；真正“重”的部分是 Runtime，由 `useModule/useLocalModule` 管理。

## 延伸阅读

- [API: useLocalModule](./use-local-module)
- [API: useModule](./use-module)
