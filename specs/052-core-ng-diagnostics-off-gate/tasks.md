# Tasks: 052 diagnostics=off 近零成本 Gate（回归防线）

**Input**: `specs/052-core-ng-diagnostics-off-gate/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）  
**Prerequisites**: `specs/052-core-ng-diagnostics-off-gate/plan.md`（required） + `specs/052-core-ng-diagnostics-off-gate/spec.md`（required）

## Phase 1: Setup（Shared Infrastructure）

- [x] T001 创建证据落点目录 `specs/052-core-ng-diagnostics-off-gate/perf/.gitkeep`
- [x] T002 [P] 固化 off 契约 `specs/052-core-ng-diagnostics-off-gate/contracts/diagnostics-off-contract.md`
- [x] T003 [P] 固化 perf evidence matrix 契约 `specs/052-core-ng-diagnostics-off-gate/contracts/perf-evidence-matrix.md`
- [x] T004 [P] 新增规格质量清单 `specs/052-core-ng-diagnostics-off-gate/checklists/requirements.md`

---

## Phase 2: Foundational（Blocking Prerequisites）

> 说明：converge 的 off 闸门与 diagnostics overhead suite 在 039 已有基线实现；本 spec 负责把它扩展为全局 gate（覆盖 049/050/051），并补齐缺口。

- [x] T005 对齐 039 的 off 禁止项清单与实现落点（作为 052 的基线）`specs/039-trait-converge-int-exec-evidence/tasks.md`、`packages/logix-core/src/internal/state-trait/converge.ts`

---

## Phase 3: User Story 1（P1）- off 档位近零成本（覆盖面扩展）

- [x] T010 [US1] 为 Exec VM evidence/Integer Bridge mapping 补齐 off early-return（off 不输出/不 materialize）`packages/logix-core-ng/src/ExecVmEvidence.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T011 [US1] 补齐/统一 off gate 的“禁止项”回归测试（至少覆盖：steps 数组/label 拼接/mapping materialize）`packages/logix-core/test/observability/ExecVmEvidence.off.test.ts`、`packages/logix-core/test/observability/DebugSink.record.off.test.ts`、`packages/logix-core/test/internal/StateTrait/StateTrait.ConvergeAuto.TraceEvent.test.ts`、`packages/logix-core/test/internal/StateTrait/StateTrait.TraitCheckEvent.DiagnosticsLevels.test.ts`

---

## Phase 4: User Story 2（P1）- 证据门禁（Node + Browser）

- [x] T020 [P] [US2] 采集 before（Browser diagnostics overhead / profile=default）落盘 `specs/052-core-ng-diagnostics-off-gate/perf/before.browser.diagnostics-overhead.372a89d7.darwin-arm64.default.json`
- [x] T021 [P] [US2] 采集 after（Browser diagnostics overhead / profile=default）落盘 `specs/052-core-ng-diagnostics-off-gate/perf/after.browser.diagnostics-overhead.worktree.darwin-arm64.default.json`
- [x] T022 [P] [US2] 产出 diff 并回写结论摘要（必须 `meta.comparability.comparable=true && summary.regressions==0`）`specs/052-core-ng-diagnostics-off-gate/perf/diff.browser.diagnostics-overhead.372a89d7__worktree.darwin-arm64.default.json`、`specs/052-core-ng-diagnostics-off-gate/quickstart.md`
- [x] T023 [P] [US2] 采集 before（Node converge.txnCommit / profile=default）落盘 `specs/052-core-ng-diagnostics-off-gate/perf/before.node.converge.txnCommit.372a89d7.darwin-arm64.default.json`
- [x] T024 [P] [US2] 采集 after（Node converge.txnCommit / profile=default）落盘 `specs/052-core-ng-diagnostics-off-gate/perf/after.node.converge.txnCommit.worktree.darwin-arm64.default.json`
- [x] T025 [P] [US2] 产出 diff（Node）并回写结论摘要（必须 `meta.comparability.comparable=true && summary.regressions==0`）`specs/052-core-ng-diagnostics-off-gate/perf/diff.node.converge.txnCommit.372a89d7__worktree.darwin-arm64.default.json`、`specs/052-core-ng-diagnostics-off-gate/quickstart.md`

---

## Phase 5: Polish & Cross-Cutting

- [x] T030 [P] 回写 046 registry：将 052 状态更新为 implementing/done（取决于证据），并补齐证据链接 `specs/046-core-ng-roadmap/spec-registry.md`
