# PR Draft: refactor/logix-core-platform-event-index-20260223

## PR
- `#38`：https://github.com/yoyooyooo/logix/pull/38

## 目标
- 优化 `ProcessRuntime.deliverPlatformEvent` 热路径，避免每次平台事件投递都全量扫描所有 `instances` 并重复过滤 trigger。
- 在不改变行为语义前提下，将匹配逻辑前移到安装期，按 `eventName -> installation/spec` 做索引路由。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`
- `docs/ssot/handbook/tutorials/12-process-and-scheduling.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - 新增安装期索引：`buildPlatformEventTriggerIndex`、`registerPlatformEventInstallations`。
  - `InstallationState` 新增 `platformEventTriggerIndex`，记录当前 process definition 的 `platformEvent` trigger 分组。
  - runtime 级新增 `installationsByPlatformEvent`，将 `eventName` 映射到候选 installation 集合。
  - `deliverPlatformEvent` 改为按 `eventName` 定位 installation，再命中当前活跃 instance，避免全量 `instances` 扫描。
  - 保持原有语义：仅 `starting/running` 实例可投递；同一 event 下重复 trigger 仍逐条入队。
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`
  - 新增回归用例：`should only fan out to matching platformEvent triggers and preserve duplicate specs`。
  - 覆盖点：
    - 非匹配 `eventName` 不触发；
    - 匹配 `eventName` 触发；
    - 同 process 内重复 `platformEvent` trigger 会按规格触发多次。

## 验证
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.PlatformEvent.test.ts --reporter=dot --hideSkippedTests`
- `pnpm --filter @logixjs/core test -- test/Process/Process.Concurrency.LatestVsSerial.test.ts test/Process/Process.Concurrency.DropVsParallel.test.ts --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查方式：1 个独立 subagent（worker，`agent_id=019c8978-6f62-7142-b343-9be41f1fe84e`）基于 `origin/main...HEAD` 的真实 diff 做只读审查。
- 结论：给出 1 条 `Medium`（核心路径缺少本地性能对比证据），建议先补性能基线再合并。
- 处理策略：按当前会话裁决“本地只做 typecheck/test，性能证据由 PR CI 提供”执行，保留该意见并在 CI 结果里闭环。
