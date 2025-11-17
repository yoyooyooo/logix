# Tasks: 049 core-ng 线性执行 VM（Exec VM）

**Input**: `specs/049-core-ng-linear-exec-vm/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）

## Phase 1: Setup（shared）

- [x] T001 创建证据落点目录（before/after/diff）`specs/049-core-ng-linear-exec-vm/perf/`
- [x] T002 [P] 固化 Exec VM evidence 字段口径（Slim、可序列化、off 近零成本）`specs/049-core-ng-linear-exec-vm/contracts/exec-vm-evidence.md`
- [x] T003 [P] 固化 perf evidence matrix（matrix SSoT + P1 suites + diff 判据）`specs/049-core-ng-linear-exec-vm/contracts/perf-evidence-matrix.md`

---

## Phase 2: Foundational（Blocking）

> 目标：把 Exec VM 引入为 core-ng 的可注入实现，并能在 045 跑道里被对照验证与证据化。

- [x] T004 验证前置条件：045 kernel contract 可用且 core-ng 可被注入试跑 `specs/045-dual-kernel-contract/tasks.md`
- [x] T005 定义 Exec VM 的最小可解释摘要字段并接入证据链路（off 近零成本；light/full 输出 `reasonCode` 稳定枚举码 + 可选 `reasonDetail`）`packages/logix-core-ng/src/*`、`packages/logix-core/src/internal/observability/*`
- [x] T006 实现 Exec IR 的构造期预编译与 generation 生命周期绑定（禁止每窗口重建；产出 `execIrVersion/execIrHash` 以支撑 AOT-ready）`packages/logix-core-ng/src/*`
- [x] T007 确保执行 loop 内无字符串解析/无新增临时集合分配（按 049/039 guardrails；必要时引入 microbench）入口：`packages/logix-core/src/internal/state-trait/converge.ts`

**Tests（Foundational）**

- [x] T008 [P] 新增测试：core-ng Exec VM 在对照 harness 下可运行（core vs core-ng）且 diff 可序列化 `packages/logix-core-ng/test/ExecVm.contract.verify.test.ts`
- [x] T009 [P] 新增测试：diagnostics=off 下不输出 Exec VM 细节字段（且不引入额外分配闸门回归）`packages/logix-core/test/observability/ExecVmEvidence.off.test.ts`

---

## Phase 3: User Story 1（P1）- 热路径执行形态接近“编译产物”

**Goal**: 线性 plan 执行生效，避免 split/join 与对象分配。

**Independent Test**: 复用 045 contract verification（core vs core-ng），并能在 light/full evidence 中解释 Exec VM 命中/未命中（含 `reasonCode`）。

- [x] T010 [US1] 将 converge/txn 热路径接入 Exec VM（先覆盖 1 条关键路径，确保可证据化）`packages/logix-core-ng/src/*`
- [x] T011 [US1] 补齐“未命中原因/降级策略”并证据化（`reasonCode` 稳定枚举码；不得自由文本；不得隐式 fallback）`packages/logix-core-ng/src/*`、`packages/logix-core/src/Kernel.ts`

---

## Phase 4: User Story 2（P1）- 性能证据门禁（Node + Browser）

**Goal**: matrix P1 suites Gate PASS（Node 与 Browser 都要 `comparable=true && regressions==0`）且至少 1 个关键收益可证据化。

**Independent Test**: Node + Browser 分别完成 before/after/diff，并满足 `comparable=true && regressions==0`，结论落盘到 `specs/049-core-ng-linear-exec-vm/perf/*` 且回写 `specs/049-core-ng-linear-exec-vm/quickstart.md`。

- [x] T020 [P] [US2] 采集 before（core-ng / execVm=off / Node+Browser / profile=default）落盘 `specs/049-core-ng-linear-exec-vm/perf/before.*.core-ng.execVm.off.*.default.json`
- [x] T021 [P] [US2] 采集 after（core-ng / execVm=on / Node+Browser / profile=default）落盘 `specs/049-core-ng-linear-exec-vm/perf/after.*.core-ng.execVm.on.*.default.json`
- [x] T022 [P] [US2] 产出 diff（Node + Browser）并写入结论摘要（Node 与 Browser 都要 `comparable=true && regressions==0`，任一 FAIL 则整体 FAIL）`specs/049-core-ng-linear-exec-vm/perf/diff.*.json`、`specs/049-core-ng-linear-exec-vm/quickstart.md`

---

## Phase 5: User Story 3（P2）- AOT-ready（但不绑定工具链）

**Goal**: Exec IR 工件数据化/可序列化/可对比（版本 + hash），未来 AOT 仅替换工件生产方式，不改变 schema 与证据口径。

**Independent Test**: 在不引入任何构建期工具链的前提下，core-ng 能生成包含 `execIrVersion/execIrHash` 的 Exec IR 摘要，并能稳定对比（同输入 → 同 hash）。

- [x] T023 [US3] 固化 Exec IR 工件 schema（`execIrVersion/execIrHash` + 最小可序列化摘要）并接入 light/full evidence（off 不输出）`packages/logix-core-ng/src/*`、`packages/logix-core/src/internal/observability/*`
- [x] T024 [P] [US3] 新增测试：Exec IR 摘要可序列化且 `execIrHash` 对同输入稳定 `packages/logix-core-ng/test/*`

---

## Phase 6: Polish & Cross-Cutting

- [x] T030 [P] 回写 046 registry：把 049 状态更新为 implementing/done（取决于证据），并补齐证据链接 `specs/046-core-ng-roadmap/spec-registry.md`

---

## Dependencies & Execution Order

- Setup（Phase 1）完成后进入 Foundational（Phase 2）；Phase 2 阻塞所有 User Story。
- User Story 1/2/3 在 Phase 2 完成后可并行推进；建议先完成 US1（热路径命中）再做 US2（证据门禁）与 US3（AOT-ready 扩展）。
- 证据门禁（US2）结论必须同时覆盖 Node 与 Browser（任一 FAIL 则整体 FAIL）。

## Parallel Opportunities（examples）

- US2：T020/T021 可在同一 dev 工作区顺序采集（保持 matrix/config/env 一致），随后再做 T022 diff 与回写结论。
- US3：T023（实现）与 T024（测试）可并行起草，但 T024 需等 T023 有最小可运行实现后再收敛断言。

## Implementation Strategy

- MVP（P1）优先顺序：Phase 1 → Phase 2 → US1（至少 1 条 converge/txn 关键路径命中）→ US2（Node+Browser Gate）
- 扩展（P2）：US3（AOT-ready 工件口径与稳定 hash）→ Polish（回写 046 registry）
