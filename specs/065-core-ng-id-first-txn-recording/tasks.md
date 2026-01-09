# Tasks: 065 core-ng 整型化 Phase 2（事务/录制 id-first）

**Input**: `specs/065-core-ng-id-first-txn-recording/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）  
**Prerequisites**: `specs/065-core-ng-id-first-txn-recording/plan.md`（required） + `specs/065-core-ng-id-first-txn-recording/spec.md`（required）

## Format: `[TaskID] [P?] [Story] Description with file path`

- `[P]`：可并行（不同文件/无依赖）
- `[US1]/[US2]/[US3]`：必须与 `spec.md` 的 User Story 编号一致

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 固化证据落点与契约基线（避免实现前漂移）

- [x] T001 创建证据落点目录 `specs/065-core-ng-id-first-txn-recording/perf/.gitkeep`
- [x] T002 [P] 校对/对齐 contracts schemas 与 data-model（DirtySet/PatchRecord/state:update/exec-vm）`specs/065-core-ng-id-first-txn-recording/contracts/openapi.yaml`、`specs/065-core-ng-id-first-txn-recording/contracts/schemas/*.json`、`specs/065-core-ng-id-first-txn-recording/data-model.md`
- [x] T003 [P] 规格质量清单 PASS（requirements checklist）`specs/065-core-ng-id-first-txn-recording/checklists/requirements.md`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 在进入任何 User Story 前，把“稳定枚举 + id-first 映射 + 统一入口”地基打牢

- [x] T010 定义并收敛 `DirtyAllReason`/`PatchReason`（稳定枚举 + normalize 兜底）`packages/logix-core/src/internal/field-path.ts`
- [x] T011 [P] 确保 txn 可获得 instance-isolated 的 `FieldPathIdRegistry`（禁止进程级单例）`packages/logix-core/src/internal/state-trait/install.ts`、`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
- [x] T012 [P] 收敛 `InternalContracts.recordStatePatch`：reason 从自由字符串收紧为 `PatchReason`（必要时保留 full-only 的裁剪 detail）`packages/logix-core/src/internal/InternalContracts.ts`
- [x] T013 建立统一的 txn patch recording 入口：`RuntimeInternalsTxn.recordStatePatch`（id-first + bounded/full 裁剪策略）`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
- [x] T014 [P] 迁移 txn commit 的 debug event 类型：为 `state:update` 增补 `dirtySet`/`patchCount`/`patchesTruncated*`/`staticIrDigest` 等字段（保持 JsonValue 硬门）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`

---

## Phase 3: User Story 1（P1）- 事务窗口整型化闭环（dirty-set + patch recording）

**Goal**: txn 热路径只传递整型锚点（FieldPathId/StepId/opSeq），字符串仅在显示/序列化边界 materialize

**Independent Test**: 守护测试阻断隐式降级与 string 往返；并可产出 Node+Browser 可比证据（见 US3）

- [x] T020 [US1] txn 内 dirty roots 收集切到 id-first（`FieldPathId`），禁止 split/join 往返 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T021 [US1] rootIds canonicalization（去重/prefix-free/稳定排序）+ `rootCount/keyHash/keySize` 口径固化 `packages/logix-core/src/internal/field-path.ts`
- [x] T022 [US1] 不可追踪/不可映射/歧义 dot-path 时显式降级 `dirtyAll=true` + `DirtyAllReason`（禁止静默回退）`packages/logix-core/src/internal/field-path.ts`、`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T023 [US1] `state:update` payload 迁移为 id-first（写入 `dirtySet` + `patchCount` + txn anchors + `staticIrDigest`）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- [x] T024 [US1] patch recording id-first：full 下记录 `TxnPatchRecord(opSeq/pathId/reason/stepId)`，light/off 仅保留计数摘要 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T025 [US1] full patch records 强制有界（默认 ≤256；超限裁剪并标记 `patchesTruncated`/`patchesTruncatedReason=max_patches`）`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T026 [US1] 更新调用点：统一走 `RuntimeInternalsTxn.recordStatePatch`（禁止自由字符串 reason 扩散）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

**Tests（US1）**

- [x] T027 [P] [US1] 新增/补齐测试：`dirtyAll=false` 时 `rootIds` 必须 prefix-free + 稳定排序，且不得出现隐式 `dirtyAll=true` `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- [x] T028 [P] [US1] 新增/补齐测试：不可映射/歧义 string path 必须显式降级为 `dirtyAll=true` 且 reason 为稳定枚举 `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`
- [x] T029 [P] [US1] 新增/补齐测试：diagnostics=full 下 patch records ≤256 且裁剪标记可解释 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

---

## Phase 4: User Story 2（P2）- 可解释链路：稳定 id + 可反解的最小 IR

**Goal**: diagnostics=off 近零成本；light/sampled/full 输出 Slim/可序列化锚点，并基于 Static IR（staticIrDigest）可控反解

**Independent Test**: 两次独立运行产生的 staticIrDigest 一致；消费侧在 digest 缺失/不匹配时不反解（避免展示错误信息）

- [x] T030 [US2] DebugSink 投影：按 off/light/sampled/full 预算输出 `state:update`（TopK=3/32 + `rootIdsTruncated`，sampled/full 有界 patches）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T031 [US2] 消费侧 digest gate：`staticIrDigest` 缺失/不匹配时禁止 `rootIds → rootPaths` 反解，仅展示 id 与摘要 `packages/logix-devtools-react/src/internal/state/compute.ts`
- [x] T032 [P] [US2] 更新/补齐可解释链路文档：`state:update.dirtySet` 的 id-first 语义与降级原因码 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`

**Tests（US2）**

- [x] T033 [P] [US2] 补齐测试：同一输入两次运行的 `staticIrDigest` 稳定（并可对齐 FieldPathId/StepId 语义）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DeterministicIds.test.ts`
- [x] T034 [P] [US2] 补齐测试：diagnostics=off/light/sampled/full 的 payload 成本约束（off 不输出重字段；light/sampled/full bounded）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`

---

## Phase 5: User Story 3（P3）- 长期门禁：Perf hard gates + Exec-VM 证据

**Goal**: 关键 suites 的门禁可判定 PASS/FAIL；执行形态回退/降级可解释且可被 gate 捕获

**Independent Test**: Browser diff `comparable=true && regressions==0 && budgetViolations==0`；Node `bench:027 gate.ok=true`；`bench:009` 回归 ≤15%（median+p95）

- [x] T040 [US3] 对齐 Exec VM evidence：light/full 可导出 `hit/reasonCode`，off 近零成本不输出 `packages/logix-core-ng/src/ExecVmEvidence.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T041 [P] [US3] 采集 Browser perf before（matrix v1 / profile default）`specs/065-core-ng-id-first-txn-recording/perf/browser.before.b0a1166c.logix-browser-perf-matrix-v1.default.json`
- [x] T042 [P] [US3] 采集 Browser perf after（matrix v1 / profile default）`specs/065-core-ng-id-first-txn-recording/perf/browser.after.b0a1166c-dirty.logix-browser-perf-matrix-v1.default.json`
- [x] T043 [P] [US3] 产出 Browser diff（硬门）`specs/065-core-ng-id-first-txn-recording/perf/diff.browser.before.b0a1166c__after.b0a1166c-dirty.json`
- [x] T044 [P] [US3] 采集 Node `bench:027:devtools-txn`（after，含 gate 输出）`specs/065-core-ng-id-first-txn-recording/perf/node.after.b0a1166c-dirty.bench027.r1.json`
- [x] T045 [P] [US3] 采集 Node `bench:009:txn-dirtyset` before/after（convergeMode=dirty）`specs/065-core-ng-id-first-txn-recording/perf/node.before.b0a1166c.bench009.convergeMode=dirty.json`、`specs/065-core-ng-id-first-txn-recording/perf/node.after.b0a1166c-dirty.bench009.convergeMode=dirty.json`
- [x] T046 [P] [US3] 若 perf harness/脚本需要适配新字段或新增门禁，更新脚本并保持可比口径 `scripts/perf.ts`、`.codex/skills/logix-perf-evidence/scripts/009-txn-patch-dirtyset.txn-dirtyset-baseline.ts`、`.codex/skills/logix-perf-evidence/scripts/027-runtime-observability-hardening.devtools-and-txn-baseline.ts`
- [x] T047 [US3] 回写 perf 证据结论摘要（含失败原因/复测策略）`specs/065-core-ng-id-first-txn-recording/quickstart.md`

---

## Phase 6: Polish & Cross-Cutting

- [x] T050 [P] 回写 runtime SSoT：txn recording id-first + 原因码收敛 + state:update 成本模型 `/docs/ssot/runtime/logix-core/impl/README.md`
- [x] T051 [P] 回写 046 roadmap registry：补齐 065 状态与证据链接 `specs/046-core-ng-roadmap/spec-registry.md`
- [x] T052 运行质量门并修复回归：`pnpm typecheck` / `pnpm lint` / `pnpm test:turbo` `package.json`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 为硬依赖（先固化证据落点与契约，再进入实现）。
- Phase 2 完成后：US1/US2/US3 可并行推进，但推荐顺序：US1（txn 闭环）→ US2（可解释链路）→ US3（hard gates）。
- Perf 证据（US3）必须在实现完成后再跑 before/after/diff，且任何 `comparable=false` 视为 FAIL（禁止下硬结论）。
