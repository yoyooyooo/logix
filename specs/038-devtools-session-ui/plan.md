# Implementation Plan: Devtools Session‑First 界面重设计（因果锚点驱动的会话树 + Advisor 工作台）

**Branch**: `[038-devtools-session-ui]` | **Date**: 2025-12-27 | **Spec**: `specs/038-devtools-session-ui/spec.md`
**Input**: Feature specification from `specs/038-devtools-session-ui/spec.md`

## Summary

本特性以 07/08 的范式（Session First + Advisor + 脉冲/收敛）为核心，把 Devtools 的默认入口从“流水账 timeline”改为“交互会话工作台（Master‑Detail）”，并把“因果锚点尽可能关联”固化为可实现、可退化、可解释的聚合链路：

1. **Session First UI**：左侧展示“会话条目（可合并/可树状）”，右侧是会话详情工作台（概览/Advisor/脉冲/二级视图 Timeline+Inspector）。Timeline 退为二级视图，但必须与会话范围联动且可回到全局。
2. **Anchor‑Driven Aggregation**：会话聚合以稳定锚点优先级驱动：`linkId`（首选）→ `txnId/txnSeq`（次选）→ 时间窗（退化）。聚合结果必须输出 `confidence` 与 `degradedReason`，避免“错聚合但看不出来”。
3. **Swimlanes + Pulse（务实主视图）**：不强行画因果图（Graph UI）；右侧主要工作区采用“基于 `txnId` 的泳道（Swimlanes）+ 脉冲（Pulse）”，左侧会话列表升级为“监控墙”（Card + 微型 Sparkline），让用户不点开也能扫视出灾难会话。
4. **Advisor（处方 + 证据）**：复用/扩展现有 converge 审计能力，把 Finding 统一为可解释卡片（结论/证据/建议），并确保每条结论可下钻到对应锚点范围的事件切片。
5. **离线确定性**：证据包导入后生成的会话数量/范围/指标必须确定（同一输入同一输出），并用 `contracts/schemas/*` 固化会话与 Finding 的输出形态，便于自动化回归。

## Functional Review Absorption（2025-12-27）

来自 `functional-review.md` 的关键裁决与吸收点（作为本计划的补充约束）：

- **信任优先**：锚点回退（`linkId → txnId → window`）+ `confidence/degradedReason` 是产品信任底座；宁可“展示更少、明确退化”，也禁止制造“虚假的确定性”（尤其不要为了好看而暗示因果）。
- **处方优先**：`AdvisorFinding`（结论 + 证据 + 建议）是“10 秒定位根因”的核心交付，不是可选装饰；MVP 设计应优先覆盖常见高价值反模式（例如 waterfall/degraded/unknown_write），减少用户在大 Session 中依赖手动搜索。
- **Swimlanes 路线确认**：`txnId` 泳道作为主工作区优先级高于 Graph UI（Graph 易退化为面条怪兽且数据骨架不足时误导）。
- **已知风险（MVP 可接受）**：搜索/过滤先做基础文本过滤即可；超大 Session（1000+ 事件）可能需要更精细的字段/事件/来源过滤，但优先用 Advisor 吃掉大部分定位需求。
- **潜在后续（非 MVP）**：会话对比（Diff/Comparison）属于 P2/P3 的价值增量方向，可在完成离线确定性与核心视图后追加。

## UI & Interaction Design

本次是“主入口范式重排 + 视图模型重算”的重构级工作，UI/交互的裁决不只写在文字里，而是固化到可交接产物：

- 主布局与交互：`specs/038-devtools-session-ui/ui.md`（Session Navigator + Session Workbench；右侧用 Pulse + Txn Swimlanes，左侧用 Session Cards + MicroSparkline；并包含 **D.I.D 反审美崩坏指南** 作为实现级硬约束）。
- 主题 Token（实现约束）：在 `packages/logix-devtools-react/src/internal/theme/theme.css` 补齐 `--intent-data-flow/--intent-data-impact/--intent-highlight-focus/--intent-focus-glow` 等（见 `ui.md` §8.2），避免组件内硬编码颜色与“红绿灯谬误”。
- 输出口径（可回归）：`specs/038-devtools-session-ui/contracts/schemas/*`（Session/Node/Finding/EvidenceRef）。
- 语义模型：`specs/038-devtools-session-ui/data-model.md`（会话/节点/锚点/证据引用）。

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: `effect` v3（workspace override 固定到 3.19.13）、`@logixjs/core`、`@logixjs/react`、`@logixjs/devtools-react`、React 19  
**Storage**: N/A（Devtools 内存态；证据包 import/export 为 JSON 工件）  
**Testing**: Vitest（`vitest run`）；Effect-heavy 用例优先 `@effect/vitest`；UI 交互测试使用现有 Vitest + DOM 环境能力  
**Target Platform**: Node.js 20+（构建/测试）；现代浏览器（Devtools UI）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- 会话生成延迟：一次典型交互后（产生 ≥1 次提交），会话列表在 200ms 内出现新会话（对齐 `SC-001`）。
- 交互流畅度：对 500 条规模离线证据包，切换会话/视图单次交互冻结 ≤ 200ms（对齐 `SC-003`）。
- 增量计算：Snapshot 更新时，派生会话/指标/Advisor 必须避免全量重算与高频拷贝，优先基于 `snapshotToken` 与事件序列做增量更新（均摊 O(Δevents)）。

**Constraints**:

- 统一最小 IR：Devtools 只消费 `DevtoolsSnapshot`（Dynamic Trace）与其可序列化证据；会话/树/Advisor 为派生视图，必须可由输入事件完全重建（禁止并行真相源）。
- 锚点稳定：`instanceId/txnSeq/txnId/eventSeq/opSeq/linkId`（或等价）必须稳定可复现；会话/节点 id 必须确定性派生（禁止随机/时间作为身份来源）。
- 诊断载荷 Slim：事件 `meta` 必须是 `JsonValue` 且可裁剪；`diagnostics=off` 时额外开销接近零（宪章硬约束）。
- 事务窗口禁 IO：本特性不引入任何事务内 IO/await；如需补锚点，仅允许“常数级字段注入”。

**Scale/Scope**: 多 Runtime/Module/Instance 并存的 ToB 复杂场景；单面板事件窗口通常为数百条（ring buffer 默认窗口），并支持离线证据包导入。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：用户（Devtools）→ 会话/Advisor（UI 派生）→ 消费 `DevtoolsSnapshot`（Debug 事件/State 视图）→ Runtime 侧通过 Debug/EffectOp/Txn 产出稳定锚点与可序列化 trace。
- 依赖/对齐的 specs 与草案：
  - `docs/specs/drafts/topics/devtools-and-studio/07-devtools-vision-rethink.md`、`08-devtools-ui-design.md`（范式与 UI 结构裁决）
  - `specs/016-serializable-diagnostics-and-identity`（`RuntimeDebugEventRef`/稳定标识/可序列化事件）
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.02-eventref.md`（事件协议单一事实源）
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.05-effectop.md`（`linkId` 语义）
- Effect/Logix contracts：本计划优先通过 `specs/038-devtools-session-ui/contracts/schemas/*` 固化“会话/Advisor 输出口径”。若需要补齐 `RuntimeDebugEventRef.linkId` 等锚点字段，必须同步更新 runtime‑logix 的事件协议文档与序列化测试（加字段、保序列化、保持 Slim）。
- IR & anchors：会话/树/Advisor 必须可由 `DevtoolsSnapshot.events` 重建；必要时只扩展 `RuntimeDebugEventRef` 的小字段（`linkId` 等），不引入并行聚合事实源。
- Deterministic identity：
  - `sessionId` 首选 `linkId`（跨 txn/跨模块的链路锚点）；
  - 若缺失 `linkId`，退化为 `txnId`；若仍缺失，则按事件序列构造确定性的 `windowId`（并输出 `degradedReason`）。
  - 节点 id 统一使用可读可比较的派生规则（例如 `${sessionId}::txn:${txnId}`）。
- Transaction boundary：不修改事务边界语义；如在 Runtime 侧补锚点，仅允许常数级字段注入，不引入 IO/await 与 O(n) 扫描。
- Internal contracts & trial runs：会话派生逻辑必须是纯函数/可注入（可用 evidence package 驱动测试）；导入/导出必须保留派生确定性（`SC-006`）。
- Performance budget：
  - 热点主要在 Devtools compute（事件索引/聚合/Advisor）与 React 渲染；必须以 `snapshotToken` 增量更新与结构共享避免退化。
  - 若触及 core 的事件协议/字段注入，基线优先复用 `specs/016` 的诊断序列化与诊断开销口径，并在任务阶段补齐可复现测量（满足宪章“证据优先”）。
- Diagnosability & explainability：会话条目必须给出“为何 warn/danger/为何退化”的证据链；并保留一键下钻到 raw timeline/inspector 的自证路径，避免误导。
- Breaking changes：尽量以“可选字段新增”方式扩展协议；若不得不重排/更名字段，直接破坏式更新并在 `tasks.md` 补迁移说明（不做兼容层）。
- Public submodules：若改动 `packages/*` 的对外面，遵守 public submodules 约束；新增实现下沉到 `src/internal/**`，避免暴露内部细节。
- 质量门：完成实现前必须通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；并确保本特性的 `contracts/*` 与文档命名口径一致、无漂移。

## Project Structure

### Documentation (this feature)

```text
specs/038-devtools-session-ui/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── ui.md
├── quickstart.md
├── contracts/
│   └── schemas/
└── tasks.md             # Phase 2 output ($speckit tasks)
```

### Source Code (repository root)

```text
packages/logix-devtools-react/src/internal/ui/shell/DevtoolsShell.tsx
packages/logix-devtools-react/src/internal/ui/session/*              # 新增：会话列表/树、工作台、Advisor 卡片、脉冲视图
packages/logix-devtools-react/src/internal/ui/timeline/*             # 既有：二级视图（按会话范围过滤）
packages/logix-devtools-react/src/internal/ui/inspector/*            # 既有：二级视图（按会话范围过滤）
packages/logix-devtools-react/src/internal/state/compute.ts          # 关键：从 snapshot 派生 Session/Tree/Advisor 视图模型
packages/logix-devtools-react/src/internal/state/model.ts
packages/logix-devtools-react/src/internal/state/logic.ts
packages/logix-devtools-react/src/internal/state/converge/*          # 复用/扩展：Advisor 规则与证据提取

packages/logix-core/src/internal/runtime/core/DebugSink.ts            # 可选：补齐 RuntimeDebugEventRef 的锚点字段（linkId/opSeq 等）
packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts          # 参考：snapshotToken/ring buffer 语义（尽量不改）
packages/logix-core/src/internal/runtime/core/ModuleRuntime.*.ts      # 可选：在 action/state 事件上注入 linkId 等锚点

.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.02-eventref.md
```

**Structure Decision**: 本特性属于“Devtools UI + 可诊断性协议/锚点补齐”交付：主要改动在 `packages/logix-devtools-react` 的视图与派生计算；若现有 Debug 事件缺少必要锚点（例如 action/state 事件缺 `linkId` 导致无法稳定归因），则以“最小协议扩展”的方式在 `packages/logix-core` 补齐，并同步更新 runtime‑logix 的事件协议文档（不做兼容层）。

## Refactor Scope

这次工作本质上是 “Devtools 入口与信息架构重排”，落地时会体现在三类重构：

1. **UI Shell 重排**：默认主视图从 timeline-first 切到 session-first；timeline/inspector 变为会话工作台的二级视图（仍保留全局视角入口，避免误导与便于自证）。
2. **State Derivation 重排**：新增 Session/Node/Finding 的派生视图模型与索引，驱动“会话卡片 + 微型 Sparkline / 会话内脉冲 / Txn 泳道 / Advisor”；并要求按 `snapshotToken` 增量更新，避免全量重算导致卡顿（对齐 `SC-003`）。
3. **锚点协议补齐（P0 必做）**：将 `linkId` 提拔为 `RuntimeDebugEventRef` 的一等字段，并让消费侧优先使用 `ref.linkId`（必要时对 `trace:*` 从 `data.meta.linkId` 兜底提取），避免 UI 侧深入 meta。注意：`linkId` 并不保证出现在所有事件种类上（尤其是高频 `state:update`），会话聚合必须始终支持 `txnId/txnSeq` 与 window 退化，并用 `confidence/degradedReason` 明示不确定性。

## Delivery Milestones（用于拆 tasks 的骨架）

- **M0：Runtime 协议升级（linkId 一等字段）**
  - 输出：`RuntimeDebugEventRef` 增加可选 `linkId`（必要时补 `opSeq`）；Runtime 在 `trace:effectop` 等具备链路语义的事件上注入/传播该字段，`toRuntimeDebugEventRef` 将其提拔为一等字段并对 `trace:*` 做兜底提取；同步更新 runtime‑logix 事件协议文档与序列化测试。
  - 验收对齐：`FR-001`（会话聚合可信度）、`SC-006`（确定性）。

- **M1：Session Card 监控墙 + Live/Pinned（可用 MVP）**
  - 输出：左侧会话列表改为 Card，并在每条会话下方渲染微型 Sparkline（Txn=Activity/Flow，Render=Cost/Impact，使用 data intent tokens）；点选会话进入 Pinned，并提供 Back to live；右侧先交付概览 + 脉冲（占位或最小可用）。
  - 验收对齐：`FR-001`~`FR-006`、`FR-007`、`SC-001`。

- **M2：Txn Swimlanes（主要工作区）**
  - 输出：右侧主时间轴从平铺事件改为 `groupBy(txnId)` 的泳道布局：泳道容器分组、仅 state:update 的 txn 默认折叠、含 converge 证据的泳道高亮（指示条/表面着色，禁止“金色边框”）；并与二级 Timeline/Inspector 联动过滤。
  - 验收对齐：`FR-005`、`FR-007`、`SC-003`。

- **M3：Advisor Hero + Evidence Pin**
  - 输出：danger 会话显示 Header 状态流转的 Hero（渗色 + 大白话结论，禁止额外大块 Banner），点击后在泳道中高亮对应事件/范围；至少覆盖 3 类高价值 finding（waterfall / degraded / unknown_write）。
  - 验收对齐：`FR-008`、`SC-004`、`SC-002`。

- **M4：离线确定性 + 回归用例**
  - 输出：导入同一 evidence package 会话数/范围/指标确定；增加针对会话聚合、退化标注、泳道折叠/高亮与 finding 证据跳转的自动化回归（覆盖 `SC-006`）。
