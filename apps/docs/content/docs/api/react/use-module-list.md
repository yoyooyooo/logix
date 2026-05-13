---
title: useModuleList
description: Map dynamic items to a stable list of module definitions or programs.
---

`useModuleList` maps dynamic items to a stable list of module definitions or programs.

It is useful when repeated UI blocks should preserve instance identity by item key instead of render order.

## Usage

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

## Notes

- identity follows the item key, not render order
- runtime ownership still belongs to `useModule(...)` or `useLocalModule(...)`
- this is an advanced helper, not part of the canonical host law

## See also

- [useModule](./use-module)
- [useLocalModule](./use-local-module)
