# Tasks: 053 core-ng AOT Artifacts（Static IR / Exec IR 工件化）

**Input**: `specs/053-core-ng-aot-artifacts/*`（`spec.md`/`plan.md`/`quickstart.md`）

> 当前状态：`frozen`。本任务清单仅保留“解冻触发条件（Phase 2）”与后续预案；在未解冻前不要执行 Phase 3+。

## Phase 1: Setup（shared）

- [x] T001 [P] 补齐 spec-kit 最小产物（plan/tasks/quickstart）
- [x] T002 [P] 回写 046 registry：`053` 状态从 `idea` → `frozen`

---

## Phase 2: Trigger Check（是否允许启动实现）

- [x] T010 用现有 Node+Browser 证据确认“解释层/预编译成本是否主导”（结论：当前 P1 suites 已达标，且现有 perf matrix 未覆盖“装配期/冷启动成本分解”；保持 `frozen`）证据：`specs/049-core-ng-linear-exec-vm/perf/diff.node.core-ng.execVm.off__on.converge.txnCommit.darwin-arm64.default.json`、`specs/049-core-ng-linear-exec-vm/perf/diff.browser.core-ng.execVm.off__on.matrixP1.darwin-arm64.default.json`
- [x] T011 明确“runtime 手段难以再降”的判据（判据：在完成 049/050/051/056/059 后，P1 suites 仍出现 budgetViolations 或长尾显著恶化，且 CPU/heap 证据指向“构造期预编译/解释层”主导；否则保持 `frozen`）

---

## Phase 3: Design（artifact schema + fallback）

- [ ] T020 固化 artifact schema（`artifactVersion/artifactHash` + minimal summary + 所属 kernelId）
- [ ] T021 固化 fallback reasonCode（稳定枚举码；strict gate 可升级 FAIL）
- [ ] T022 设计装配期注入边界（Layer/Tag）：加载/校验/注入与 JIT 路径如何组合（不得 txn 内 IO）

---

## Phase 4: Implementation（toolchain + runtime loader）

- [ ] T030 选择最小工具链落点（先从“生成 JSON 工件”开始；不要求绑定具体 bundler）
- [ ] T031 实现 runtime loader（装配期加载/校验；失败回退 JIT 并证据化）
- [ ] T032 Browser/Sandbox 资源路径与缓存策略：确保可解释、可复现、可对照

---

## Phase 5: Evidence（Node + Browser）

- [ ] T040 [P] 采集 before/after/diff（Node + Browser；P1 suites）并满足 `comparable=true && regressions==0`
- [ ] T041 [P] 覆盖 fallback：模拟工件缺失/校验失败仍可运行且 reasonCode 可解释（strict gate 下可 FAIL）

---

## Phase 6: Closeout（registry）

- [ ] T050 [P] 证据达标后回写 046 registry：`053` 状态更新为 `done` 并补齐证据链接
