# PR Draft: refactor/coderabbit-platform-event-reregister-20260223

## 目标
- 跟进 CodeRabbit 对 platformEvent 索引的建议，修复同 installationKey 重装时“旧事件映射未清理、新事件映射未生效”的问题。
- 保持现有 ProcessRuntime 生命周期与并发语义不变，仅收敛平台事件索引注册逻辑。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - 为 `InstallationState` 增加 `platformEventNames` 快照。
  - 将原先“只追加”的 `registerPlatformEventInstallations` 改为 `syncPlatformEventInstallations`：重装时先反注册旧事件，再注册新事件。
  - `install(existing)` 分支在重装时同步刷新 `definition/process/kind/platformEventTriggerIndex/platformEventNames`，避免索引与安装状态漂移。
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`
  - 新增回归：同 `processId + moduleInstance` 重装后，`app:reregister:old` 不再触发、`app:reregister:new` 可触发。

## 风险与取舍
- 风险：`syncPlatformEventInstallations` 引入了重装时的增量清理步骤，复杂度略增。
- 取舍：以显式的“先删后加”换取长期运行中的索引稳定性，避免陈旧映射累积与错误 fan-out。

## 验证
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.PlatformEvent.test.ts --run --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- Reviewer：`explorer` subagent（id: `019c8ad6-a514-7992-8784-b83d68c0881a`）
- 结论：未发现阻断问题，可进入 PR。
- 可选改进（本轮未纳入）：
  - 在 installation 被移除时，同步清理 `installationsByPlatformEvent` 的 `installationKey`，避免长时间运行下映射体积增长。
  - 在 `deliverPlatformEvent` 前置过滤“无活跃实例/无触发器映射”的 installation，减少无效遍历。
  - 补一条“实例非 running/starting 时不应入队 platform event”的回归，覆盖该保护分支。
