# Tasks: 054 core-ng Wasm Planner（可选极致路线）

**Input**: `specs/054-core-ng-wasm-planner/*`（`spec.md`/`plan.md`/`quickstart.md`）

> 当前状态：`frozen`。本任务清单仅保留“解冻触发条件（Phase 2）”与后续预案；在未解冻前不要执行 Phase 3+。

## Phase 1: Setup（shared）

- [x] T001 [P] 补齐 spec-kit 最小产物（plan/tasks/quickstart）
- [x] T002 [P] 回写 046 registry：`054` 状态从 `idea` → `frozen`

---

## Phase 2: Trigger Check（是否允许启动实现）

- [x] T010 先完成 059 的 JS baseline 证据（Node+Browser），确认“仍不足且瓶颈主导为 GC/Map/Set”（结论：059 已达标且无回归证据；未触发 Wasm 启动条件，保持 `frozen`）证据：`specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-072950.default.json`、`specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-072950.default.json`
- [x] T011 明确 Wasm 的触发阈值与停止条件（触发：P1 suites 出现 budgetViolations，且 CPU profile 显示 Map/Set/对象分配为主导；停止：bridge tax（Wasm↔JS）成为新主导或收益不足，立即回退到 059 的 JS baseline 并记录原因）

---

## Phase 3: Design（boundary + bridge tax）

- [ ] T020 切割边界：先只覆盖 reachability（最小范围），禁止把 plan 编译一并塞进 Wasm
- [ ] T021 设计跨边界数据结构（handles + buffers + offsets）；明确哪些 buffer 复用、何时清零
- [ ] T022 设计 fallback reasonCode（稳定枚举码）；strict gate 可升级 FAIL

---

## Phase 4: Implementation（trial-only）

- [ ] T030 实现 core-ng 的 Wasm planner 注入（装配期初始化；txn 内只调用同步 compute）
- [ ] T031 实现 bridge tax 计量与证据字段（Slim、可序列化；off 近零成本）
- [ ] T032 实现 JS fallback（Wasm 不可用/超预算/失败）并保证可解释

---

## Phase 5: Evidence（Browser MUST）

- [ ] T040 [P] 采集 Browser before/after/diff（P1 suites）并满足 `comparable=true && regressions==0`
- [ ] T041 [P] 复核 bridge tax：确保不是新主导；否则回退并记录停止原因

---

## Phase 6: Closeout（registry）

- [ ] T050 [P] 证据达标后回写 046 registry：`054` 状态更新为 `done` 并补齐证据链接（否则保持 draft/或冻结）
