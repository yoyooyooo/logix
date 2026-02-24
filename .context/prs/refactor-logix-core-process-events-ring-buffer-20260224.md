# Process 事件历史环形缓冲（PR8）

## Branch
- `refactor/logix-core-perf-pr8-process-events-ring`
- PR: #75 (https://github.com/yoyooyooo/logix/pull/75)
- CI watcher: `.context/pr-ci-watch/pr-75-20260224-171030.log`

## 核心改动
- `ProcessRuntime.make` 的事件历史缓冲由 `Array + splice(0, excess)` 改为固定容量 O(1) 环形缓冲。
- 保持 `maxEventHistory <= 0` 时 `getEventsSnapshot()` 返回空数组。
- 保持 `eventsHub` 行为不变，`getEventsSnapshot()` 继续返回最旧到最新顺序。
- 追加边界修复：`maxEventHistory` 先归一化到 `PROCESS_EVENT_HISTORY_MAX_CAPACITY`，并改为按需增长写入（避免 `new Array(超大值)` 初始化崩溃）。

## 测试覆盖
- 新增 `packages/logix-core/test/Process/Process.Events.History.Cap.test.ts`：
  - 断言超出容量后仅保留最后 N 条触发事件，且顺序为 oldest -> latest。
  - 断言 `maxEventHistory = 0` 时快照恒为空。
  - 断言 `maxEventHistory = Number.MAX_SAFE_INTEGER` 时 runtime 可正常初始化与读取快照。
  - 断言 `maxEventHistory = 1` 时仅保留最后一条事件。

## 独立审查（subagent）
- 结论：发现 1 个 blocker，已修复后无新增 blocker。
- blocker 内容：`new Array(eventHistoryCapacity)` 在超大容量配置下可能抛 `RangeError`。
- 修复提交：`93805064`（`fix(logix-core): guard process event history capacity extremes`）。
- non-blocker 建议（补测试）已吸收：超大值与容量=1 边界测试均已补齐。

## 机器人评论消化
- CodeRabbit：当前为 in-progress（待最终评论）；已先处理独立审查发现的问题并推送修复提交。
- `logix-perf (quick)`：`status: ok`（无回归）。
- Vercel：免费额度限制导致失败（非代码语义问题，持续与其它 PR 一致）。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`
