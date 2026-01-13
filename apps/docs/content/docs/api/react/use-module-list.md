---
title: useModuleList
description: Build a stable list of module instances from dynamic data items.
---

`useModuleList` helps you map a dynamic list of items into a **stable list of module instances**, preserving identity across renders.

This is useful when you render repeated UI blocks that each own a local module instance, and you want instance identity to follow the item id instead of render order.

## Basic usage

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

- The internal cache is not actively pruned when items are removed. In most cases, module definitions/impls are lightweight; the heavy part is the Runtime, managed by `useModule/useLocalModule`.

## See also

- [API: useLocalModule](./use-local-module)
- [API: useModule](./use-module)
