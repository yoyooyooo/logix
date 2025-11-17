# Tasks: 062 Txn Lanes 默认开启（迁移与回退口径）

**Input**: `specs/062-txn-lanes-default-switch-migration/*`（`spec.md`/`plan.md`/`tasks.md`/`quickstart.md`/`contracts/*`）  
**Prerequisites**: `060`（Txn Lanes 已实现且可证据化）+ `052`（diagnostics=off gate 已达标）

## Phase 1: Setup（Shared）

- [x] T001 创建证据落点目录 `specs/062-txn-lanes-default-switch-migration/perf/.gitkeep`
- [x] T002 [P] 固化迁移 playbook（默认开启步骤 + 回退步骤 + 失败口径 + 证据门槛）`specs/062-txn-lanes-default-switch-migration/contracts/migration-playbook.md`
- [x] T003 [P] 对齐 quickstart（含 fail-fast 与证据门槛）`specs/062-txn-lanes-default-switch-migration/quickstart.md`

---

## Phase 2: Foundational（Blocking）

- [x] T010 切默认：默认开启 Txn Lanes（default-on），并保持 override 优先级（provider > runtime_module > runtime_default > builtin）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`、`packages/logix-core/src/Runtime.ts`
- [x] T011 回退口径：确保 `overrideMode=forced_off|forced_sync` 在证据里可解释（含 configScope/override 字段）`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T012 用户文档更新：说明“默认开启”、什么时候用、怎么回退、怎么验证生效 `apps/docs/content/docs/guide/advanced/txn-lanes.md`

---

## Phase 3: Tests（Default + Rollback）

- [x] T020 [P] 默认开启测试：未显式配置时 enabled=true（并可从 evidence 里读到）`packages/logix-core/test/*`
- [x] T021 [P] 回退测试：forced_off 等价关闭；forced_sync 行为可解释 `packages/logix-core/test/*`

---

## Phase 4: Perf Evidence（Node + Browser）

- [x] T030 [P] Browser before（off）落盘 `specs/062-txn-lanes-default-switch-migration/perf/before.browser.*.json`
- [x] T031 [P] Browser after（default-on）落盘 `specs/062-txn-lanes-default-switch-migration/perf/after.browser.*.json`
- [x] T032 [P] Browser diff（off vs default-on）且 `summary.regressions==0` `specs/062-txn-lanes-default-switch-migration/perf/diff.browser.*.json`
- [x] T033 [P] Node before/after/diff（off vs default-on）且 `summary.regressions==0` `specs/062-txn-lanes-default-switch-migration/perf/diff.node.*.json`
- [x] T034 回写结论摘要到 quickstart `specs/062-txn-lanes-default-switch-migration/quickstart.md`

---

## Phase 5: Polish & Cross-Cutting

- [x] T040 [P] 回写 046 registry：更新 062 状态（planned→implementing→done）并补齐证据链接 `specs/046-core-ng-roadmap/spec-registry.md`
