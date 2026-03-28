# Tasks: Adaptive Auto-Converge Controller

**Input**: Design documents from `/specs/111-adaptive-auto-converge-controller/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Problem Framing & Route Gate

目标：先把 `111` 放回 `110` + `013` 的现有边界里，再决定能否进入 shadow / PoC。

- [x] T001 新建 `specs/111-adaptive-auto-converge-controller/spec.md`
- [x] T002 新建 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T003 新建 `specs/111-adaptive-auto-converge-controller/tasks.md`
- [x] T004 盘点现有 static heuristic、现有 `TraitConvergeDecisionSummary` 字段、已知漂移证据，在 `specs/111-adaptive-auto-converge-controller/spec.md` 与 `plan.md` 中回写 baseline
- [x] T005 在 `specs/111-adaptive-auto-converge-controller/spec.md` 与 `plan.md` 中回写 `110` 进入门、`013` 契约 baseline、shadow-only first 约束
- [x] T006 为 `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts` 产出 Decomposition Brief，并先明确无损拆分与语义改造的边界

## Phase 2: User Story 2 - Explainable Telemetry Contract

目标：先定义 single-source telemetry contract，再谈 adaptive strategy。

- [x] T101 定义 controller 最小 telemetry baseline，明确复用 `TraitConvergeDecisionSummary` / `trace:trait:converge` 的哪些字段，落到 `specs/111-adaptive-auto-converge-controller/spec.md`
- [x] T102 定义 additive adaptive 字段、always-on 与 sampled / shadow 的边界，落到 `specs/111-adaptive-auto-converge-controller/spec.md` 与 `plan.md`
- [x] T103 定义 `envBucket`、`bandKey`、`moduleId`、per-band state 的作用域和寿命，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T104 定义 telemetry 如何进入 diagnostics / dated reading / PerfDiff，且不生成第二套 truth source，落到 `specs/111-adaptive-auto-converge-controller/plan.md`

## Phase 3: User Story 1 - Cost Model, Fallback, Shadow

目标：先形成 shadow 可验证的 controller，再讨论 live candidate。

- [x] T201 定义 `fullCostEstimate` / `dirtyCostEstimate`、`safetyMargin` 与 fallback ladder，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T202 定义 hard rules 与 controller 的边界，明确 `cold_start / dirty_all / unknown_write / budget_cutoff` 永远优先，落到 `specs/111-adaptive-auto-converge-controller/spec.md`
- [x] T203 定义 low-frequency exploration 机制、预算上限、回滚策略，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T204 定义 generation bump / cache thrash 降权策略与 band state 失真保护，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T205 定义 telemetry-only / shadow-mode PoC 的输入、输出、比较口径，落到 `specs/111-adaptive-auto-converge-controller/plan.md`

## Phase 4: User Story 3 - Safe Rollout & Validation Ladder

目标：把 cheap local、heavier local、PR / CI last 写成明确执行门。

- [x] T301 定义 `main` 控制线下的 cheap local 验证矩阵，覆盖 `bench:traitConverge:node` 与 focused same-node suites，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T302 定义 heavier local 验证矩阵，覆盖 full soak、高 dirty rerun、browser long-run / suite progression probe，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T303 定义 PR / CI last 的前置门、运行目的声明、目标分支 / PR 约束，落到 `specs/111-adaptive-auto-converge-controller/plan.md`
- [x] T304 定义 replay 到 `v4-perf` 的前置门与 user-facing docs / mental model 的同步点，落到 `specs/111-adaptive-auto-converge-controller/spec.md` 与 `plan.md`

## Phase 5: Implementation-Readiness Hardening

目标：把 `111` 从规划说明压到可实施状态，但仍保持 shadow-only。

- [x] T401 在 `spec.md` 与 `plan.md` 中写明 `planning_active / shadow_code_poc_ready / live_candidate=blocked`
- [x] T402 新建 `specs/111-adaptive-auto-converge-controller/data-model.md`
- [x] T402b 新建 `specs/111-adaptive-auto-converge-controller/heuristic-inventory.md`
- [x] T403 新建 `contracts/adaptive-converge-band-state.schema.json`
- [x] T404 新建 `contracts/adaptive-converge-shadow-summary.schema.json`
- [x] T405 新建 `checklists/quality-gates.md`

## Phase 6: Next Actionable Packages

目标：把下一轮真正可执行的任务包写出来，而不是只停在设计完成。

- [x] T501 同步消费 `110` 的最新 ledger / residual latest / `TX-C1` / `E-1B` 事实，回写 `111` 进入门
- [x] T502 消费 `E-1B browser long-run capture-order sensitivity` clean docs-only scout 的结论，回写 `111` 当前 blocker
- [x] T503 完成 `main` static heuristic drift inventory，至少覆盖 `getNearFullRootRatioThreshold`、`AUTO_FLOOR_RATIO`、`MAX_CACHEABLE_ROOT_RATIO`、`NO_CACHE_NEAR_FULL_STEP_THRESHOLD`、`NEAR_FULL_PLAN_RATIO_THRESHOLD`
- [x] T504 基于 `E-1B + drift inventory` 形成 entry decision，当前结论更新为 `inconclusive_after_clean_scout`，对应状态为 `shadow_code_poc_ready / live_candidate=blocked`
- [x] T505 冻结 `telemetry-only / shadow-mode` 最小 PoC 包，当前允许在 `inconclusive_after_clean_scout` 下推进 additive shadow-only candidate；write scope 只允许 `converge-in-transaction.impl.ts`、`model.ts` 与必要的 `013` 契约字段
- [ ] T506 在 isolated shadow-only candidate 上先跑 `bench:traitConverge:node` 与 focused same-node quick，只验证 `executedMode` 不变、shadow telemetry 可解释
- [ ] T507 cheap local 稳定后再进入 heavier local；browser long-run 继续作为 veto gate，live candidate 讨论后移到 future residual refresh
