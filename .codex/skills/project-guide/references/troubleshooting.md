---
title: 常见坑与排错（project-guide）
status: draft
version: 1
---

# 常见坑与排错（project-guide）

> **用法**：先用 A–K 判定维度，再用“症状 → 入口 → 修复”三跳处理；避免在 data/execution/graph/observability 间来回跳。

## 1) phase / setup-run 相关

**症状**：看到 `LogicPhaseError` 或 diagnostic `code: logic::invalid_phase`。

- 入口：
  - phase error 构造与诊断：`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`
  - 错误汇聚（不会让构造失败）：`packages/logix-core/src/internal/runtime/ModuleRuntime.logics.ts`
- 典型原因：
  - setup 段读 Env/Service（例如 `$.use(ServiceTag)`）；
  - run 段注册 setup-only 能力（例如 `$.lifecycle.*`）；
  - setup 结束后再 declare traits（traits 已冻结）。
  - **仅在生产构建/打包后出现（dev server 正常）**：LogicPlanEffect（Effect 返回 plan）在“解析 plan”与“执行 plan.setup/run”之间使用了不同的 phaseRef，导致 run 段仍读到 `phase=setup`（表象与“写法把 `$.use` 放到 setup”非常像）。
- 修复建议：
  - 把“读 Env/IO/订阅”移动到 run 段；setup 只做同步注册；
  - 如必须等待 Env，就用 run-only 的等待语义（见 `Root.resolve(...,{ waitForReady:true })`）。
  - 若确认写法无误但只在生产构建触发：优先检查 `ModuleRuntime.logics.ts` 的 LogicPlanEffect 归一化是否复用同一 phaseRef（`normalizeToPlan`），以及 `ModuleFactory.ts` 是否从 `LogicPhaseServiceTag` 获取 phaseService（避免“解析阶段/执行阶段”相位脱钩）。
- 相关测试：
  - `packages/logix-core/test/Lifecycle.PhaseGuard.test.ts`

## 2) `$.use` strict imports / MissingImport

**症状**：Effect/Cause 里出现 `MissingModuleRuntimeError`，且提示 `mode: strict` / `entrypoint: logic.$.use`。

- 入口：
  - 断言用例：`packages/logix-core/test/BoundApi.MissingImport.test.ts`
  - `$.use` 解析与 strict 检查：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- 典型原因：当前 ModuleImpl 没有把子模块放进 `imports`，但代码里调用了 `$.use(Child)`。
- 修复建议：
  - 把子模块显式声明进 `imports`（错误提示里通常会给出 `imports: [Child.impl]` 的 fix）。

## 3) Root.resolve / root provider 缺失或未就绪

**症状**：抛 `MissingRootProviderError`（可能带 `reason: rootContextNotReady`）。

- 入口：
  - Root API：`packages/logix-core/src/Root.ts`
  - RootContext：`packages/logix-core/src/internal/runtime/core/RootContext.ts`
- 典型原因：
  - 没在 `Runtime.make(...,{ layer })` 提供对应 Tag；
  - 在 setup/layer 阶段调用 Root.resolve，rootContext 尚未 ready。
- 修复建议：
  - 把服务放到 `Runtime.make` 的 `options.layer`（或 Root ModuleImpl.layer）；
  - 避免在 setup 段等待 root；需要等待时只在 run 段 `waitForReady:true`。

## 4) Env Service not found（初始化噪音）

**症状**：出现 diagnostic `code: logic::env_service_not_found`，message 含 `Service not found:`。

- 入口：`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`
- 典型原因：初始化时序下，Logic 在 Env 铺满前读取 Service。
- 修复建议：若只在启动早期出现一次且后续正常可视为噪音；若持续出现，检查 `Runtime.make` / React Provider 的 Layer 是否正确提供 Service。

## 5) AppRuntime Tag collision（TagCollisionError）

**症状**：启动/组装 Runtime 时抛 `_tag: TagCollisionError`，message 含 `Tag collision detected`。

- 入口：
  - 校验位置：`packages/logix-core/src/internal/runtime/AppRuntime.ts`（`validateTags`）
  - 回归用例：`packages/logix-core/test/AppRuntime.test.ts`
- 典型原因：多个模块声明/导出了同一个 Tag key，导致 Env 合并存在歧义。
- 修复建议：拆分/重命名 Tag；或把“共享单例”收敛到 root provider（`Root.resolve` 语义）。

## 6) traits 冻结后仍在注册（ModuleTraitsFrozen）

**症状**：抛 `[ModuleTraitsFrozen] Cannot register traits contribution after finalize/freeze.`。

- 入口：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（traits registry/freeze）
- 典型原因：在 run 段动态注册 traits contribution（setup 已结束）。
- 修复建议：把 `$.traits.declare` / traits 注册移动到 setup 阶段（见 phase guard 的提示）。

## 7) time travel 无效（no-op）

**症状**：调用 `applyTransactionSnapshot` 没效果/静默返回。

- 入口：
  - public：`packages/logix-core/src/Runtime.ts`（`applyTransactionSnapshot`）
  - internal：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（dev-only guard + snapshot 读取）
- 典型原因：
  - 非 dev 环境（`isDevEnv()` 为 false）；
  - 没采集 before/after 快照（instrumentation/配置未启用）。
- 修复建议：在 dev/test 下结合 devtools + 更高诊断档位使用（详见：`diagnostics-perf-baseline.md`）。

## 8) 快速定位：先看哪些测试

- strict imports：`packages/logix-core/test/BoundApi.MissingImport.test.ts`
- phase guard：`packages/logix-core/test/Lifecycle.PhaseGuard.test.ts`
- tag collision：`packages/logix-core/test/AppRuntime.test.ts`
- diagnostics 分级：`packages/logix-core/test/Debug.DiagnosticsLevels.test.ts`
- devtools hub：`packages/logix-core/test/DevtoolsHub.test.ts`
