# Implementation Plan: 统一观测协议与聚合引擎（组件+插件优先，core 打底）

**Branch**: `005-unify-observability-protocol` | **Date**: 2025-12-13 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/005-unify-observability-protocol/spec.md`  
**Input**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/005-unify-observability-protocol/spec.md`

## Summary

目标是先把“宿主无关的观测协议 + 聚合引擎”下沉到 `@logix/core`，然后同时交付两种宿主：
应用内嵌 Devtools（组件形态）与 Chrome 扩展 Devtools（独立窗口）。两者消费同一份事件流/证据包时，核心计数与时间线顺序一致；并保持对被测页面的干扰可控。

## Technical Context

**Language/Version**: TypeScript（pnpm workspace / monorepo）  
**Primary Dependencies**: `effect` v3、`@logix/core` / `@logix/react` / `@logix/devtools-react`、React、Vite（示例/工具链）、Chrome Extension (Manifest V3)  
**Storage**: N/A（证据包导出/导入以文件或剪贴板为主；运行中以内存 ring buffer / 聚合快照为主）  
**Testing**: Vitest（含 `@effect/vitest` 约定）、TypeScript typecheck、ESLint  
**Target Platform**: 浏览器（Chrome 及兼容环境），包含页面主线程与 Web Worker；扩展需要 MV3  
**Project Type**: Monorepo packages + examples  
**Performance Goals**: 参照 `spec.md` 的 SC-001/SC-003：被测页面关键交互延迟增幅 ≤10%，面板常用操作 200ms 内可见结果；10k 事件证据包导入后 5s 内可筛选/查看  
**Constraints**: Devtools UI 状态与副作用以 Logix Runtime 管理（避免巨型 React store）；高频事件需背压/降级且对用户可见；禁止 watch 模式测试  
**Scale/Scope**: 第一阶段只保证“组件 + 插件”两端一致性与最小控制命令（清空/暂停/恢复），Playground/Sandbox 仅做可选验证路径

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**  
  - 本特性属于 Runtime 可观测性契约：将 Logix/Effect 运行行为抽象为可传输的观测事件流，并由聚合引擎生成可视化所需快照；Devtools/插件/Playground 都是该契约的消费者。
- **依赖/修改的 SSoT 文档（docs-first）**  
  - 需要补充或更新：`docs/specs/runtime-logix/core/09-debugging.md`（新增“宿主无关协议/聚合、runId/seq、导出导入边界、扩展连接边界”）。  
  - Sandbox/Playground 若要对齐：优先回写到 `docs/specs/runtime-logix` 的调试/观测章节，再在 drafts 中保留实验细节。
- **契约变更范围**  
  - 会新增/调整 “观测事件 envelope（runId/seq/version）” 与 “宿主无关聚合快照” 的公共契约；核心落点应在 `@logix/core`（引擎优先），并在 runtime-logix 文档中固化。
- **质量门槛（Pass 定义）**  
  - 必跑：`pnpm typecheck`、`pnpm lint`。  
  - 与本特性直接相关的包：`pnpm -C packages/logix-core test`、`pnpm -C packages/logix-devtools-react test`（如存在/可行），以及必要的协议/聚合单测。  
  - Pass：无新增类型错误、无新增 lint 错误、核心聚合/协议的单测通过。
- **Phase 1 复查（2025-12-13）**  
  - 已产出并固化协议/聚合的契约草案（`research.md` / `data-model.md` / `contracts/*`），与“引擎优先”一致。  
  - 合入实现前仍需按 docs-first 更新 `docs/specs/runtime-logix/core/09-debugging.md`，以避免契约只存在于代码中。

## Phases（初步拆解）

### Phase 0（Research）：把“能落地”变成可执行约束

- 明确 Chrome 扩展到页面的连接边界（devtools page / background / content-script / window.postMessage 的最小链路与限制）。
- 明确 “同一 runId 的 seq 由谁生成/在哪里生成” 的落点：必须在运行环境侧，避免查看器补造导致跨宿主不一致。
- 明确 “原始数据保留” 与 “不可序列化 payload” 的可预测降级策略（不做风险提示，但要保证导出/导入不崩溃）。
- 明确背压/降级策略在协议层的表达（例如 drop/summary/按需详情），并与 SC-001 的“低干扰”目标对齐。

### Phase 1（Design & Contracts）：core 打底 + 宿主适配

- 在 `@logix/core` 定义并实现：
  - 宿主无关协议（事件/命令/证据包的最低必要结构，含 version/runId/seq/timestamp）。  
  - 宿主无关聚合引擎：输入事件流/证据包，输出用于 Devtools 视图的聚合快照（满足 FR-011）。  
  - 与现有 DebugSink/DevtoolsHub 的适配层（把现有 Debug.Event、trace:* 事件等装入统一 envelope）。
- 在 `@logix/devtools-react` 抽离 “数据源适配”：
  - 组件形态：直接连接 page 内数据源；  
  - 插件形态：连接扩展通道的远程数据源；  
  - UI 层与聚合层复用同一逻辑与快照结构。
- Sandbox/Playground（可选）：将 `packages/logix-sandbox` 的 `SandboxEvent` 与统一协议对齐（至少补齐 runId/seq），作为 Worker 场景验证入口。

### Phase 2（准备进入 /speckit.tasks）：按 FR 拆成可独立交付任务

- 以 FR-002/FR-011 为主线：先完成 core 协议与聚合，再分别落地组件宿主与插件宿主。

## Project Structure

### Documentation（本特性）

```text
specs/005-unify-observability-protocol/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code（相关目录）

```text
packages/
├── logix-core/                 # 观测协议/聚合引擎的核心落点（本特性主战场）
├── logix-devtools-react/       # 组件形态 Devtools UI（抽离数据源适配后也可复用到插件）
├── logix-react/                # RuntimeProvider 等 React 适配（可能需要补充 hooks/bridge）
├── logix-sandbox/              # Host↔Worker 协议（可选对齐统一协议）
└── logix-devtools-chrome/      # [计划新增] Chrome 扩展壳（MV3），复用 devtools UI + 协议/聚合

examples/
└── logix-sandbox-mvp/          # Worker 场景验证（可选）

docs/specs/runtime-logix/
└── core/09-debugging.md        # [计划更新] 观测/调试契约（SSoT）
```

**Structure Decision**: 保持 monorepo 分包；协议/聚合引擎下沉到 `packages/logix-core`，宿主形态差异仅体现为 transport 与 data-source adapter；Chrome 扩展作为独立包承载构建与 MV3 资源，但 UI 与聚合层复用现有 devtools 资产。
