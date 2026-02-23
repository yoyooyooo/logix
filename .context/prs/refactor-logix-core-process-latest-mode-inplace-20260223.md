# PR Draft: refactor/logix-core-process-latest-mode-inplace-20260223

## 目标
- 统一 `latest` 并发语义在 `Process` 与 `TaskRunner` 的核心实现，减少重复状态机和热路径分配。
- 优化 `Process` serial/parallel 队列出队性能，避免 `Array.shift()` 在 backlog 场景的线性开销。
- 保持行为契约不变：中断语义、写回守卫、queue overflow 诊断与并发边界不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
- `packages/logix-core/test/internal/Runtime/TaskRunner.test.ts`
- `docs/specs/drafts/topics/runtime-v3-core/00-invariants-and-gates.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/LatestFiberSlot.ts`
  - 新增 latest 运行槽内核：`beginRun` / `setFiberIfCurrent` / `clearIfCurrent`。
  - 统一 `runId + fiber` 状态管理，提供无分配原地更新。
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
  - latest 路径切换为 `LatestFiberSlot`，移除对象扩展与 `Fiber.poll` 检查。
  - serial/parallel 队列改为“数组 + 游标”模型，避免 `shift()` 的 O(n) 出队。
  - overflow 分支改为直接携带 `peak`，去掉额外 `Ref.get`。
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
  - latest 路径切换为 `LatestFiberSlot`，收敛与 Process 一致的取消/写回守卫逻辑。
  - 运行完成后仅在 runId 仍匹配时清理槽位，避免 stale fiber 残留。
- `packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
  - 新增 serial backlog 回归用例，锁定 backlog 场景下不丢触发的行为。

## 验证
- `pnpm test -- test/Process/Process.Concurrency.LatestVsSerial.test.ts test/internal/Runtime/TaskRunner.test.ts`（`packages/logix-core`）
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- Reviewer：待创建 subagent
- 结论：待补充
- 建议与处理：待补充
