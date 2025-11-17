# Tasks: 059 Planner Typed Reachability（TypedArray 极致化）

**Input**: `specs/059-core-ng-planner-typed-reachability/*`（`spec.md`/`plan.md`/`quickstart.md`）

## Phase 1: Setup（shared）

- [x] T001 [P] 补齐 spec-kit 最小产物（plan/tasks/quickstart）
- [x] T002 [P] 回写 046 registry：`059` 状态从 `idea` → `draft`
- [x] T003 创建证据落点目录（before/after/diff）`specs/059-core-ng-planner-typed-reachability/perf/`

---

## Phase 2: Baseline（before）

- [x] T010 [P] 采集 before（Node + Browser / core-ng / execVm=on / profile=default）并落盘 `specs/059-core-ng-planner-typed-reachability/perf/before.*.json`
- [x] T011 复核 baseline：确认 diff 的 `matrixId/matrixHash`、env/config 不漂移；如出现 `stabilityWarning` 先复测再进入实现

---

## Phase 3: Implementation（JS-first reachability）

> 目标：把 reachability/plan compute 的关键数据结构进一步收敛到 TypedArray/bitset/queue，并确保 txn 内无新增分配与常驻分支。

- [x] T020 盘点现状：plan compute 的关键循环与仍在热路径上的 Map/Set/对象分配点（优先关注 `dirtyPathsToRootIds`、`shouldRunStepById`、以及任何临时数组/集合）
- [x] T021 设计并实现 Typed reachability index（adjacency list + work queue + visited bitset），并保持输出 plan 的 topo order（必要时用“标记集合 + topo scan”合成有序 plan）
- [x] T022 引入 scratch reuse：queue/visited/mark 等 scratch 挂到 generation 级 Exec IR（或 module instance）并明确清理策略（避免泄漏/抖动）
- [x] T023 保守 fallback：任一异常/超预算/不满足前置条件必须可解释降级（不得把负优化默认化）

**Tests（equivalence & determinism）**

- [x] T024 [P] 新增测试：Typed reachability 产出的 plan 与现有实现等价（覆盖 dirtyAll / sparse / dense / time-slicing scope）（由现有 converge correctness suite 覆盖，无需新增）
- [x] T025 [P] 新增测试：同输入 → 同输出（稳定性），且 diagnostics=off 下不导出重字段（由现有 determinism/diagnostics suite 覆盖，无需新增）

---

## Phase 4: Evidence（after）

- [x] T030 [P] 采集 after（Node + Browser）并产出 diff（Node 与 Browser 都要 `comparable=true && regressions==0`）`specs/059-core-ng-planner-typed-reachability/perf/diff.*.json`
- [x] T031 [P] 回写结论到 `specs/059-core-ng-planner-typed-reachability/quickstart.md`（记录 PASS/FAIL 与关键收益点位）

---

## Phase 5: Closeout（registry）

- [x] T040 [P] 证据达标后回写 046 registry：`059` 状态更新为 `done` 并补齐证据链接
