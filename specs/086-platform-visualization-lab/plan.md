# Implementation Plan: Platform Visualization Lab（086 · examples/logix-react 的独立可视化 POC）

**Branch**: `086-platform-visualization-lab` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature spec from `specs/086-platform-visualization-lab/spec.md`

## Summary

在 `examples/logix-react` 增加 `/platform-viz/*` 路由组，把 `@logixjs/core` 已有的 IR / Gate 输出做成“独立颗粒度”的可视化能力块：

- Manifest Inspector：`Logix.Reflection.extractManifest`
- Manifest Diff Viewer：`Logix.Reflection.diffManifest`
- TrialRun Evidence：复用现有 `/trial-run-evidence` 页面（提供直达入口）

目标是：提前验证平台/Devtools 需要的“解释粒度、信息架构、字段稳定性”，并作为 IR 变更的 UI 回归面；不在本特性内实现 Node-only 的 Parser/Rewriter/Write-back。

## Deepening Notes（关键裁决）

- Decision: Diff Viewer 同时支持“模块选择（内部 extract）/JSON 粘贴”两类输入 (source: spec clarify AUTO)。
- Decision: Manifest Inspector 仅支持“模块选择（内部 extract）”输入 (source: spec clarify AUTO)。
- Decision: Manifest/Diff 两页都暴露 `includeStaticIr` 与 `budgets.maxBytes`（默认都 off）(source: spec clarify AUTO)。
- Decision: Diff Viewer 的 before/after 共用同一组选项以保持可比性 (source: spec clarify AUTO)。
- Decision: JSON 粘贴仅做最小校验；失败必须可解释并阻止计算 (source: spec clarify AUTO)。
- Decision: 缺失/未来字段用固定 pending 清单提示（078/031/035/081/082/085）(source: spec clarify AUTO)。
- Decision: Raw JSON 以 pretty JSON 展示并提供一键复制 (source: spec clarify AUTO)。

## Technical Context

**Language/Version**: TypeScript + React 19（Vite）  
**Primary Dependencies**: `@logixjs/core`（Reflection / Observability）、`@logixjs/devtools-react`（已接入）、`react-router-dom`  
**Storage**: N/A（仅浏览器内可视化；不落盘工件）  
**Testing**: 以 `examples/logix-react` 的 `tsc --noEmit` 类型检查为最小门槛；本特性不新增单测  
**Target Platform**: modern browsers（Node-only 依赖禁止进入 bundle）  
**Project Type**: pnpm workspace（examples）  
**Performance Goals**: UI 不引入明显卡顿；Raw JSON 视图可滚动，可通过 budgets 演示裁剪  
**Constraints**:

- 只消费 JSON-safe 输出（Manifest/Diff/Evidence summary）；不引入 `ts-morph/swc/fs` 等 Node-only
- 输出/展示必须稳定（不在 UI 侧引入随机字段），方便做截图/回归对比
- 可选字段缺失需显式提示（例如 `servicePorts` pending 078）

## Constitution Check（本特性口径）

- **不触及 runtime 热路径**：只在 example UI 层消费 `Reflection.*` 输出；不改 `packages/logix-core` 行为。
- **IR 统一口径**：可视化以 `Reflection.extractManifest/diffManifest` 的输出结构为唯一事实源；不在 UI 内自定义并行字段。
- **Node-only 隔离**：浏览器侧禁止引入 Parser/Rewriter/CLI 的依赖与文件读写。
- **可解释降级**：展示层对缺失字段/裁剪（maxBytes）做显式提示，避免误判为 bug。

## Perf Evidence Plan

N/A（仅 example UI；不改 runtime 热路径）。  
如后续把该可视化迁入 `packages/logix-devtools-react` 或引入大型 JSON/渲染压力，再按 `$logix-perf-evidence` 建立基线。

## Project Structure

### Documentation (this feature)

```text
specs/086-platform-visualization-lab/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── ui-routes.md
```

### Source Code

```text
examples/logix-react/src/
├── App.tsx
└── demos/
    └── platform-viz/
        ├── PlatformVizIndex.tsx
        ├── ManifestInspector.tsx
        ├── ManifestDiffViewer.tsx
        └── shared.tsx
```

## Quality Gates（本特性的最小门槛）

- `pnpm -C examples/logix-react typecheck` 通过（保证 TS/React/Router 类型不破）
