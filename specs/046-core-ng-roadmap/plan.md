# Implementation Plan: 046 After 045 路线图（core-ng 长期演进与切换门槛）

**Branch**: `046-core-ng-roadmap` | **Date**: 2025-12-27 | **Spec**: `specs/046-core-ng-roadmap/spec.md`  
**Input**: Feature specification from `specs/046-core-ng-roadmap/spec.md`

## Summary

目标：把 “After 045” 从 drafts 提升为 specs 级正式规划：在不引入并行真相源的前提下，给出**可扫描的里程碑与硬门槛**，明确：

- 做完 `specs/045-dual-kernel-contract/` 后应该怎么走（优先级/里程碑/退出条件）
- `specs/039-trait-converge-int-exec-evidence/` 的后续处置与复用策略
- core-ng 的进阶**不以** Vite/AOT 等工具链为前置条件；工具链作为可选加速器，按触发条件另立 spec 推进
- 046 作为 NG 路线“总控 spec”：用 spec registry 统一调度后续 NG specs（避免草案碎片与并行真相源）

## Questions Digest（plan-from-questions）

来源：外部问题清单（`$speckit plan-from-questions`）。

- Q001：`quickstart.md` 已完成可交付；验收口径写入 Phase 交付物说明。
- Q002/Q005：registry 可用性采用“人工 review + 清单”验收（`checklists/registry.md`），不引入 lint 脚本。
- Q004：M1.5（057 读状态车道）与 M2（045 US2/US3 渐进替换）可并行；roadmap 已注明。
- Q007：kernel support matrix 依赖 `speckit` 的 plan 模板提醒 + 046 清单验收，不新增强制 lint。
- Q008：M0 达标以“证据落盘后手工标记”为准（045 quickstart + perf evidence + contract harness），再回写 046 状态/入口。
- Q009/Q010：术语口径同步到 runtime glossary；M5/M6 与 registry 的 053/054/055（frozen；证据触发再启动）对齐。

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/*`（含 `@logix/core` / `@logix/react`）  
**Storage**: N/A（本特性产物为 specs 文档；不引入持久化）  
**Testing**: N/A（046 本身主要交付文档；验收采用人工 review：`specs/046-core-ng-roadmap/checklists/*`）。但 `Policy Update / 单内核默认（2025-12-31）` 触及 runtime 装配默认策略与 consumer 默认值：必须通过 `pnpm typecheck` / `pnpm lint` / `pnpm test`，并补齐 `$logix-perf-evidence`（默认路径 Node + Browser before/after/diff）  
**Target Platform**: Node.js 20+ + modern browsers（证据门禁包含 ≥1 条 headless browser 跑道）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: 对后续“切换默认内核/核心路径重写”的预算门槛：suites/budgets 统一以 matrix.json 为裁决（至少覆盖 `priority=P1`；硬结论至少 `profile=default`；以 perf diff 的 `comparability.comparable=true` 且 `summary.regressions==0` 作为默认判据）  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）、稳定锚点（`instanceId/txnSeq/opSeq`）、事务窗口禁 IO/async、`diagnostics=off` 近零成本、禁止使用 “v3” 残留叫法  
**Scale/Scope**: 本特性只交付“路线图与门槛”；不直接实现内核重写/优化本体

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于“Runtime 演进治理层”，目标是明确“Runtime 的内核替换/优化如何被证据化与契约化”，不改变业务侧 Intent/Flow 表达。
- **Docs-first & SSoT**：本路线图以 `specs/045-dual-kernel-contract/`（契约分支点）与 `specs/039-trait-converge-int-exec-evidence/`（热路径证据达标）为裁决锚点；NG 架构探索仍留在 `docs/specs/drafts/topics/logix-ng-architecture/`，不作为裁决。
- **Contracts**：不新增对外 API；只规定后续特性必须复用 Kernel Contract（045）与统一最小 IR/证据协议（005/016/020）。
- **IR & anchors**：不改变统一最小 IR；路线图把“跨内核对照验证”硬绑定到稳定锚点与可序列化证据。
- **Deterministic identity**：要求后续演进保持稳定 id 去随机化；任何漂移必须被对照验证 harness 捕获。
- **Transaction boundary**：路线图明确事务窗口禁 IO/async 不可破；任何跨线程/time-slicing 属于语义改变必须另立 spec（例如 043）。
- **Internal contracts & trial runs**：要求后续内核演进通过 Runtime Services/Kernel Contract 注入，避免 magic 字段扩散；并以 TrialRun/对照 harness 输出证据。
- **Performance budget**：路线图把 `$logix-perf-evidence`（Node + Browser）作为硬门槛，并要求阻断“半成品态”负优化。
- **Diagnosability & explainability**：要求 `diagnostics=off` 近零成本；若引入新的观测口径（例如采样）必须另立 spec（044）。
- **Breaking changes**：允许轻量迁移；但路线图要求用迁移说明替代兼容层，并把“切默认内核”作为带门槛的动作。
- **Public submodules**：本特性不改 `packages/*`；未来若新增 `@logix/core-ng` 能力扩面，必须遵守 public submodules 规范（由 045 已先行约束）。
- **Quality gates**：路线图要求未来所有核心路径变更至少通过 workspace 质量门（typecheck/lint/test），并对关键切换追加 perf evidence。

### Gate Result (Pre-Design)

- PASS（本特性主要交付治理与规划文档；但 `Policy Update / 单内核默认` 触及 runtime 装配默认策略：实现必须补齐 perf evidence + quality gates）

## Roadmap（After 045 一眼可见）

详见：`specs/046-core-ng-roadmap/roadmap.md`（本特性主要交付物）

## 039 的处置策略（写清楚“继续/冻结/复用”）

结论（路线图将固化）：

1. **短期（045 之后的首要）**：继续推进 `specs/039-trait-converge-int-exec-evidence/`，把当前内核的“整型执行链路 + 证据达标”做到可交付状态，作为你放心做平台的性能地基。
2. **中期（core-ng 逐步覆盖）**：039 的“证据跑道与 guardrails”复用为 core-ng 的负优化拦截门槛；core-ng 的实现可以选择复用/重写，但必须通过同口径对照验证与 perf diff。
3. **长期（core-ng 成为默认后）**：当不再需要继续投资当前内核的 converge 热路径时，039 可视为“达标冻结”并停止扩展；但 spec 与 perf 证据保留，作为历史裁决与回归对照基线（不删除）。

## Toolchain 决策：core-ng 是否必须上 Vite/AOT？

结论（路线图将固化）：

- **不必须**。core-ng 的前几个关键里程碑可以完全通过“运行时层面的契约注入 + 热路径整型化/零分配化 + 证据门禁”达成，不要求先引入 build-time 工具链。
- **AOT/编译工具链是可选加速器**：只有在证据显示“运行时解释成本已成为主导瓶颈且难以再降”时，才考虑引入；并且必须另立 feature spec 承载（防止把工具链长期税混入纯优化链路）。

触发条件（建议，作为后续新 spec 的入口）：

- profiler/evidence 显示关键开销来自“运行时解析/动态依赖采集/首次试跑构建”等解释层，且通过现有整型化/缓存/复用仍无法满足预算；
- Node 与 Browser 的证据都显示收益稳定（避免只在 Node 上成立）。

Guardrails（必须满足）：

- 仍然必须降解到统一最小 IR（Static IR + Dynamic Trace），并保留稳定锚点以支持解释与 diff；
- 必须有明确降级/回退口径（例如编译失败/不支持场景时回退到 runtime path），且该回退必须可证据化；
- 不引入业务侧“新概念开关”作为默认语义分岔。

## 对 041（docs inline playground）的影响与实施阶段

结论：

- `specs/041-docs-inline-playground/` 的总体目标与 core-ng 路线 **不冲突**；其教学 MVP（US1/US2/US3）默认仍以 `@logix/sandbox` + `@logix/core` 为底座即可，不需要等待 core-ng。
- 但在 046/宪章的“双内核演进 + 证据门禁”约束明确后，041 的实现计划需要补齐两类对齐点：
  - **稳定标识 & 证据口径**：文档侧必须显式传入确定性 `runId`（避免 `Date.now()` 默认值），并在 debug 面板中优先展示/透传 `TrialRunReport.environment.kernelImplementationRef`（以及与 trace 关联的稳定锚点：`instanceId/txnSeq/opSeq`），避免新增并行真相源。
  - **多 kernel 试跑能力（可选）**：若希望 041 的 debug 文档承担 core/core-ng 的对照演示，则需要 `@logix/sandbox` 支持“多 kernel 资产（或等价机制）+ 可选择运行内核”；这属于 M2（trial-run/test/dev 渐进替换）之前的基础设施整合，不是 041 MVP 的阻塞项。
    - 现实约束：当前 `packages/logix-sandbox/src/Client.ts` 仅有 `kernelUrl`（单 kernel）；若要在 docs playground 中做 core/core-ng 选择，需先把 SandboxClientConfig 扩展为“多 kernel variant（`kernelId → kernelUrl`）+ defaultKernelId”形态（详见：`specs/058-sandbox-multi-kernel/`）。
    - 备注：`docs/specs/drafts/topics/sandbox-runtime/25-sandbox-package-api.md` 中的 `kernelBlobUrls` 可作为“更协议化”的后续演进方向，但不应阻塞 041 MVP。
    - 建议：多 kernel 资产/选择能力应视为 Playground/Alignment Lab 的基础设施升级（`@logix/sandbox`），单独立 spec 承载并登记到 046 registry（见：`specs/058-sandbox-multi-kernel/`），避免把基础设施改造耦进 041 的 UI MVP。

建议实施阶段（按 046 里程碑）：

- **现在即可（不依赖 core-ng）**：041 的 US1–US3（教学闭环 + 编辑重跑 + 观察点/默认面板/i18n）。
- **M2 启动前（045 US2/US3 渐进替换开始时）**：补齐 041 的 “kernel 标识展示 +（可选）debug-only kernel 选择” 能力，使 docs Playground 能作为浏览器侧 trial-run/对照入口。
- **M1.5/057 之后**：再推进 041 的 US4 深度观测面板（Trace/Timeline/事件摘要），确保与 lane/fallbackReason/统一最小 IR/稳定锚点口径一致，避免 UI 先行定义口径导致漂移。

## Project Structure

### Documentation (this feature)

```text
specs/046-core-ng-roadmap/
├── spec.md
├── plan.md
├── roadmap.md           # 里程碑表 + 切换门槛（本特性主要交付）
├── spec-registry.json   # 关系 SSoT：members/依赖/状态（脚本可解析）
├── spec-registry.md     # 人读阐述：口径/注意事项/表格展示（不作为脚本输入）
├── research.md          # 关键裁决与取舍（工具链/039 处置/门槛）
├── quickstart.md        # 如何使用路线图（读者视角）
├── checklists/          # 046 自身的“人工验收清单”（避免总控退化为口头共识）
└── tasks.md             # 后续执行入口（生成下一批 specs/任务的顺序）
```

### Source Code (repository root)

```text
# 046 的主要交付仍是 specs 文档；但为避免“默认内核口径”漂移，Policy Update 会同步落地少量源码调整（默认单内核=core）。
packages/logix-core/src/Runtime.ts
packages/logix-core/src/internal/runtime/core/KernelRef.ts
packages/logix-react/test/browser/perf-boundaries/harness.ts
packages/logix-sandbox/
examples/logix-sandbox-mvp/

# 规划与引用既有 specs / drafts
specs/045-dual-kernel-contract/
specs/039-trait-converge-int-exec-evidence/
specs/043-trait-converge-time-slicing/
specs/044-trait-converge-diagnostics-sampling/
docs/specs/drafts/topics/logix-ng-architecture/
```

**Structure Decision**:

- 用 `specs/046-core-ng-roadmap/*` 固化“After 045”路线图与门槛，避免把裁决落在 drafts。
- 用 `specs/046-core-ng-roadmap/spec-registry.json` 固化“关系事实源”（members/依赖/状态）；用 `spec-registry.md` 做人读阐述（类型/证据门禁/kernel matrix 口径），避免路线推进退化为碎片化草案与口头共识。
- 所有实际实现仍由各自 feature spec 承载（例如 045/039/未来 core-ng 扩面 spec），本特性只给出顺序与 gate。

## Complexity Tracking

无（本特性不引入宪章违例；工具链与语义改变均要求另立 spec）

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（039 处置策略、core-ng 切默认门槛、工具链触发条件）
- **Phase 1（design）**：`roadmap.md`、`spec-registry.json`、`spec-registry.md`、`quickstart.md`、`checklists/*`（验收：按 quickstart 能在 3 步内定位 roadmap/registry/执行清单，并能回答 trial vs default 的判定）
- **Phase 2（tasks）**：`tasks.md`（跨 spec 调度入口）
