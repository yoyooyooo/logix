# Tasks: 070 core 纯赚/近纯赚性能优化（默认零成本诊断与单内核）

**Input**: Design documents from `specs/070-core-pure-perf-wins/`
**Prerequisites**: `specs/070-core-pure-perf-wins/plan.md`、`specs/070-core-pure-perf-wins/spec.md`（其余为可选补充）

**Tests**: 涉及 `packages/logix-core` 热路径，测试与回归防线视为必需；并必须完成 Node + Browser perf evidence（见 plan.md）。

## Phase 1: Setup（证据落盘与交接锚点）

- [ ] T001 创建 `specs/070-core-pure-perf-wins/perf/README.md`（记录 envId、before/after/diff 路径与结论模板）

---

## Phase 2: Foundational（门控基础设施，阻塞后续用户故事）

- [ ] T002 [P] 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 增加 “errorOnly-only / consumption profile” 的判定辅助（供 converge 与 state:update 门控复用）
- [ ] T003 [P] 新增单测 `packages/logix-core/test/Debug/DebugSink.ConsumptionProfile.test.ts` 覆盖 T002 的判定边界（unknown sink 必须保守为可能消费）

**Checkpoint**: 后续所有 story 的门控条件可复用且有单测兜底。

---

## Phase 3: User Story 1 - 默认档“零观测税”：不会被消费就不付费 (Priority: P1) 🎯 MVP

**Goal**: 默认档（单内核 + diagnostics=off + prod/errorOnly）下移除 Debug/diagnostics 的默认税：不为最终会被丢弃的事件与 payload 付费。

**Independent Test**:

- 关键单测通过：diagnostics=off + errorOnly-only 下不生成 converge decision/dirtySummary 等纯观测 payload
- perf evidence：Node（`converge.txnCommit`）+ Browser（`diagnostics.overhead.e2e`）diff 可判定且无回归（`meta.comparability.comparable=true && summary.regressions==0`）；若要主张“纯赚收益”，按 SC-004 补充可证据化收益并回写 quickstart

- [ ] T004 [US1] 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 实现 errorOnly fast-path：errorOnly-only 时对非 `lifecycle:error`、非 `diagnostic(warn/error)` 的高频事件 early-return（保持 `diagnostic(info)` 丢弃语义）
- [ ] T005 [US1] 在 `packages/logix-core/src/internal/state-field/converge-in-transaction.ts` 收紧门控：`shouldCollectDecision` 仅要求 sinks 非 errorOnly-only（存在明确 consumer）；并将 heavy/exportable 细节门控到 `diagnosticsLevel!=off`，确保默认档不构造 `dirtySummary/topK/hotspots/decision` 等纯观测 payload
- [ ] T006 [US1]（可选但推荐）在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts` 的 commit 点增加门控：errorOnly-only 时跳过 `state:update` 事件对象构造与 `Debug.record` 调用
- [ ] T007 [P] [US1] 新增单测（建议新增文件）`packages/logix-core/test/FieldKernel/FieldKernel.Converge.DecisionOffByDefault.test.ts`：在 diagnostics=off + errorOnly-only 下运行一次 converge，并断言 outcome 不包含 decision（从而阻断默认档 payload 回归）
- [ ] T008 [US1] 准备隔离采集目录 `./.agent/perf-worktrees/070-before` 与 `./.agent/perf-worktrees/070-after`（硬结论必须隔离采集；混杂改动结果仅作线索）
- [ ] T009 [US1] 采集 Node(before)：`specs/070-core-pure-perf-wins/perf/before.node.converge.txnCommit.<sha>.<envId>.default.json`（suite: `converge.txnCommit`；命令见 `specs/070-core-pure-perf-wins/plan.md`）
- [ ] T010 [US1] 采集 Node(after)：`specs/070-core-pure-perf-wins/perf/after.node.converge.txnCommit.<sha|local>.<envId>.default.json`（suite: `converge.txnCommit`）
- [ ] T011 [US1] 生成 Node(diff)：`specs/070-core-pure-perf-wins/perf/diff.node.converge.txnCommit.<before>__<after>.<envId>.default.json`（要求 `meta.comparability.comparable=true && summary.regressions==0`）
- [ ] T012 [US1] 采集 Browser(before)：`specs/070-core-pure-perf-wins/perf/before.browser.diagnostics-overhead.<sha>.<envId>.default.json`（suite: `diagnostics.overhead.e2e`；文件见 `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`）
- [ ] T013 [US1] 采集 Browser(after)：`specs/070-core-pure-perf-wins/perf/after.browser.diagnostics-overhead.<sha|local>.<envId>.default.json`（suite: `diagnostics.overhead.e2e`）
- [ ] T014 [US1] 生成 Browser(diff)：`specs/070-core-pure-perf-wins/perf/diff.browser.diagnostics-overhead.<before>__<after>.<envId>.default.json`（要求 `meta.comparability.comparable=true && summary.regressions==0`）
- [ ] T015 [US1] 回写 `specs/070-core-pure-perf-wins/quickstart.md` 的“最近一次证据”区块：填入 diff 路径与 PASS/FAIL 判据；若要主张“纯赚收益”，同时摘录至少 1 条 improvements/evidenceDeltas（SC-004）

**Checkpoint**: 默认档“不会被消费就不付费”成立，且证据可交接。

---

## Phase 4: User Story 2 - 显式开启观测时可解释且成本可控 (Priority: P1)

**Goal**: 显式启用 Devtools/trace/diagnostics 时仍可导出 Slim、可序列化且可解释的事件；关闭后回到默认零成本口径。

**Independent Test**:

- diagnostics=light/sampled/full 下，DevtoolsHub snapshot/evidence 可序列化且包含 field converge 的解释字段（或 trace 事件）
- diagnostics=off 下，不导出纯观测 payload（保持零成本口径）

- [ ] T016 [P] [US2] 扩展或新增单测（推荐扩展）`packages/logix-core/test/Debug/DevtoolsHub.test.ts`：在 `devtoolsHubLayer + diagnosticsLevel=full` 下跑一次 field converge，并断言 snapshot/evidence 包含与 converge 决策相关的可序列化字段
- [ ] T017 [P] [US2] 新增单测 `packages/logix-core/test/Debug/DevtoolsHub.DiagnosticsOff.test.ts`：在 diagnostics=off 下不导出 converge 决策 payload（但不影响 `lifecycle:error`/`diagnostic(warn/error)` 兜底）
- [ ] T018 [US2] 若实现中引入了新的门控 helper 或命名调整，同步更新 `specs/070-core-pure-perf-wins/contracts/debug-consumption-contract.md`

**Checkpoint**: “需要时可解释，默认零成本”两种档位都可验收。

---

## Phase 5: User Story 3 - 单内核默认，实验/对照才多内核 (Priority: P2)

**Goal**: 用户默认只需理解单内核；kernelId 仅影响装配期 Gate/证据，不进入运行期热路径。

**Independent Test**:

- `kernelId=core` 默认装配不触发 FullCutoverGate（或为常数级且不会失败），运行期不基于 kernelId 分支
- `kernelId!=core` + `fullCutover` 缺失 binding 时装配失败且携带 gate 摘要（非本次主要实现，但需保证不回归）

- [ ] T019 [US3] 审查现有覆盖：在 `packages/logix-core/test/Runtime/**` 与 `specs/047-core-ng-full-cutover-gate/` 相关测试中确认上述语义已有回归防线；如缺失则补齐测试文件（新增）`packages/logix-core/test/Runtime/Runtime.KernelId.AssemblyOnly.test.ts`
- [ ] T020 [US3] 若补测涉及新的可解释字段或错误摘要，同步更新 `specs/070-core-pure-perf-wins/research.md`（记录证据与裁决）

**Checkpoint**: kernelId 语义清晰且不因本特性回退到运行期分支。

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 [P] 跑通质量门：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`
- [ ] T022 [P] 补齐 `specs/070-core-pure-perf-wins/perf/README.md`：记录 envId、profile、before/after/diff 路径与结论摘要（含 `meta.matrixId/matrixHash`）

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 为前置（证据与门控基础设施）。
- US1 依赖 Phase 2；US2/US3 可在 US1 完成后并行推进，但必须保证不破坏 US1 的默认档门控语义。

## Parallel Opportunities

- `[P]` 标注任务可并行（不同文件、依赖弱）。
- 证据采集（T008/T009）可在代码实现完成后并行执行，但必须保证 before/after 可比（同 envId/profile/matrix）。
