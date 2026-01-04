# Contract: Router Diagnosability（诊断事件口径）

目标：当启用诊断时，能解释 “谁发起 → 意图是什么 → 导航后快照如何变化”（SC-003），同时 diagnostics off 近零成本（NFR-002）。

## 1) 事件化范围

- MUST：`Router.navigate`（由业务 logic 发起的导航）
- MUST NOT：对外部触发的 route change 强行归因到某个 logic（只要求快照一致 + 可订阅）
- MAY：`Router.getSnapshot` / `Router.changes` 的错误（例如 MissingRouter）以 diagnostic(warn/error) 形式输出

## 2) 事件载荷（Slim & 可序列化）

建议事件模型（概念，具体实现可用 DebugSink trace 或 TraitLifecycle 内核事件化）：

- `type: trace:router:navigate`（两阶段：start/settled；每次 navigate 至多 2 条）
  - `moduleId/instanceId`：从 Bound API 提取（满足“谁发起”）
  - `data`：
    - `navSeq: number`（per router 实例递增）
    - `phase: 'start' | 'settled'`
    - `intent: NavigationIntent`
    - `before?: RouteSnapshot`（可选：导航前快照；diagnostics on 时建议采集）
    - `after?: RouteSnapshot`（可选：导航后快照；diagnostics on 时建议采集）
    - `routerKind?: string`（可选，用于区分引擎实现）
    - `status: 'success' | 'error'`
    - `error?: { code: string; message: string }`（失败时）

约束：

- 不得把闭包/Effect 本体/大型对象图塞进事件。
- `RouteSnapshot` 进入事件时必须可序列化；若实现提供了不可序列化字段，应在边界做裁剪。
- 关联策略：以 `navSeq + phase` 作为相关性锚点：先记录 `phase:'start'`（before+intent），再在观测到后续快照后异步记录 `phase:'settled'`（after），不得阻塞业务逻辑（Q003）。
- `settled` 采样口径：默认记录“导航完成后的最终快照（含重定向/二次跳转）”，而不是“紧接着的一次快照变化”。实现侧优先使用 Router Engine 的 settle 信号（Promise/事件）；若缺失，则以“观测到变更后等待一个微任务/短暂 quiet window，再取最后一次观测到的快照”的策略近似，并设置最大等待上限以避免悬挂。
  - 默认常量（MUST, for testability）：`quietWindowMs=0`（一个 microtask）、`settleTimeoutMs=10_000`
  - 超时语义（MUST）：记录 `phase:'settled'` 且 `status:'error'`，并填充 `error.code='router:settle_timeout'`（`after` 可省略）
  - 落点（MUST）：`packages/logix-router/src/internal/navigateTrace.ts`

可见性边界：

- `navSeq` 仅作为诊断相关性锚点（存在于诊断事件载荷中），不注入 `RouterService` API 的返回值。

## 3) 缺失注入/能力不足的错误口径

- MissingRouter：必须是可操作错误（包含“如何注入 `Router.layer(Router.ReactRouter.make(...))` / `Router.layer(Router.TanStackRouter.make(...))`”的 hint）。
- Unsupported intent：必须明确指出 `intent._tag` 与 Router 实现的能力边界。
- 事务窗口误用：必须明确指出“不允许在 txn window 内导航”，并提示把调用移到 `runFork`/Effect 侧。
