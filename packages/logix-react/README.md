# @logixjs/react

> Logix Runtime 的 React 适配层（Alpha 阶段：仓库内 API 已稳定，正式发版前仍可能微调）。

## 功能亮点

- **React host adapter**：
  - `runtime={Logix.Runtime.make(root)}` 启动完整应用 Runtime；
  - `runtime` / `value` 直接复用已有 `ManagedRuntime`，常用于测试或集成场景。
- **并发安全的 Hooks**：day-one canonical 路径固定为 `useModule(ModuleTag)` 读取共享实例、`useModule(Program, options?)` 创建局部实例、`useImportedModule(parent, ModuleTag)` 做 parent-scope child resolution；状态读取统一通过 `useSelector(handle, selector, equalityFn?)`，稳定派发统一通过 `useDispatch(handle | runtime)`，底层基于 `useSyncExternalStore`，默认 `Object.is` 比较，可自定义 `equalityFn`，避免并发渲染撕裂。
- **Core-owned selector route**：React 只消费 core selector route。组件读取默认使用 `fieldValue(path)`、`fieldValues(paths)` 或领域 selector primitive；无参 `useSelector(handle)` 不属于 public host read。
- **稳定派发器**：`useDispatch(handle | runtime)` 复用当前 Runtime Scope，保证回调引用稳定。
- **Parent-scope child resolution**：`host.imports.get(ModuleTag)` 是 canonical child resolution；`useImportedModule(parent, ModuleTag)` 只是对应的 hook 薄糖。
- **surface discipline**：public contract 只保留 canonical host law；未来若真有新的局部 recipe 候选，统一先按 `docs/ssot/runtime/12-toolkit-candidate-intake.md` 或单独 core reopen 重新立案。

## 快速上手

```tsx
import { RuntimeProvider } from "@logixjs/react"
import * as Logix from "@logixjs/core"

const RootDef = Logix.Module.make("Root", { state: RootState, actions: RootActions })
const RootProgram = Logix.Program.make(RootDef, {
  initial: { /* ... */ },
  capabilities: {
    imports: [/* imported child programs */],
    services: [/* service layers */],
  },
  logics: [/* canonical logic units */]
})

const appRuntime = Logix.Runtime.make(RootProgram, {
  layer: AppInfraLayer
})

export function App() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

这里的 `RuntimeProvider` 只负责 React host adapter 挂载，不属于 `@logixjs/core` 公开主链。

在组件中使用 Hooks：

```tsx
import { fieldValue, fieldValues, useModule, useSelector, useDispatch, useImportedModule } from "@logixjs/react"

function Counter() {
  const runtime = useModule(Counter.tag)
  const count = useSelector(runtime, fieldValue("count"))
  const [label, disabled] = useSelector(runtime, fieldValues(["label", "disabled"]))
  const dispatch = useDispatch(runtime)

  return <button disabled={disabled} onClick={() => dispatch({ _tag: "inc" })}>{label}: {count}</button>
}

function DetailPanel() {
  const host = useModule(PageProgram, { key: "page:42" })
  const detail = useImportedModule(host, Detail.tag)
  const id = useSelector(detail, fieldValue("id"))

  return <div>{id}</div>
}
```

不要把 whole-state snapshot 作为 public host read 生成。需要多个独立字段时，优先拆成多个 selector input；确实属于同一个 UI 原子并且总是一起渲染的少量字段，可以用 `fieldValues([...])` 返回 tuple。不要用 object/struct projection descriptor 作为 public authoring recipe。

## 文档与规划

详细规范见 `docs/ssot/runtime/10-react-host-projection-boundary.md`，关键目标包括：

1. `RuntimeProvider` 只负责 React 子树的 runtime scope；
2. `Program` 是 blueprint，`ModuleRuntime` 是 instance，`ModuleTag` 是当前 scope 下的唯一绑定符号；
3. Hooks 只保留 lookup、instantiate、parent-scope child resolution 三条稳定规律。
4. selector route 的诊断与验证分层由 SSoT 持有，README 示例只展示 public authoring shape。

更多迁移策略与 host boundary 说明，请参阅上述规范文档。
