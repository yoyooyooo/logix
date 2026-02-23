# PR Draft: refactor/logix-core-txnqueue-acquire-fastpath-20260223

## 目标
- 在 `txnQueue` 非阻塞常态路径降低策略解析开销，减少一次不必要的 `resolveConcurrencyPolicy()` 调用。
- 保持背压、诊断、lane 调度语义不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.*.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
  - `acquireBacklogSlot` 从“每轮先解析策略再尝试抢槽”改为“先尝试抢槽，只有阻塞时才解析策略并发出压力诊断”。
  - 在不阻塞的主路径上减少一次 `resolveConcurrencyPolicy()` 调用，保持阻塞路径诊断口径不变。
  - 将 `wait` 分支改为在同一 `Ref.modify` 内原子地完成 `waiters + 1` 注册，消除“判定等待与注册 waiter 非原子”的漏唤醒窗口。
  - 阻塞等待改为直接复用当轮 `attempt.signal`，避免重复写 `stateRef`。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
  - 新增回归：`should not miss wake-up when release happens during blocked acquire diagnostics path`。
  - 使用 `Deferred` 双门闩固定竞态时序（先进入 blocked diagnostics，再触发 release，再放行 waiter），避免 `TestClock` 下 `Effect.sleep` 不推进导致的伪超时。

## 验证
- `pnpm test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.*.test.ts`（`packages/logix-core`）✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 独立审查
- Reviewer：subagent（default，`agent_id=019c8ae8-116e-7100-92b7-5a3c32343533`）
- 结论：无阻塞问题，可合并。
- 建议与处理：
  - 建议：补一个“blocked diagnostics 期间取消等待 fiber”的中断语义测试，进一步锁定 `waiters` 计数回收边界。
  - 处理：本 PR 先聚焦漏唤醒竞态修复与主路径 fast-path，不在本轮扩展中断语义测试，记录为下一轮候选。
