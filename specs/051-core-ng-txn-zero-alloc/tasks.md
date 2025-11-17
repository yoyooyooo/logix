# Tasks: 051 core-ng 事务零分配（txn zero-alloc）

**Input**: `specs/051-core-ng-txn-zero-alloc/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）  
**Prerequisites**: `specs/051-core-ng-txn-zero-alloc/plan.md`（required） + `specs/051-core-ng-txn-zero-alloc/spec.md`（required）

## Phase 1: Setup（Shared Infrastructure）

- [x] T001 创建证据落点目录 `specs/051-core-ng-txn-zero-alloc/perf/.gitkeep`
- [x] T002 [P] 固化 Txn Zero-Alloc 契约 `specs/051-core-ng-txn-zero-alloc/contracts/txn-zero-alloc-contract.md`
- [x] T003 [P] 固化 perf evidence matrix 契约 `specs/051-core-ng-txn-zero-alloc/contracts/perf-evidence-matrix.md`
- [x] T004 [P] 新增规格质量清单 `specs/051-core-ng-txn-zero-alloc/checklists/requirements.md`

---

## Phase 2: Foundational（Blocking Prerequisites）

> 说明：以下能力在 039 已有达标实现/证据口径，本 spec 直接复用，不重复投入：
>
> - argument-based recording 的 guardrails（039 的 T022/T015）
> - PerfReport/PerfDiff 证据门禁跑道（Node `converge.txnCommit` + Browser `converge.txnCommit`；`pnpm perf bench:traitConverge:node` / `pnpm perf collect`）

- [x] T005 对齐 050 的 id-first txn 输出契约（避免 051 自行定义 DirtySet 形态导致并行真相源）`specs/050-core-ng-integer-bridge/contracts/fieldpath-contract.md`
- [x] T006 [P] 固化 Node `converge.txnCommit` perf harness baseline：强制 `stateTransaction.instrumentation=light`（保持 `diagnostics=off` 为 baseline；并默认 `kernelId=core`）`.codex/skills/logix-perf-evidence/scripts/bench.traitConverge.node.ts`
- [x] T007 [P] 固化 Browser `converge.txnCommit` perf harness baseline：Runtime 显式设置 `stateTransaction.instrumentation=light`（保持 `diagnostics=off` 为 baseline；并默认 `kernelId=core`）`packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts`

---

## Phase 3: User Story 1（P1）- light 档位热路径零分配

- [x] T010 [US1] 重构 `StateTransaction`：复用 txn 内部容器（避免每次 `new Set()` / `new Array()`）；light 下只维护必要 dirty roots（id-first）与最小摘要 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T011 [US1] 事务内记录 API 的分支搬迁：把 full/light 的分支搬到 loop 外，避免 per-step 分支预测成本 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T012 [P] [US1] 更新 txn/patch 相关调用点：保持 argument-based recording（full/light 都不 materialize patch 对象），并禁止 rest 参数与隐式数组分配（必要时引入局部 helper）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

**Tests（US1）**

- [x] T013 [P] [US1] 新增/补齐测试：`instrumentation=light` 下不 materialize patches/snapshots；dirty roots/dirty-set 必须 id-first 且不触发 `dirtyAll=true`；并可用于 converge 调度（保持行为不漂移）`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

---

## Phase 4: User Story 2（P1）- Node+Browser 证据门禁（无回归）

- [x] T020 [P] [US2] 采集 before（Node `converge.txnCommit` / profile=default）落盘 `specs/051-core-ng-txn-zero-alloc/perf/before.node.converge.txnCommit.372a89d7.darwin-arm64.default.json`
- [x] T021 [P] [US2] 采集 after（Node `converge.txnCommit` / profile=default）落盘 `specs/051-core-ng-txn-zero-alloc/perf/after.node.converge.txnCommit.worktree.darwin-arm64.default.json`
- [x] T022 [P] [US2] 产出 diff（Node）并写入结论摘要（必须 `meta.comparability.comparable=true && summary.regressions==0`）`specs/051-core-ng-txn-zero-alloc/perf/diff.node.converge.txnCommit.372a89d7__worktree.darwin-arm64.default.json`、`specs/051-core-ng-txn-zero-alloc/quickstart.md`
- [x] T023 [P] [US2] 采集 Browser `converge.txnCommit` before/after/diff（converge-only；稳定门禁）并回写结论摘要（必须 `meta.comparability.comparable=true && summary.regressions==0`）`specs/051-core-ng-txn-zero-alloc/perf/before.browser.converge.txnCommit.372a89d7.darwin-arm64.default.json`、`specs/051-core-ng-txn-zero-alloc/perf/after.browser.converge.txnCommit.dev.darwin-arm64.default.json`、`specs/051-core-ng-txn-zero-alloc/perf/diff.browser.converge.txnCommit.372a89d7__dev.darwin-arm64.default.json`、`specs/051-core-ng-txn-zero-alloc/quickstart.md`

> Note: `watchers.clickToPaint` 属于端到端链路（噪声更高）；其全量 Browser P1 diff 见 `specs/051-core-ng-txn-zero-alloc/perf/diff.browser.p1.372a89d7__worktree.darwin-arm64.default.json`（含 `stabilityWarning`），当前不作为 051 的硬门结论。

---

## Phase 5: Polish & Cross-Cutting

- [x] T030 [P] 回写 046 registry：将 051 状态更新为 implementing/done（取决于证据），并补齐证据链接 `specs/046-core-ng-roadmap/spec-registry.md`
