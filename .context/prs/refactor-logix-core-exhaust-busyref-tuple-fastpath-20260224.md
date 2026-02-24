# PR Draft: refactor/logix-core-perf-pr20-exhaust-busyref-fastpath

- PR：`#87`（https://github.com/yoyooyooo/logix/pull/87）
- 合并策略：创建后由 watcher 执行 `merge`
- CI watcher：`.context/pr-ci-watch/pr-87-20260224-224142.log`

## 目标
- 在 `runExhaust` 热路径消除每事件 `Ref.modify` tuple 字面量分配。
- 保持 exhaust 的并发/丢弃语义完全不变（busy 时直接丢弃，不产生额外事务）。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- `packages/logix-core/test/internal/Flow/FlowRuntime.test.ts`
- `packages/logix-core/test/internal/Runtime/TaskRunner.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - 新增 `EXHAUST_ACQUIRE_BUSY` / `EXHAUST_REJECT_BUSY` 常量 tuple。
  - `runExhaust` 的 `Ref.modify` 改为复用常量 tuple，去掉每事件数组字面量创建。
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
  - 新增同名常量 tuple。
  - `mode === "exhaust"` 的 `Ref.modify` 改为复用常量 tuple，保持忽略触发与 release 逻辑不变。

## 语义不变量检查
- acquire 条件不变：仅 `busy=false` 时进入执行。
- reject 条件不变：`busy=true` 时直接返回，不触发 pending/success/failure 链路。
- release 时机不变：仍在 `finally` 中 `Ref.set(busyRef, false)`。
- 并发上限与 `Stream.mapEffect(..., { concurrency })` 结构不变。

## 验证
- `pnpm --filter @logixjs/core test -- test/internal/Flow/FlowRuntime.test.ts test/internal/Runtime/TaskRunner.test.ts` ✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 风险与缓解
- 风险：tuple 常量化若误改状态位，会破坏 exhaust gating。
- 缓解：仅将 `Ref.modify` 返回字面量替换为等值常量；保留现有 exhaust 回归测试并通过全仓 typecheck/test 门禁。

## 机器人评论消化（CodeRabbit）
- 待 PR 创建后补充。
