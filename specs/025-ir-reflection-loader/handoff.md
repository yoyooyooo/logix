# Handoff: 025 IR Reflection Loader（IR 反射与试运行提取）

**Date**: 2025-12-25  
**Spec**: `specs/025-ir-reflection-loader/spec.md`

## 交付物（What shipped）

- `@logixjs/core`：
  - `Reflection.extractManifest` / `Reflection.exportStaticIr`：导出可序列化、可 diff 的 `ModuleManifest` / `StaticIR`（不读 AST）。
  - `Reflection.diffManifest`：结构化 diff（CI gate 与 UI 共享口径，含 verdict + changes[]）。
  - `Observability.trialRunModule`：在 BuildEnv 中对 module 做受控试跑，导出 `TrialRunReport`（Environment IR + 控制面证据 + 可选事件序列）。
- PoC UI（demo）：
  - `examples/logix-sandbox-mvp` 新增 `/ir`：展示 Manifest/Diff/StaticIR/TrialRunReport/ControlPlane/Timeline，并支持 Import + presets + 一键重跑。
- 脚本与证据：
  - `scripts/ir/inspect-module.ts`：对 program module 产出 `module-manifest.json` + `trial-run-report.json`，支持 `--compareDir` 做可复跑比对（CI smoke）。
  - 性能基线：`pnpm perf bench:025:trialRunModule` + `specs/025-ir-reflection-loader/perf.md` + `specs/025-ir-reflection-loader/perf/after.worktree.json`。

## 关键裁决（Decisions）

- **统一最小 IR**：对外只交付 `ModuleManifest`（结构摘要）+ `StaticIR`（依赖图）+ `TrialRunReport`（受控试跑摘要与证据）。
- **确定性**：
  - `ModuleManifest.digest` 只由结构字段决定（不含 meta/source），用于 CI 降噪；
  - diff 输出（`changes[]`）稳定排序；
  - Trial Run 在 CI/平台场景必须显式提供 `runId`（避免不可对比的隐式标识）。
- **错误分类**：Trial Run 把失败归类为 `MissingDependency / TrialRunTimeout / DisposeTimeout / Oversized / RuntimeFailure`，并要求给出可行动 hint。
- **控制面证据**：覆写解释必须复用 `RuntimeServicesEvidence`（scope/bindings/overridesApplied），避免平台另起一套真相源。

## 使用入口（How to use）

- Inspect（推荐载体）：`specs/025-ir-reflection-loader/quickstart.md` 的 “0) inspect program module”。
- 试跑 API：`Logix.Observability.trialRunModule(AppRoot, { runId, buildEnv, ... })`。
- CI diff：`Logix.Reflection.diffManifest(before, after)`。

## 已知注意点（Notes）

- Trial Run 的语义是“受控窗口 + 可靠收束”，不承诺自动跑完业务逻辑；模块内部可能存在常驻监听，必须通过 scope close 统一收束。
- `RunSession` 的显式 `runId` 覆写需要 Layer 顺序允许覆盖：本次实现已调整 `RunSession.runSessionLayer()` 的合并顺序，确保调用方提供的 session 不会被默认值盖掉。
- Trial Run 缺失依赖提取：缺失配置优先从 Effect v3 的结构化 `ConfigError.path` 提取（再兜底解析错误文本），降低 Effect 升级导致 error message 变更的脆弱性；缺失服务仍依赖 `Service not found:` 的 message 兜底。
