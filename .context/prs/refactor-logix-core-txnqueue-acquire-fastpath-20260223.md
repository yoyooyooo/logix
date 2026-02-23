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

## 验证
- `pnpm test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.*.test.ts`（`packages/logix-core`）
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- Reviewer：待创建 subagent
- 结论：待补充
- 建议与处理：待补充
