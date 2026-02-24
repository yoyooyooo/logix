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
- 最终提交：`5685f70a`

## 风险
- 风险点：definition 更新后若缓存未刷新，会触发旧 trigger plan。
- 防线：新增行为测试覆盖“先 disabled 安装旧定义，再 enabled 安装新定义”场景，断言启动使用新 boot trigger。
- 关注点：后续若新增 trigger kind 但未同步预编译分发，可能出现计划构建漏项；由现有 `process::invalid_trigger_kind` 回归用例兜底。

## 机器人评论状态
- CodeRabbit：待首轮审阅（占位）。
