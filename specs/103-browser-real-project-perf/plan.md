# Implementation Plan: 真实项目 Browser 模式性能集成测试基线

**Branch**: `[103-browser-real-project-perf]` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/103-browser-real-project-perf/spec.md`

## Summary

以 `examples/logix-react` 作为“真实项目”载体，建立一条基于 Vitest Browser Mode 的性能集成测试跑道：

- 定义并固化 80%+ 常见前端业务场景（P1/P2）与预算语义；
- 复用现有 `PerfReport/PerfDiff` 协议，避免并行真相源；
- 打通 `before -> after -> diff` 证据闭环，并形成可比性门禁；
- 把回归定位结果映射为可执行优化杠杆，支撑持续性能演进。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-10, NS-4
- **Kill Features (KF)**: KF-8, KF-4

## Technical Context

**Language/Version**: TypeScript 5.9.x（examples）/ 5.8.x（workspace）  
**Primary Dependencies**: `effect@3.19.13`、`@logixjs/core`、`@logixjs/react`、`vitest@4`、`@vitest/browser-playwright`、`playwright@1.57`、`@logixjs/perf-evidence`  
**Storage**: N/A（仅文件落盘：`specs/103-browser-real-project-perf/perf/*`）  
**Testing**: Vitest（browser + unit）+ `pnpm perf collect/diff/validate`  
**Target Platform**: Node.js 20+、Chromium headless、现代浏览器运行语义  
**Project Type**: pnpm workspace monorepo（packages + examples）  
**Performance Goals**:
- P1 场景默认档（`default`）可稳定产出；
- 任一场景有预算与阈值解释（`absolute/relative`）；
- 可比性失败时禁止硬结论；
- PR 阶段可在 `quick` 子集 15 分钟内完成。  
**Constraints**:
- 不新增并行报告协议，统一使用 `LOGIX_PERF_REPORT` + `PerfReport/PerfDiff`；
- 事务窗口禁止 IO，诊断事件必须 Slim 且可序列化；
- 必须保持稳定标识与 no-tearing 语义可验证。  
**Scale/Scope**:
- 6-8 个场景（至少 4 个 P1）；
- 每个场景至少 1 个核心指标与 1 组预算；
- 覆盖列表、表单、查询、路由、外部输入、高频交互六类路径。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Phase 0

- [x] NS/KF 对齐：`spec.md` 已记录 NS-10/NS-4 与 KF-8/KF-4，并在 User Story/FR/SC 中保持追踪。
- [x] Intent -> Flow/Logix -> Code -> Runtime：本特性为“证据基础设施”，输入是业务场景，输出是运行时可回放性能证据。
- [x] docs-first & SSoT：以 `.codex/skills/logix-perf-evidence/assets/*` 与 `specs/103/*` 为本次裁决落点。
- [x] 合同变更：不改 `@logixjs/core` 公共 API，新增场景与 gate 协议约束文档。
- [x] IR 与锚点：不新增 IR 形态，沿用现有 Static IR + Dynamic Trace 证据链。
- [x] 稳定标识：场景与报告必须保留 `instanceId/txnSeq/opSeq` 对齐能力。
- [x] 事务边界：场景设计禁止在事务窗口内引入 IO/await 写路径。
- [x] React no-tearing：场景断言必须覆盖单快照锚点，不允许双真相源。
- [x] External source 语义：外部输入场景只允许 signal-dirty + pull-based 消费。
- [x] 内部契约：不引入 magic 字段，复用 Runtime Services 与现有调试契约。
- [x] 双内核策略：本次以 `@logixjs/core` 为默认执行面；若涉及 `core-ng`，通过策略轴显式表达并产证据。
- [x] 性能预算：每个 P1 场景必须定义预算与失败策略。
- [x] 可诊断性：每个场景必须输出可解释 evidence 字段。
- [x] 对外心智模型：计划同步关键词、成本模型、优化梯子到 quickstart 与后续文档。
- [x] forward-only：若流程与现有脚本冲突，优先新裁决并给迁移说明，不做兼容层。
- [x] Public submodule 约束：本阶段不改 `packages/*/src` 导出拓扑。
- [x] 大文件拆解：本特性主要新增 specs 与 tests，不触发 >=1000 LOC 拆解门槛。
- [x] 质量门：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:browser`（含目标场景）。

### Post-Phase 1 Re-check

- [x] `research.md` 已固化关键决策与备选方案。
- [x] `data-model.md` 已定义 ScenarioSuite / Budget / DiffResult 等实体与验证约束。
- [x] `contracts/*` 已明确场景注册与 gate 策略契约。
- [x] `quickstart.md` 已给出可复现实操闭环与失败回退策略。
- [x] 无未解释宪法冲突，Phase 2 可进入 tasks 拆分。

### Post-Implementation Re-check（T038）

- [x] Feature 103 验收套件 `examples.logixReact.scenarios` 已形成 before/after/diff 证据链：`perf/before.baseline.darwin-arm64.local.default.json`、`perf/after.head.darwin-arm64.local.default.json`、`perf/diff.baseline__head.darwin-arm64.local.default.json`。
- [x] 可比性门禁生效：`diff` 记录到 `matrixHash` 漂移后仅输出 triage 线索，不输出硬结论（符合 `meta.comparability.comparable=false` 失败策略）。
- [x] 规模化边界信号已落盘：`perf/soak.darwin-arm64.local.json` + `perf/recommendations.darwin-arm64.local.md`，覆盖 memory/diagnostics 证据与行动建议。
- [x] 质量门验证归档齐全且通过：`perf/verification.typecheck.txt`、`perf/verification.lint.txt`、`perf/verification.browser.txt`、`perf/verification.test-turbo.txt`。
- [x] `tail-recheck` 轨道在该 suite 下标记 `not_applicable`（`perf/tail-recheck-plan.json`、`perf/tail-recheck-summary.json`），避免将 converge 语义误用于场景套件。

## Perf Evidence Plan（MUST）

- Baseline 语义分层：
  - `converge.txnCommit`：平台容量参考基线（用于动态预算建模与趋势观测，不作为 Feature 103 验收门禁）
  - `examples.logixReact.scenarios`：Feature 103 验收门禁基线（必须用于 `SC-001/SC-003` 的 before/after/diff 结论）
- run `22489712231` 归类：仅为 `converge.txnCommit` 轨道参考证据，不可用于关闭 Feature 103 验收。
- envId：`darwin-arm64.apple-m2-max.chromium-<version>.headless`
- profile：`default`（交付）/ `soak`（稳定复核），`quick` 仅探路
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/103-browser-real-project-perf/perf/before.<sha>.<envId>.default.json --files examples/logix-react/test/browser/perf-scenarios`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/103-browser-real-project-perf/perf/after.<sha|worktree>.<envId>.default.json --files examples/logix-react/test/browser/perf-scenarios`
- diff：
  - `pnpm perf diff -- --before specs/103-browser-real-project-perf/perf/before...json --after specs/103-browser-real-project-perf/perf/after...json --out specs/103-browser-real-project-perf/perf/diff.before__after.<envId>.default.json`
- Failure Policy：
  - 出现 `stabilityWarning/timeout/missing suite`：先缩小子集复现，再升档到 `soak`；
  - `meta.comparability.comparable=false`：只给线索，不给回归硬结论。

## Project Structure

### Documentation (this feature)

```text
specs/103-browser-real-project-perf/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── scenario-suite.schema.json
│   └── gate-policy.schema.json
└── tasks.md
```

### Source Code (repository root)

```text
examples/logix-react/
├── vitest.config.ts
└── test/
    ├── browser/
    │   └── perf-scenarios/
    │       ├── route-switch.test.tsx
    │       ├── query-list-refresh.test.tsx
    │       ├── form-cascade-validate.test.tsx
    │       ├── external-push-sync.test.tsx
    │       ├── dense-interaction-burst.test.tsx
    │       └── protocol.ts
    └── perf-boundaries/
        ├── contract-preflight.test.ts
        └── semantics.test.ts

.codex/skills/logix-perf-evidence/
├── assets/matrix.json
├── assets/schemas/
└── scripts/
    ├── collect.ts
    └── diff.ts
```

**Structure Decision**: 真实业务场景测试放在 `examples/logix-react/test/browser/perf-scenarios`；统一报告协议与采集/对比能力继续由 `.codex/skills/logix-perf-evidence` 承载，避免新建第二套工具链。

## Phase 0: Research Output

- 输出：[`research.md`](./research.md)
- 目标：明确场景载体、矩阵扩展策略、collect 复用方式、门禁分层策略。

## Phase 1: Design & Contracts Output

- 输出：[`data-model.md`](./data-model.md)、[`contracts/`](./contracts)、[`quickstart.md`](./quickstart.md)
- 目标：固定实体模型、契约边界、运行闭环与失败策略。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
