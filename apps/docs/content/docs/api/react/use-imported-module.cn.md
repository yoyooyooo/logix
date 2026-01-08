---
title: useImportedModule
description: 从父模块实例的 imports scope 解析子模块实例
---

# useImportedModule

当一个模块通过 `imports` 组合了子模块时，组件侧经常需要在 **父实例 scope 内** 读取/派发子模块（例如：Query、子表单、子 Feature）。

`useImportedModule(parent, childModule)` 用来解决这件事：它会从 `parent` 对应实例的 imports scope 中解析出 `childModule` 的运行时句柄，并返回一个可直接交给 `useSelector` / `useDispatch` 的 `ModuleRef`。

它等价于 `parent.imports.get(childModule)`；`useImportedModule` 只是把这件事用 Hook 形态显式表达出来。

## Usage

```tsx
import { useImportedModule, useModule, useSelector } from '@logixjs/react'
import { HostImpl, ChildModule } from './modules'

function Page() {
  // 多实例场景（Session/Tab/分片）用 key 区分不同父实例
  const host = useModule(HostImpl, { key: 'SessionA' })

  // 在 host 实例 scope 下解析子模块（不会串到别的 host 实例）
  const child = useImportedModule(host, ChildModule.tag)

  const value = useSelector(child, (s) => s.value)
  return <div>{value}</div>
}
```

推荐直接使用 `imports.get`（不需要额外 Hook）：

```ts
const child = host.imports.get(ChildModule.tag)
```

## Notes

- `parent` 必须是“有实例 scope 语义”的句柄（例如 `useModule(HostImpl, { key })` / `useModule(HostImpl)` / `useLocalModule(...)` 的返回值）；不要用 `useModule(HostModule)`（全局单例语义）作为 parent 再去解析 imports。
- `host.imports.get(ChildModule.tag)` 返回稳定的 `ModuleRef`，可直接写在组件 render 内（无需 `useMemo`）。

## Best Practices

- **优先 UI 只依赖 Host**：如果只是为了“触发/编排”子模块行为，优先在 Host 的 Logic 内用 `$.use(ChildModule)`（或 Link/Process）完成编排，再把需要的状态/动作在 Host 层对外暴露。
- **UI 直连子模块的场景**：只有当 UI 需要直接渲染子模块 state、或把子模块作为子组件输入（Props）时，才在组件侧 `useImportedModule` / `host.imports.get(...)`。
- **多层 imports**：可以链式 `host.imports.get(A).imports.get(B)`，但更推荐在边界处 resolve 一次，把得到的 `ModuleRef` 往下传，避免深层组件到处“爬树”。

## See Also

- [API: ModuleScope](./module-scope)
- [进阶专题：可组合性地图](../../guide/advanced/composability)
