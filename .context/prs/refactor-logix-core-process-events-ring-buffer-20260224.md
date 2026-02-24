# Process 事件历史环形缓冲（PR8）

## Branch
- `refactor/logix-core-perf-pr8-process-events-ring`
- PR: #75 (https://github.com/yoyooyooo/logix/pull/75)

## 核心改动
- `ProcessRuntime.make` 的事件历史缓冲由 `Array + splice(0, excess)` 改为固定容量 O(1) 环形缓冲。
- 保持 `maxEventHistory <= 0` 时 `getEventsSnapshot()` 返回空数组。
- 保持 `eventsHub` 行为不变，`getEventsSnapshot()` 继续返回最旧到最新顺序。

## 测试覆盖
- 新增 `packages/logix-core/test/Process/Process.Events.History.Cap.test.ts`：
  - 断言超出容量后仅保留最后 N 条触发事件，且顺序为 oldest -> latest。
  - 断言 `maxEventHistory = 0` 时快照恒为空。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`
