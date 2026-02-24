# PR Draft: refactor/logix-core-process-trigger-start-plan-cache-20260224

- PR：`#72`（https://github.com/yoyooyooo/logix/pull/72）
- 合并策略：创建后开启 `auto-merge(rebase)`
- CI watcher：`.context/pr-ci-watch/pr-72-20260224-154419.log`

## 阅读范围
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/runtime/core/process/triggerStartPlan.ts`
- `packages/logix-core/test/Process/Process.TriggerStartPlan.test.ts`
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`
- `packages/logix-core/test/Process/Process.Trigger.InvalidKind.test.ts`

## 改动
- 新增 `triggerStartPlan` 预编译模块，在安装/更新时一次性编译并缓存：
  - `nonPlatformTriggers`
  - `bootTrigger`
  - `dependencyModuleIds`（`requires + implicit trigger module` 去重）
  - `dispatchTracingModuleIds`（dispatch tracing 专用 requires 去重）
- `ProcessRuntime.make` 接入 `startPlan` 缓存：
  - `install` 与重装更新 definition 时刷新缓存；
  - `startInstallation` 启动热路径改为直接复用缓存，移除重复扫描与临时 `Set/Array` 分配。
- 保持原有异常语义：畸形 trigger kind 仍沿既有链路返回 `process::invalid_trigger_kind`。

## 验证
- `pnpm typecheck` ✅（2026-02-24）
- `pnpm test:turbo` ✅（2026-02-24）

## 独立审查
- 审查方式：主会话基于 `origin/main...HEAD` 的真实 diff 做人工只读复核（`ProcessRuntime.make.ts`、`triggerStartPlan.ts` 与新增回归测试）。
- 结论：未发现阻断问题；触发器预编译缓存的刷新路径（install/update）与运行期复用路径一致，且“旧定义 disabled + 新定义 enabled”场景已由回归测试锁定。
- 合并建议：可继续等待 required checks；当前唯一显式失败项来自 Vercel 配额限制，属于外部资源门禁，不是代码语义回归。
- perf 证据来源：GitHub Actions 机器人评论（`https://github.com/yoyooyooo/logix/pull/72#issuecomment-3949787060`）+ artifact `logix-perf-quick-72`，结论 `comparable=true`、`regressions=0`、`head budgetExceeded=0`（记录含一次 `stabilityWarning`，需按 quick profile 噪声口径解读）。

## 风险
- 风险点：definition 更新后若缓存未刷新，会触发旧 trigger plan。
- 防线：新增行为测试覆盖“先 disabled 安装旧定义，再 enabled 安装新定义”场景，断言启动使用新 boot trigger。
- 关注点：后续若新增 trigger kind 但未同步预编译分发，可能出现计划构建漏项；由现有 `process::invalid_trigger_kind` 回归用例兜底。

## 评论状态快照（2026-02-24）
- CodeRabbit：
  - 评论：`rate limit exceeded`（`https://github.com/yoyooyooo/logix/pull/72#issuecomment-3949781769`），当前无代码级阻断建议。
  - 状态：PR context `CodeRabbit=SUCCESS`。
- GitHub Actions：
  - `ci / verify`（2 个 check）当前 `IN_PROGRESS`。
  - `logix-perf (quick) / perf-quick` 已 `SUCCESS`（`https://github.com/yoyooyooo/logix/actions/runs/22341477649/job/64645561875`）。
  - perf 评论：`https://github.com/yoyooyooo/logix/pull/72#issuecomment-3949787060`。
- Vercel：
  - 评论：部署取消（`https://github.com/yoyooyooo/logix/pull/72#issuecomment-3949781305`）与配额失败（`https://github.com/yoyooyooo/logix/pull/72#issuecomment-3949832798`）。
  - 状态：PR context `Vercel=FAILURE`，原因 `api-deployments-free-per-day`（免费额度上限）。
