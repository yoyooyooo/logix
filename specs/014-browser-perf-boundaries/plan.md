# Implementation Plan: 014 浏览器压测基线与性能边界地图

**Branch**: `[014-browser-perf-boundaries]` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/014-browser-perf-boundaries/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

以 `vitest` 浏览器模式的“大颗粒度长链路集成测试”作为主跑道，建立一套可复用的性能边界地图（Perf Boundary Map）：

- 固化一份“压力维度矩阵”（SSoT）与稳定的结构化报告（JSON）；
- 将“基线（baseline）/上限（limit）”的可衡量指标固化到本地文件（`specs/014-browser-perf-boundaries/perf/*`），用于后续迭代对照；
- 提供 Before/After diff 的最小归因线索（从哪个维度/哪个档位开始回归、绝对预算与相对预算是否越界）；
- 与对外性能心智模型（013）保持同一套关键词与证据字段口径，但 014 面向未来复用，不只服务 013。
- 014 的 MVP 不阻塞于 013：与 013 能力强绑定的点位（如 `convergeMode=auto`、`runtime.decisionMs`、planner cache 证据）在能力未落地前允许 `unavailable + reason`，后续只需重跑即可纳入同一套边界地图与门禁。

同时，014 被视为“性能优化相关需求的极限框架”：统一裁决 `matrix.json + PerfReport + PerfDiff` 的语义与工具链，后续特性应优先复用 014 的协议与脚本，并把各自的 Before/After/Diff 证据落到 `specs/<id>/perf/*`（014 提供框架，不承包所有特性的证据归档）。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js 20+  
**Primary Dependencies**: `effect@^3.19.8`、`@logixjs/core`、`@logixjs/react`、Vitest 4（`@vitest/browser` + `@vitest/browser-playwright` + Playwright Chromium）、`vitest-browser-react`  
**Storage**: 运行时无持久化；基线/报告以仓库内文件固化（`specs/014-browser-perf-boundaries/perf/*`）  
**Testing**: Vitest browser mode（集成测试主跑道；不使用 watch）；可选 Node preflight（contract/schema + budget 语义回归，默认不作为 CI 门禁，仅在显式开关启用时运行，例如 `LOGIX_PREFLIGHT=1`）；必要时辅以少量 Node micro-benchmark（仅作辅证）  
**Target Platform**: modern browsers（默认 Chromium headless）+ Node.js 20+（采集/对比脚本）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**:

- 报告必须同时支持：
  - 绝对预算（如 p95 ≤ 16/50/100ms）下的边界阈值（最大可承受档位）；
  - 相对预算（如 `auto/full ≤ 1.05`）下的门槛判定与越界定位（配对规则：除 ref 轴外其余 params 必须一致；缺失/timeout/unavailable 必须显式输出 reason）；
- 报告必须固定输出中位数与 p95，并包含 runs/warmup/采样口径与环境元信息（可解释、可复现）；
- 报告必须固化 stability 阈值（重复运行容忍范围）并写入 meta.config，供后续迭代同机对照；
- 报告默认不固化每次 run 的原始 `samples`（只写 stats：median/p95），需要分布诊断时才开启样本采集开关并在 meta 中可解释区分；
- 基线与上限指标固化为本地文件，便于后续改动做同机对照（Before/After）。

**Constraints**:

- 默认 headless 且可自动结束（禁止 watch/交互驻留）；超时/失败必须落到报告里（不可静默）；
- 术语与证据字段与 013 对外心智模型对齐（Transaction / Patch/Dirty-set / Converge Mode / Diagnostics Level / Module Override 等）；
- 诊断分档的开销必须可量化且可区分（测量开销 vs 被测系统开销）；
- 当出现越界/显著回归时，diff 必须输出 1–3 条“手动杠杆提示”（结构化 recommendations，带稳定 id），以便被文档引用与复用；
- 当某些证据字段在当前系统/档位不可得时，必须显式标注 “unavailable + reason”，避免误读。

**Scale/Scope**:

- 默认矩阵需可在合理时间内完成（通过配置缩放 runs/档位数/维度子集）；
- 先保证“可对比边界地图 + 固化基线 + diff”，再逐步扩展矩阵覆盖面（负优化边界、并发/挂起、诊断分档等）。

## Constitution Check

*GATE: Must pass before implementation. Re-check after Phase 1 design.*

- 本特性把“性能预算与回归防线”变成可执行资产：维度矩阵 + 报告 schema + 本地基线文件（Before/After 可对比）。
- 术语与证据字段必须与对外心智模型一致：014 的报告口径与 013 的关键词集合共用，不得同义词漂移。
- 默认零/近零成本诊断：off/light/full 分档的测量必须能区分并量化 overhead；关闭时不得被输出噪声污染。
- 负优化边界地图：高基数/低命中率、重复 pattern 命中、图变化失效、列表/动态行归一化等场景必须可执行覆盖。
- 无隐藏魔法值：预算/阈值/样本策略/超时策略必须可配置且写入报告元信息。

### Answers (Pre-Implementation)

- **Intent → Flow/Logix → Code → Runtime**：014 属于“回归防线基础设施”，目标是让任何 runtime 改动都能通过同一套浏览器端长链路用例输出可对比证据；不引入第二套运行时真相源。
- **Docs-first & SSoT**：矩阵与报告 schema 的 SSoT 统一为 `@logixjs/perf-evidence/assets/*`（物理：`.codex/skills/logix-perf-evidence/assets/*`）；runtime 文档中已有的浏览器基线（watcher）明确作为其中一个维度示例（已互引）。
- **Contracts**：本特性的“结构化报告 JSON”本身是对外契约的一部分（字段语义稳定、可序列化）；后续以 feature 内 schema 文件固化并版本化。
- **Performance budget**：预算以绝对 ms 与相对 ratio 两类表达，并要求在报告中给出阈值与越界档位定位；Before/After 对照以同机同配置为主。
- **Negative boundary map**：将负优化对抗场景纳入矩阵，并要求输出资源上界证据（cache hit/miss/evict/invalidate/cut-off 等；不可得则显式标注）。
- **Quality gates**：合并前门禁仍以 `pnpm typecheck`、`pnpm lint`、`pnpm test`（含 browser project）为主；Node preflight（contract/semantics）默认不作为 CI 门禁（仅在显式开关启用时运行，例如 `LOGIX_PREFLIGHT=1`）；禁止 watch 模式。

### Re-check (Post-Design)

- 维度矩阵（含 stability 阈值、负优化主轴 `uniquePatternPoolSize` 与反直觉 patternKind）已固化到 `@logixjs/perf-evidence/assets/matrix.json`；report/diff schema 已固化到 `@logixjs/perf-evidence/assets/schemas/*` 并补齐 evidence/comparisons/recommendations 落点。
- research/data-model/quickstart 已生成，且 plan/spec 不存在未决 “NEEDS CLARIFICATION”；宪法门槛（可复现测量 + 本地基线 + 负优化边界地图）具备可执行落点。

## Project Structure

### Documentation (this feature)

```text
specs/014-browser-perf-boundaries/
├── spec.md
├── research.md             # Phase 0：决策与备选方案固化
├── plan.md
├── tasks.md
├── data-model.md           # Phase 1：报告/矩阵的数据实体与关系（schema 为最终裁决）
├── matrix.json              # 镜像（SSoT：`@logixjs/perf-evidence/assets/matrix.json`）
├── contracts/               # 镜像（SSoT：`@logixjs/perf-evidence/assets/schemas/*`）
├── quickstart.md           # Phase 1：运行/落盘/对比的最短闭环说明
├── perf.md                 # 本地基线/上限指标记录模板（Before/After）
├── perf/                   # 固化的原始证据（JSON/TXT）；同机对照
└── checklists/
```

### Source Code (repository root)

```text
packages/logix-react/
├── vitest.config.ts                         # 已有 browser project（chromium + playwright）
├── test/perf-boundaries/                    # 可选 Node preflight（contract/semantics；默认不作为 CI 门禁；需显式开关启用）
└── test/browser/
    ├── watcher-browser-perf.test.tsx        # 已有维度示例（watcher 延迟基线）
    └── perf-boundaries/                     # 014 的矩阵用例（计划新增）

.codex/skills/logix-perf-evidence/
├── assets/matrix.json                       # 维度矩阵（代码侧 SSoT；供 browser 用例 import）
├── assets/schemas/perf-report.schema.json   # 报告 schema（代码侧 SSoT）
├── assets/schemas/perf-diff.schema.json     # diff schema（代码侧 SSoT）
├── scripts/collect.ts                       # 采集：跑 browser project + 提取报告 + 落盘（pnpm script: collect）
├── scripts/diff.ts                          # 对比：Before/After diff + 回归定位摘要（pnpm script: diff）
└── scripts/tuning.recommend.ts              # 调参实验场（pnpm script: tuning:best/recommend）

.codex/skills/project-guide/references/runtime-logix/
└── logix-core/
    ├── api/03-logic-and-flow.md            # 互引 014（已补）
    └── impl/04-watcher-performance-and-flow.md # 互引 014（已补）
```

**Structure Decision**: 014 的可执行用例优先落在 `packages/logix-react/test/browser/*`（真实浏览器 + 可挂载最小 React host）；采集/对比入口统一收敛到 `.codex/skills/logix-perf-evidence/*`，证据归档仍落在各自 feature 的 `specs/<id>/perf/*`（014 也不例外）。

## Implementation Strategy（分阶段落地与交付物）

### Phase 0：固化口径（矩阵 + schema + 产物落点）

- 固化维度矩阵（SSoT）：维度、档位、预算（绝对/相对）、默认样本策略与超时策略。
- 固化报告 schema：版本号、环境元信息、统计口径、曲线与阈值、失败模式、证据字段（含 unavailable 口径）。
- 固化本地对照产物约定：`specs/014-browser-perf-boundaries/perf/*` 的命名与更新流程（见 `perf.md`）。

### Phase 1：MVP（可对比的边界地图 + 本地固化基线）

- 以浏览器模式集成用例产出第一份结构化报告（JSON），覆盖最小维度集（含 watcher 维度示例）。
- 提供采集脚本：一键运行 browser project 并将报告固化到 `perf/`（避免只靠控制台人工拷贝）。
- 在同机同配置下固化一份 Before 基线，作为后续迭代对照锚点。

### Phase 2：回归定位（diff + 最小归因）

- 提供 diff 工具：对比两份报告输出差异摘要（边界变化、越界档位、绝对/相对预算是否回归）。
- 补齐“口径拆分”：端到端延迟 vs 事务提交/收敛耗时 vs 诊断 overhead（避免误归因）。

### Phase 3：负优化边界扩展 + 可诊断性收口

- 扩展矩阵覆盖负优化对抗场景（高基数/低命中率/失效/列表归一化等），并要求输出资源上界证据。
- 明确诊断分档对测量的影响：off/light/full 的 overhead 曲线与上界；输出污染提示字段。
- 可选增加 Node preflight：对 report/diff schema、矩阵关键不变量、以及相对预算配对/stability/阈值语义做快速回归（默认需显式开关启用，如 `LOGIX_PREFLIGHT=1`；不纳入 CI 门禁）。
