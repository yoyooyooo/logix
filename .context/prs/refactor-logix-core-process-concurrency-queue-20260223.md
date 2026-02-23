# PR Draft: refactor/logix-core-process-concurrency-queue-20260223

## PR
- `#37`：https://github.com/yoyooyooo/logix/pull/37

## 目标
- 优化 `process` 并发策略热路径分配成本，去除 serial/parallel 模式每次入队/出队时的队列克隆与对象扩展。
- 保持行为语义不变：FIFO、并发上限、queue overflow 统计与告警路径、drop/latest 模式契约不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
- `packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
- `packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
  - serial/parallel 队列改为原地 `push/shift`，移除 `[...]` 队列复制。
  - 状态更新改为原地字段写入后返回同一对象，减少每次触发的对象 spread 分配。
  - `drainSerial/drainParallel` 直接消费队头元素，保持既有调度与 backpressure 语义。
- `.context/REFACTOR.md`
  - 更新 PR 索引状态并新增本 PR 记录入口。

## 验证
- `pnpm --filter @logixjs/core test -- test/Process/Process.Concurrency.LatestVsSerial.test.ts test/Process/Process.Concurrency.DropVsParallel.test.ts --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查方式：1 个独立 subagent（worker，`agent_id=019c8967-ccf6-7f63-b2cb-d8a3738ea667`）基于 `origin/main...HEAD` 的真实 diff 做只读审查。
- 结论：无阻塞问题，可合并。
- 关键理由：仅并发队列状态维护方式从“复制”改为“原地更新”，未改变 `parallelLimit`、overflow guard、FIFO 与清理回收语义。
