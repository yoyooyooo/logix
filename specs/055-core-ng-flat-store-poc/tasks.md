# Tasks: 055 core-ng Flat Store PoC（arena/SoA/handle 化）

**Input**: `specs/055-core-ng-flat-store-poc/*`（`spec.md`/`plan.md`/`quickstart.md`）

> 当前状态：`frozen`。本任务清单仅保留“解冻触发条件（Phase 2）”与后续预案；在未解冻前不要执行 Phase 3+。

## Phase 1: Setup（shared）

- [x] T001 [P] 补齐 spec-kit 最小产物（plan/tasks/quickstart）
- [x] T002 [P] 回写 046 registry：`055` 状态从 `idea` → `frozen`

---

## Phase 2: Pilot Selection（先 PoC 后扩面）

- [x] T010 选定试点模块与范围（收益最大且风险最小），并明确“非试点”范围（避免扩面失控）
  - 试点：`patch/dirties/dirtyRoots` 数据面（从 “JS 对象/数组集合” → “flat arena（SoA + integer handles）”）
  - 入口候选：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts` → `packages/logix-core/src/internal/state-trait/converge.ts`（txn commit 热路径）
  - 非试点（强约束）：不改状态对象模型/Reducer 语义；不改 public API；不扩到 planner/exec-vm 主循环；默认路径不受影响（trial-only）
- [x] T011 定义 handle 约束与稳定性策略（对齐 050），以及与现有对象模型的边界
  - handles：只允许稳定整型 id（例如 `FieldPathId`/`ReasonCode`/`StepId`）；禁止把对象引用当 handle
  - 边界：flat arena 仅承载 “dirty roots / patch recording” 的中间表示；对外仍以统一最小 IR/Trace 解释与回放
  - 回退：PoC 不达标或出现长尾/回归时，必须可切回旧实现并输出稳定 reasonCode（strict gate 下可 FAIL）

---

## Phase 3: Design（arena/SoA + IR mapping）

- [ ] T020 设计 flat store 数据模型（arena/SoA/handles）与 snapshot/rollback 策略
- [ ] T021 设计 IR/Trace 映射：如何把 flat 结构解释回统一最小 IR（禁止并行真相源）
- [ ] T022 设计 fallback/回退口径：无法达标必须可回到旧实现且原因可解释

---

## Phase 4: Implementation（trial-only）

- [ ] T030 实现 core-ng trial-only 注入（默认路径不受影响）
- [ ] T031 接入试点热路径（只覆盖试点范围；其余保持旧实现）
- [ ] T032 证据字段接入：light/full 输出最小摘要；off 不输出（近零成本）

---

## Phase 5: Evidence（Node + Browser）

- [ ] T040 [P] 采集 before/after/diff（Node + Browser；P1 suites）并满足 `comparable=true && regressions==0`
- [ ] T041 [P] 关注长尾与 heap/alloc delta：若收益不足或长尾恶化则停止并回退

---

## Phase 6: Closeout（registry）

- [ ] T050 [P] 证据达标后回写 046 registry：`055` 状态更新为 `done` 并补齐证据链接（否则保持 draft/或冻结）
