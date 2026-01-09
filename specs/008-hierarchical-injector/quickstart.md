# Quickstart: 008 层级 Injector（strict 默认 + 显式 root/global）

> 本 quickstart 只演示“如何在正确 scope 下拿到正确实例”，不讨论业务逻辑。  
> 说明：示例代码以“目标语义”为准；最终以 `@logixjs/core` / `@logixjs/react` 实现为准。

## 0. 你需要记住的三句话

1. **strict 默认**：在父模块/父组件的实例 scope 下解析子模块；没提供就报错，不要靠兜底。
2. **root/global 必须显式**：想要单例，就显式用 root/global 入口，不要把 strict 入口当成“也能拿到单例”。
3. **多实例靠句柄传递**：要拿某一份实例，就把 `ModuleRef/ModuleRuntime` 传下去或在边界 resolve 一次后透传。

## 1. React：Host（局部实例）→ Child（imports 子模块）

```tsx
import React from "react"
import * as Logix from "@logixjs/core"
import { useImportedModule, useModule, useSelector } from "@logixjs/react"

// Host.impl 必须在 implement 时 imports Child.impl
export function Panel() {
  const host = useModule(QuerySearchDemoHost.impl, { key: "demo" })

  // strict 默认：从 host 的 imports-scope 解析 child
  const query = useImportedModule(host, QuerySearchDemo.module)

  const page = useSelector(query, (s) => s.params.page)
  return (
    <button onClick={() => query.dispatch({ _tag: "nextPage" } as any)}>
      next (page={page})
    </button>
  )
}
```

要点：

- `useModule(Host.impl)` 永远走“局部实例”语义，不会隐式复用 root 单例；要拿 root 单例请显式 `useModule(Host.module)` / `useModule(Host.impl.module)`。
- `key` 是“实例标识”，用于在多个组件/多处调用之间复用同一份局部实例：同 key（+同 deps）复用、异 key 隔离；未提供 `key` 时会按组件生成临时 key（每组件独立实例）。
- root 也是一种模块实例：如果你把 Host 作为 root 单例使用（`useModule(Host.module)`），strict 的 `imports.get` / `useImportedModule` 仍应可解析其 imports（只依赖该 host 实例的 imports-scope injector / `ImportsScope`）。
- `useImportedModule(host, Child.module)` 与 `host.imports.get(Child.module)` 等价；二者都遵循 strict/global 规则（默认 strict）。

## 2. React：显式 root/global（单例语义）

两种常见写法（注意差异）：

```tsx
import * as Logix from "@logixjs/core"
import React from "react"
import { useRuntime, useModule } from "@logixjs/react"

const runtime = useRuntime()

// 1) “当前 React 运行环境”下解析（受 RuntimeProvider.layer 影响：最近 wins）
const current = useModule(QuerySearchDemo.module)

// 2) 固定 root provider：忽略 RuntimeProvider.layer override（建议用 useMemo 避免每次 render 都 runSync）
const rootSingleton = React.useMemo(
  () => runtime.runSync(Logix.Root.resolve(QuerySearchDemo.module)),
  [runtime],
)
```

约束：

- global/root 语义不会被更近 scope 覆盖；这是“显式选择 root”的价值。
- `useImportedModule/host.imports.get` 只做 strict（子模块解析），不提供 `{ mode: "global" }`。
- 测试场景需要 mock root provider：请在创建这棵 runtime tree 时注入 Layer（例如 `Runtime.make(...,{ layer })` / `ManagedRuntime.make(Layer.mergeAll(...))`）；不要依赖嵌套 `RuntimeProvider.layer` 影响 `Root.resolve`。
- 如果同一模块存在多实例，按 Tag 拿“某一份实例”在语义上不成立；此时应传递明确实例句柄，而不是尝试 global。

## 3. Logic：在父模块逻辑内使用子模块（strict）

```ts
const Logic = Host.logic(($) =>
  Effect.gen(function* () {
    // strict：必须来自当前 Host 实例 scope
    const child = yield* $.use(QuerySearchDemo.module)
    yield* child.read((s) => s.params.page)
  }),
)
```

如果没有在 `Host.impl.implement({ imports: [QuerySearchDemo.impl] })` 中提供 child 的实现：

- strict 语义必须失败，并给出修复建议（补 imports / 改用 global / 透传实例句柄）。

## 3.1 Logic：显式 root/global（全局 module / 单例语义）

```ts
const Logic = Host.logic(($) =>
  Effect.gen(function* () {
    // root/global：固定解析 root provider 的单例（不受子作用域 override 影响）
    const auth = yield* Logix.Root.resolve(GlobalAuth.module)
    yield* auth.read((s) => s)
  }),
)
```

要点：

- 不需要把 `GlobalAuth.impl` 加进 `Host.impl.implement({ imports })`：它不是“Host 的子模块实例”，而是 root provider 的单例。
- 若你需要“某个局部实例”的语义，不应该用 `Root.resolve(ModuleTag)`；应在边界 resolve 该实例句柄并透传（或把该模块提升为 Host 的直接 imports）。

## 3.2 Logic：跨模块协作（替代 `$.useRemote`）——使用 `Link.make`

> `Link.make` 是“显式跨模块胶水逻辑”，通常挂到 **root 模块** 的 `processes` 中由 Runtime 统一 fork。  
> 它不会引入任何 “Tag+key 全局查找” 魔法：若需要特定实例，必须传递明确实例句柄（`ModuleRuntime/ModuleRef`）。

```ts
const Cross = Logix.Link.make(
  { modules: [A.module, B.module] as const },
  ($) =>
    Effect.gen(function* () {
      const a = yield* $.A.read((s) => s.value)
      yield* $.B.actions.setFromA(a)
    }),
)

const RootImpl = Root.implement({
  initial: ...,
  logics: [...],
  imports: [...],
  processes: [Cross],
})
```

## 4. Debug：你应该看到怎样的错误

当你在 strict 语义下缺失提供者时，错误信息至少应包含：

- 请求的模块 id（例如 `QuerySearchDemo`）
- 发生位置（`logic.$.use` / `react.useImportedModule`）
- 父 scope（`QuerySearchDemoHost` + instanceId/key）
- Fix：如何补 imports / 如何显式选择 global
