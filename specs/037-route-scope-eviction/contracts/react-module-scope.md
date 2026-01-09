# Contract: React ModuleScope（Provider + hook + 可选 Bridge）

**Branch**: `037-route-scope-eviction`  
**Source Spec**: `specs/037-route-scope-eviction/spec.md`

> 本契约描述 `@logixjs/react` 对外提供的“Scope 工具”能力：它如何把 Host 实例暴露给深层组件、如何合并 options、以及缺 Provider/缺注册时的错误口径。

## 1) API Surface

`@logixjs/react` MUST 提供一个稳定的 public API（不得依赖 `./internal/*`）用于创建 scope 组合件：

- 输入：某个 Host `ModuleImpl`（以及可选 defaults）
- 输出：`{ Provider, use, useImported, Context }`（可选：`Bridge`）

契约以形状描述（具体导出名以实现为准）：

```ts
type ModuleScopeOptions =
  | { readonly deps?: React.DependencyList; readonly scopeId?: string; readonly suspend?: false; readonly initTimeoutMs?: number; readonly gcTime?: number; readonly label?: string }
  | { readonly deps?: React.DependencyList; readonly scopeId: string; readonly suspend: true; readonly initTimeoutMs?: number; readonly gcTime?: number; readonly label?: string }

type ModuleScope<Ref> = {
  readonly Provider: React.FC<{ readonly children: React.ReactNode; readonly options?: ModuleScopeOptions }>
  readonly use: () => Ref
  readonly useImported: <Id extends string, Sh extends Logix.AnyModuleShape>(
    module: Logix.ModuleTagType<Id, Sh>,
  ) => ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  readonly Context: React.Context<Ref | null>
  readonly Bridge?: React.FC<{ readonly scopeId: string; readonly children: React.ReactNode }>
}

ModuleScope.make(hostImpl, defaults?) => ModuleScope<HostRef>
```

## 2) Provider Semantics

### 2.1 Host 实例创建

- Provider MUST 在内部创建并持有 Host 模块实例（等价于调用 `useModule(hostImpl, mergedOptions)`，其中 `mergedOptions.scopeId` 会映射为内部的 `mergedOptions.key`）。
- Provider MUST 将该 Host 句柄通过 Context 提供给其 children。

### 2.2 options 合并规则

- 若同时提供 defaults 与 `Provider.options`，合并规则 MUST 为“Provider.options 覆盖 defaults”（浅合并即可）。
- 合并后的 options 作为 `useModule(hostImpl, options)` 的输入（其中 `options.scopeId` 会映射为内部的 `options.key`）。

### 2.3 key / scopeId 语义

- 若合并后的 options 含 `scopeId`，该 scopeId MUST 作为“业务边界 id”：
  - 同一个 scopeId 对应同一个业务边界（路由/页面/Tab）。
  - 不同 scopeId MUST 对应互相隔离的 Host 实例（以及其 imports 子模块）。

## 3) use() Semantics（缺 Provider 的错误口径）

- `use()` MUST 在缺少 Provider 时抛出错误（不得静默兜底到“全局单例”）。
- 错误消息 MUST 足够可读，能在 30 秒内定位问题（建议包含 “Provider not found / missing provider” 等关键词）。

## 3.1) useImported() Semantics（绑定 Host(imports) 子模块）

- `useImported(tag)` MUST 等价于 `const host = use(); host.imports.get(tag)`。
- 若缺少 Provider：`useImported()` MUST 与 `use()` 一致抛错（不得静默兜底）。

## 4) Bridge Semantics（可选/实验性）

Bridge 用于“跨 React 子树 / 独立 root”复用同一个 scope。

前提条件：

- 当前 runtime tree 的 Env 中 MUST 提供 ScopeRegistry（由 `@logixjs/core` 提供）。
- 某处 Provider（通常是路由/页面边界）已用同一个 `scopeId` 注册过该 scope 的 runtime + module runtime。

行为：

- Bridge MUST 通过 ScopeRegistry 读取：
  - `scopeId` 对应的 scoped runtime
  - `scopeId` 对应的 Host module runtime
- Bridge MUST 在其 children 内重新提供 RuntimeProvider（runtime=scoped runtime），并重新提供 Host 句柄 Context。

失败口径：

- 若缺 ScopeRegistry：MUST 抛出错误，提示需要在 runtime layer 注入（不得静默失败）。
- 若 scopeId 未注册或已释放：MUST 抛出错误，提示缺少对应 Provider 或 Provider 已被卸载。

## 5) Test Matrix（实现必须覆盖）

- 缺 Provider：`use()` 直接抛错，错误可读。
- 缺 Provider：`useImported()` 直接抛错，错误可读。
- defaults/options 合并：Provider.options 覆盖 defaults；不同 scopeId 隔离。
- Host(imports) 场景：弹框 UI 卸载/挂载不影响子模块实例（绑定 Host）。
- Bridge（如提供）：
  - 缺注册：抛错明确；
  - 注册后可取回并复用同一 scope（至少保证 runtime 与 module runtime 取回成功，且释放后不可再取回）。
