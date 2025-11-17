# Quickstart: 037 限定 scope 的全局（路由 Host(imports) + ModuleScope）

> 本 quickstart 只演示“怎么组织 + 怎么用 + 怎么在边界结束时统一销毁”，不追求完整 API 细节；最终以 `spec.md / contracts/*` 为准。

## 0. 你需要记住的四句话

1) **路由 scope = 一个 Host 实例**：把“路由范围的共享状态”锚定在一个 Host 模块实例上。  
2) **弹框模块要挂在 Host.imports**：弹框 UI 反复卸载/挂载不应影响模块实例；组件只从 `host.imports.get(Modal.tag)` 拿句柄。  
3) **关闭弹框 ≠ 销毁状态**：别用组件级默认 key 承载“希望保留的状态”。  
4) **离开路由必须结束 scope**：路由 unmount 自动结束；keep-alive/离开但不卸载场景，需要通过“卸载/替换边界 Provider 或切换稳定 scopeId”显式结束 scope。

> 说明：下文默认你已经在更外层挂了 `@logix/react` 的 `RuntimeProvider`（即：有一个 app runtime）。

## 1) Host(imports)（甜点区，默认推荐）

目标：弹框 A/B 都是 Host scope 下的子模块；弹框 UI 反复开关不影响模块状态；离开路由时 Host scope 结束，子模块统一销毁。

概念形态：

- 定义一个 RouteHost 模块，并 `imports: [ModalA.impl, ModalB.impl]`；
- 路由组件创建 Host 实例（建议提供稳定 scopeId，并设置 `gcTime: 0` 以确保卸载后立即释放）；
- 弹框组件通过 `host.imports.get(ModalA.tag)` 解析到“属于这个 host 实例”的子模块句柄并渲染。

关键点：

- UI 千万不要直接 `useModule(ModalA.tag)`（那是“Provider 环境单例”，不绑定到 host scope）。
- UI 也不要直接 `useModule(ModalA)` / `useModule(ModalA.impl)`（那会创建“独立实例”，关闭弹框后会按 gcTime 回收，无法做到“跟随 Host keepalive”）。

## 2) 避免 props 透传：用 ModuleScope（推荐，树内）

目标：路由/页面边界只负责挂 Provider；弹框组件在任意深度都能拿到 Host 句柄，不需要层层传 `host`。

概念形态：

- `const RouteHostScope = ModuleScope.make(RouteHost.impl, { gcTime: 0 })`
- 路由页挂：`<RouteHostScope.Provider options={{ scopeId: routeKey }}> ... </RouteHostScope.Provider>`
- 弹框里：`const host = RouteHostScope.use()`，再 `host.imports.get(ModalA.tag)`
- 更常见：弹框里直接：`const modalA = RouteHostScope.useImported(ModalA.tag)`（语法糖）

关键点：

- 如果缺少 Provider，`RouteHostScope.use()` 必须立即抛错（提示缺少 Provider），不要静默兜底到“全局单例”。
- `options.scopeId` 是这个 scope 的稳定标识（也可以理解为“路由实例 id / tab 分片 id”）：同 scopeId 复用、换 scopeId 新建。
  - 实现细节：`scopeId` 会被映射为内部 `useModule(HostImpl, { key })` 的 `key`（只是一处命名收敛）。

## 3) 高级：跨 React 子树 / 独立 root 复用同一个 scope（ModuleScope.Bridge，实验性）

当你的弹框 UI 不在路由树里（例如全局浮层自己 `createRoot`、微前端子应用、第三方库独立挂载）时：

- 你无法通过 React Context 拿到路由树里的 `RouteHostScope.use()`；
- 但你仍然希望弹框模块 **绑定到路由 scope**（跟随路由销毁、路由内 keepalive）。

这时用 `ModuleScope.Bridge`：它会按 `scopeId` 取回“那棵树注册的 runtime + host module runtime”，并在当前子树内重新提供它们。

### 3.1 前提条件（必须满足）

1) **Provider 必须提供 stable scopeId**：`<RouteHostScope.Provider options={{ scopeId: routeKey }}>`  
   没有 `scopeId` 就不会注册，Bridge 一定找不到。
2) **两棵 React root 必须共享同一个 app runtime**：两棵树各自挂 `RuntimeProvider`，但传入同一个 `runtime` 对象（同一个 runtime tree）。
3) Provider 先挂载（或至少同一时刻存在）：Bridge 在缺注册时会直接抛错（避免静默串用/拿到错误实例）。

### 3.2 示例：路由树（A root）+ 全局浮层树（B root）

路由树（A root）负责创建 scope 并注册（owner）：

```tsx
export const RouteHostScope = ModuleScope.make(RouteHost.impl, { gcTime: 0 })

export function RouteRoot({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Provider options={{ scopeId: routeKey }}>
      {/* 路由页面内容 */}
    </RouteHostScope.Provider>
  )
}
```

两棵 root 必须共享同一个 app runtime（各自挂自己的 `RuntimeProvider`，但 runtime 引用相同）：

```tsx
import { createRoot } from "react-dom/client"
import { RuntimeProvider } from "@logix/react"
import { appRuntime } from "./runtime"

createRoot(document.getElementById("app")!).render(
  <RuntimeProvider runtime={appRuntime}>
    <RouteRoot routeKey={routeKey} />
  </RuntimeProvider>,
)

createRoot(document.getElementById("overlay")!).render(
  <RuntimeProvider runtime={appRuntime}>
    <OverlayRoot routeKey={routeKey} />
  </RuntimeProvider>,
)
```

全局浮层树（B root）通过 Bridge 复用同一个 scope：

```tsx
export function OverlayRoot({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Bridge scopeId={routeKey}>
      <ModalAView />
    </RouteHostScope.Bridge>
  )
}

function ModalAView() {
  const modalA = RouteHostScope.useImported(ModalA.tag)
  // modalA 的实例归属仍然是 A root 的 RouteHostScope.Provider（同 scopeId）
  return null
}
```

> Bridge 依赖运行时侧的内部注册表：使用 `Logix.Runtime.make(...)` 创建 runtime 时默认满足；如果你是手动拼装 runtime（例如 `ManagedRuntime.make(layer)`），需要确保相关基础设施已注入，否则 Provider/Bridge 会在注册/读取时抛错。
>
> （内部参考）若你确实需要在同一个 `scopeId` 下登记/取回“额外的 scope-bound 资源”，请移步 `specs/037-route-scope-eviction/research.md` 的 0.5 段落。

## 4) 推荐 key 规范（避免漂移与误用）

- 路由级 scope：`route:${routeId}`
- 多 Tab/多分片：`route:${routeId}:tab:${tabId}`

> 约束：同一 runtime 内，不要把同一个 key 复用给不同 Host（或不同模块），避免产生 key 归属冲突。

## 5) 常见误用与排错

- “离开路由后还没立刻销毁”：
  - 确认 Host 的 `gcTime` 是否为 0（或足够小）。
  - keep-alive/离开但不卸载：确认边界 Provider 是否真的被卸载/替换，或 key 是否发生了切换。
- “弹框状态没保住”：
  - 是否在弹框里误用了 `useModule(Modal.impl)`（创建了独立实例）？
  - 是否把弹框模块当成 Provider 单例 `useModule(Modal.tag)` 读了？
- “Bridge 报 not registered / disposed”：
  - 确认路由树的 `<RouteHostScope.Provider options={{ scopeId }}>` 是否已挂载且 scopeId 一致；
  - 确认两棵 root 是否使用同一个 app runtime（同一 runtime tree）；
  - 确认 keep-alive 场景下是否发生过 scopeId 切换（切换后旧 scope 会被释放，Bridge 必须跟随更新 scopeId）。
