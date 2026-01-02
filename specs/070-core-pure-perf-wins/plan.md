# Implementation Plan: 070 core 纯赚/近纯赚性能优化（默认零成本诊断与单内核）

**Branch**: `070-core-pure-perf-wins` | **Date**: 2025-12-31 | **Spec**: `specs/070-core-pure-perf-wins/spec.md`  
**Input**: Feature specification from `specs/070-core-pure-perf-wins/spec.md`

## Summary

目标：把默认档（单内核 + diagnostics=off + prod/errorOnly）下的“观测税”压到近零成本，同时保持显式开启 Devtools/trace 时的可解释链路。

- 默认档：
  - DebugSink 在 `errorOnly` 单 sink 场景对高频事件走 fast-path（不读取 diagnosticsLevel/runtimeLabel/linkId，不调用 sink.record）
  - Trait converge 在默认档（diagnostics=off + errorOnly-only）下不生成 decision/dirtySummary/topK/hotspots 等观测 payload；当 sinks 非 errorOnly-only 时仅生成 slim decision，重字段由 diagnosticsLevel 门控
- 显式观测档：
  - diagnostics=light/full（或 sampled）时仍可导出 Slim、可序列化事件，并解释裁剪/降级原因
- kernelId：
  - 保持“请求内核族”语义；FullCutoverGate 只做装配期判定，不进入运行期热路径

本 plan 阶段交付设计产物与 tasks 拆分；实现与证据落盘在后续 `$speckit tasks` 执行。

## Deepening Notes

- Decision: “会被消费”判定保守：仅 errorOnly-only 可视为“不会被消费”，未知/自定义 sinks 一律视为可能消费 (source: spec clarify AUTO 2026-01-01)
- Decision: `diagnosticsLevel=off` 仍允许在 sinks 非 errorOnly-only 时生成 slim decision（用于 `state:update.traitSummary`），但 heavy/exportable 细节必须 `diagnosticsLevel!=off` (source: spec clarify AUTO 2026-01-01)
- Decision: Gate/perf evidence 的默认档 baseline 固定为 `kernelId=core + diagnosticsLevel=off + Debug.layer(mode=prod)` (source: spec clarify AUTO 2026-01-01)
- Decision: perf evidence 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT，交付结论必须 `profile=default|soak` 且 diff 满足 `meta.comparability.comparable=true && summary.regressions==0` (source: spec clarify AUTO 2026-01-01)
- Decision: 硬结论 before/after 必须隔离采集；混杂改动结果仅作线索不得宣称 Gate PASS (source: spec clarify AUTO 2026-01-01)
- Decision: SC-001 以“无回归且可比”为硬门；若主张“纯赚收益”，按 SC-004 补充可证据化收益并回写 quickstart (source: spec clarify AUTO 2026-01-01)
- Decision: `LOGIX_CORE_NG_EXEC_VM_MODE` 不作为默认纯赚开关，继续保持显式 opt-in (source: spec clarify AUTO 2026-01-01)

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM；以仓库 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、（browser evidence）`@logix/react`  
**Storage**: N/A（证据落盘到 `specs/070-core-pure-perf-wins/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（至少 1 组 headless browser evidence）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**: 默认档（diagnostics=off + errorOnly-only）下关键 suite diff 无回归（见 SC-001）；若要主张“纯赚收益”，按 SC-004 补充可证据化收益。  
**Constraints**: 默认零成本/接近零成本；统一最小 IR + 稳定锚点（instanceId/txnSeq/opSeq）；事务窗口禁 IO；consumer 不直接依赖 `@logix/core-ng`  
**Scale/Scope**: 只改 Debug/trait converge 的门控与 fast-path，不改业务语义与对外 API

## Kernel support matrix

- `core`: supported（默认档）
- `core-ng`: supported（本特性落在 `@logix/core`，core-ng 试跑时同样受益；但是否可切默认仍由 046/047 裁决）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 性能/诊断治理层：不改业务 Flow/DSL，仅移除默认税与明确门控语义。
- **Docs-first & SSoT**：不新增平台术语；若诊断协议字段/语义发生变化，必须同步更新 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`（本特性目标是“零税”，原则上不改协议）。
- **IR & anchors**：不改变统一最小 IR 与稳定锚点；只改变“何时生成可导出事件/decision”以确保 off 近零成本。
- **Deterministic identity**：不引入随机/时间锚点；既有 instanceId/txnSeq/opSeq 语义保持。
- **Transaction boundary**：不引入事务窗口 IO/await；改动仅为门控与 fast-path。
- **Internal contracts & trial runs**：不新增隐式 magic 协议；门控逻辑收敛在 `DebugSink`/trait converge 内部，保持可测试/可基准化。
- **Dual kernels (core + core-ng)**：变更落在 `@logix/core`，不要求 consumer 依赖 core-ng；证据以 core 默认档为主。
- **Performance budget**：强制 `$logix-perf-evidence`（Node + Browser）作为硬门；必要时补充单测/基准防线以拦截回归。
- **Diagnosability & explainability**：off 档必须近零成本；light/full 下仍可导出 Slim 且可序列化的解释字段。
- **Breaking changes**：目标不引入对外破坏性变更；如发现需要调整事件协议/诊断口径，必须另立迁移说明（forward-only）。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`（或等价一次性测试），并完成本 spec 的 perf evidence。

### Gate Result (Pre-Design)

- PASS（当前交付为 plan/research/data-model/contracts/quickstart；实现由 tasks 驱动）

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before=改动前，after=改动后）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集隔离：硬结论的 before/after/diff 必须同环境同参数，且必须使用独立目录或 `git worktree` 隔离采集（混杂工作区结果只作线索不得宣称 Gate PASS）
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`（并确保 before/after 的 `meta.matrixId/matrixHash` 一致）

**Collect (Node / converge.txnCommit)**:

- `pnpm perf bench:traitConverge:node -- --profile default --out specs/070-core-pure-perf-wins/perf/before.node.converge.txnCommit.<sha|local>.<envId>.default.json`
- `pnpm perf bench:traitConverge:node -- --profile default --out specs/070-core-pure-perf-wins/perf/after.node.converge.txnCommit.<sha|local>.<envId>.default.json`
- `pnpm perf diff -- --before specs/070-core-pure-perf-wins/perf/before.node.converge.txnCommit...json --after specs/070-core-pure-perf-wins/perf/after.node.converge.txnCommit...json --out specs/070-core-pure-perf-wins/perf/diff.node.converge.txnCommit.before...__after....json`

**Collect (Browser / diagnostics overhead)**:

- `pnpm perf collect -- --profile default --out specs/070-core-pure-perf-wins/perf/before.browser.diagnostics-overhead.<sha|local>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- `pnpm perf collect -- --profile default --out specs/070-core-pure-perf-wins/perf/after.browser.diagnostics-overhead.<sha|local>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- `pnpm perf diff -- --before specs/070-core-pure-perf-wins/perf/before.browser.diagnostics-overhead...json --after specs/070-core-pure-perf-wins/perf/after.browser.diagnostics-overhead...json --out specs/070-core-pure-perf-wins/perf/diff.browser.diagnostics-overhead.before...__after....json`

Failure Policy：任一 diff `meta.comparability.comparable=false` 或 `summary.regressions>0` → 不得下硬结论，必须复测并定位（profile 升级或缩小 files 子集）。

## Project Structure

```text
specs/070-core-pure-perf-wins/
├── spec.md
├── plan.md
├── checklists/
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
├── tasks.md
└── perf/
```

## Source Code (implementation targets)

```text
packages/logix-core/
├── src/internal/runtime/core/DebugSink.ts
├── src/internal/state-trait/converge-in-transaction.ts
├── src/internal/runtime/core/ModuleRuntime.transaction.ts
└── test/**   # 新增至少 1 条回归防线（见 SC-002）

packages/logix-react/
└── test/browser/perf-boundaries/diagnostics-overhead.test.tsx   # 复用既有 suite 采证据
```

## Design（关键机制）

### 1) errorOnly fast-path：把“最低限度观测”变成“最低限度成本”

- 当当前 Fiber 的 sinks 仅包含 errorOnly sink 时：
  - `state:update`、`trace:*`、`action:*` 等高频事件直接 early-return（等价丢弃）
  - `lifecycle:error` 与 `diagnostic(warn/error)` 保持现有兜底（打印/记录）
  - `diagnostic(info)` 仍保持丢弃（不因为 fast-path 意外变成 info 噪音）

### 2) Trait converge 的 decision/dirtySummary 门控：默认档零税，重字段需显式诊断

- 将 `convergeInTransaction` 的 `shouldCollectDecision` 从 “sinks.length>0” 收紧为：
  - sinks 非 errorOnly-only（存在明确 consumer）
- heavy/exportable 细节（trace payload、topK/hotspots、静态 IR 导出等）再由 `diagnosticsLevel != off` 门控。
- 以该门控控制 decision/dirtySummary/topK/hotspots 等纯观测 payload 的构造；算法必需结构保持不变。

### 3) `state:update` 的 payload 构造门控（可选但推荐）

- 在 `ModuleRuntime.transaction.ts` 的 commit 点，在构造 `state:update` 事件对象前做门控：
  - 若 sinks 明确为 errorOnly-only，则不构造事件对象且不调用 `Debug.record`
  - 其它情况保持现状（保守：未知 sink 视为可能消费）

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（现状与决策清单、候选纯赚点、风险与替代方案）。
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`（验收口径与证据跑法）。
- **Phase 2（tasks）**：由 `tasks.md` 承载（`$speckit tasks 070` 生成/维护）。
