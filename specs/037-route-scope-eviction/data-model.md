# Data Model: 037 ScopeRegistry（scope-bound 值注册表）

**Branch**: `037-route-scope-eviction`  
**Source Spec**: `specs/037-route-scope-eviction/spec.md`  
**Source Plan**: `specs/037-route-scope-eviction/plan.md`

> 目标：为“限定 scope 的全局”与后续的 Bridge（跨 React 子树复用同一 scope）固化最小数据模型与不变量，避免实现随意漂移。

## 1) 核心概念

### 1.1 ScopeId（稳定标识）

- 类型：`string`
- 语义：一个业务边界（路由/页面/多 Tab 分片）的稳定 id
- 约束：应由业务提供并保持稳定；禁止依赖随机或时间戳默认。

### 1.2 Token（按类型区分的 key）

- 类型：`Context.Tag<any, A>`
- 语义：ScopeRegistry 内部用 token 区分“同一个 scope 下不同类别的值”
- 约束：token 必须稳定（通常由 `Context.Tag(...)` 创建的 class）。

## 2) ScopeRegistryEntry（注册条目）

ScopeRegistry 的最小条目结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `leaseId` | number | 注册时分配的递增 id |
| `value` | unknown | 被注册的值（类型由 token 决定） |

## 3) 数据结构（逻辑模型）

- `scopes: Map<ScopeId, Map<Token, EntryStack>>`
- `EntryStack: Array<Entry>`

语义约束：

- “最后注册者生效”：`get(scopeId, token)` 返回 stack 的最后一个 entry.value。
- 允许多方注册：同一个 `scopeId + token` 可以被多次 register（以 LIFO 栈叠加）。

## 4) Lease（释放语义）

`register(scopeId, token, value)` 返回 `{ release() }`，其语义：

- release 是幂等的：重复调用不应抛错。
- 常见路径为 LIFO 释放（最后注册的先释放）；必须支持“中间释放”（线性扫描删除对应 leaseId）。
- 当某 token 的 stack 为空时，应清理该 token；当某 scope 下无 token 时，应清理该 scope。

## 5) 清理 API（边界操作）

ScopeRegistry 提供三类清理：

- `clearToken(scopeId, token)`：清空某个 scope 下某 token 的全部注册
- `clearScope(scopeId)`：清空某个 scope 下的全部 token
- `clearAll()`：清空整个 registry

约束：

- 不抛异常（无论 scope/token 是否存在）。
- 不跨 runtime tree 生效（registry 只存在于当前 runtime 的 Env 里，不允许进程级全局正确性依赖）。

## 6) 与 037 的使用方式（规范化场景）

### 6.1 ModuleScope.Provider 的注册策略

当某个 scopeProvider（如路由边界）挂载时：

- 以 `scopeId` 注册两类值：
  - “该 scope 对应的 ManagedRuntime 句柄”（用于跨树复用 Env/Scope/FiberRef）
  - “该 scope 下的 Host 模块 runtime”（用于在另一棵树重建模块句柄）
- unmount 时必须调用 lease.release 释放注册，避免泄漏。

### 6.2 Bridge 的读取策略（高级/实验性）

Bridge 通过 `(scopeId, token)` 取回：

- scope runtime（用于重新提供 RuntimeProvider）
- module runtime（用于重建 module ref 并在子树提供 Context）

失败模式：

- scope 未注册或已释放：必须抛出明确错误，提示“缺少对应 Provider 或 Provider 已被卸载”。
