# PR Draft: refactor/logix-core-txnqueue-wake-dedupe-20260223

## 目标
- 优化 `ModuleRuntime.txnQueue` 的 wake 通知路径，减少高频 enqueue 时的无效 wake 信号开销。
- 保持核心语义不变：单消费者串行执行、urgent 优先、nonUrgent 不饥饿、背压与诊断语义不漂移。
- 增加回归测试锁定“空闲切换 + burst 入队”场景下不丢任务。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- `docs/ssot/handbook/tutorials/19-concurrency-batching-txn-lanes.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
  - 新增 `wakePendingRef`，表示当前是否已有待消费 wake 或 consumer 正在活跃 drain。
  - 新增 `offerWakeIfNeeded`：仅在 `wakePendingRef=false` 时发 wake，避免每次 enqueue 都额外 `Queue.offer(wakeQueue)`。
  - consumer loop 在尝试进入 idle 时增加“sleep 前重检”逻辑，规避 wake 去重后的漏唤醒竞态窗口。
  - enqueue 路径仍保持 uninterruptible（先入任务队列，再按需 wake），避免背压槽位泄露。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
  - 新增 `drains burst enqueue after idle transition without losing wake-ups` 回归用例。
  - 覆盖 idle 后混合 urgent/nonUrgent burst 入队 + 超时门禁，锁定不会丢任务/卡死。

## 验证
- `pnpm test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`（`packages/logix-core`）
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- Reviewer：subagent `019c8abd-1b8a-7611-ba18-b26a6f05b921`
- 结论：无阻塞问题，可合并
- 建议与处理：
  - 建议补充 `wakePendingRef` 状态机注释，已处理。
  - 建议提高 burst 回归用例对时序竞态的检出稳定性，已处理（改为双轮 burst）。
  - 建议后续补“显式 idle 信号”版本测试，记为后续增强（本 PR 不扩 scope）。
