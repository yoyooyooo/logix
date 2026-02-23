# PR Draft: refactor/logix-core-effects-single-watcher-20260223

## 目标
- 优化 `ModuleRuntime.effects` 的核心派发链路，减少 action 高并发场景下的订阅与分配开销。
- 在不改变对外语义的前提下，将“每 actionTag 一条 watcher + 每次 action 的 handlers Array.from”收敛为“单 watcher 路由 + handlerSnapshot”。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts`
- `docs/ssot/runtime/logix-core/impl/04-watcher-performance-and-flow.01-dispatch-to-handler.md`

## 本轮改动
- `ModuleRuntime.effects.ts`
  - 将 `ActionTagState` 从 `watcherStarted + handlers` 改为 `handlers + handlerSnapshot`。
  - watcher 模型改为全局单 watcher：对每条 action 仅做一次 `resolveActionTag` + `tagStates.get` 路由。
  - 注册 handler 时刷新 `handlerSnapshot`，避免每次 action 执行时 `Array.from(state.handlers.values())`。
  - 保持既有契约：
    - 去重键仍是 `(actionTag, sourceKey)`；
    - run-phase 注册仍只影响未来 action；
    - handler 失败隔离与 `effects::handler_failure` 诊断不变。
- `Effects.DedupeAndDiagnostics.test.ts`
  - 新增 `should route handlers by actionTag without cross-triggering`，验证多 actionTag 场景下路由不串线。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查方式：1 个独立 subagent（explorer，`agent_id=019c8928-3959-7a11-ab25-40f82a31cc55`）基于相对 `origin/main` 的 diff 做只读审查。
- 结论：无阻塞问题，可合并。
- 非阻塞建议：`effects::watcher_crashed` 可进一步带回具体 `actionTag`（当前为 `*`）。
