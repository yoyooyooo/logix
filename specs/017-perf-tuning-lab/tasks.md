# Tasks: 017 调参实验场（基于 014 跑道，消费 013 控制面）

**Input**: `specs/017-perf-tuning-lab/*`（`spec.md`/`plan.md`/`quickstart.md`/`knobs.md`/`testing.md`）

**Context**: 目前已具备 `traitConvergeBudgetMs/traitConvergeDecisionBudgetMs` 的 sweep + 推荐默认值产物（`recommendation.latest.md|json`）。本任务列表只覆盖“基于现状仍未完成/待收口”的部分。

## Phase 1: Setup（无需新增基础设施）

（当前无）

---

## Phase 2: Foundational（文档与流程合规收口）

- [x] T001 [P] 补齐 017 的 Constitution Check 与质量门槛说明于 `specs/017-perf-tuning-lab/plan.md`

---

## Phase 3: User Story 1 - 用参数 sweep 找到“最佳默认值”并给出证据 (Priority: P1) 🎯

**Goal**: 扩大 sweep 覆盖面，并让每个候选的“可比较摘要”更可审计（满足 FR-002/FR-006 的可解释性要求）。

**Independent Test**: 运行 `pnpm perf tuning:recommend -- --profile quick` 能生成 `specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md|json`，且每个候选都能在汇总里看到阈值/失败原因（无需打开原始 report 才能知道“为何不可比”）。

- [x] T002 [US1] 将 `traitConvergeBudgetMs` 纳入 sweep candidate 与推荐配置输出：`pnpm perf tuning:recommend`
- [x] T003 [US1] 扩充候选摘要：在 `recommendation.latest.json` 中为每个切片输出 `firstFailLevel`/`reason` 等阈值失败信息：`pnpm perf tuning:recommend`
- [x] T004 [US1] 明确硬门结果：在推荐汇总里显式记录 `auto<=full*1.05` 的通过/失败与失败原因（不要只靠“collect 退出码”）：`pnpm perf tuning:recommend`
- [x] T005 [US1] 支持 sweep 多个 suite：增加 `--files`（透传给 collect）以便逐步把更多跑道纳入推荐：`pnpm perf tuning:recommend`
- [x] T006 [US1] 更新候选参数写法与“模拟旧状态/回退基线”配方说明：`specs/017-perf-tuning-lab/quickstart.md`

---

## Phase 4: User Story 2 - 评审者可复现与可审计 (Priority: P2)

**Goal**: 让结论自带“复现所需信息”（profile/matrix 版本/环境指纹/复现命令），减少口头约定。

**Independent Test**: 拿到 `recommendation.latest.json` 的用户能在同机同配置下复跑并得到等价 winner；如果不等价，汇总能指出“不确定性来源”。

- [x] T007 [US2] 在 `recommendation.latest.json` 中写入复现信息（matrixId、matrixFile、profile、候选集合、复现命令建议、以及 winner report 的 `meta.git/meta.env` 摘要）：`pnpm perf tuning:recommend`
- [x] T008 [US2] 增加“稳定性确认”开关：当 winner 贴近阈值或与次优差距很小，支持自动用 `profile=default` 复跑 winner（或 top2）并把确认结果写入汇总：`pnpm perf tuning:recommend`

---

## Phase 5: User Story 3 - LLM 可自动读懂并生成结论摘要 (Priority: P3)

**Goal**: 让人/LLM 都能稳定读懂推荐结论，并可追溯到证据来源。

**Independent Test**: 将 `recommendation.latest.md|json` 路径交给 LLM，能输出固定格式总结（通过/回归/提升/不确定性/建议下一步），且每条结论能指向证据文件路径与切片维度。

- [x] T009 [US3] 为 recommendation 增加面向 LLM 的固定格式提示词模板：`specs/014-browser-perf-boundaries/perf/tuning/README.md`
- [x] T010 [US3] 在 `recommendation.latest.json` 增加机器可读 `summary`（硬门是否通过、winner 评分、不可比候选数量与原因分布、建议下一步）：`pnpm perf tuning:recommend`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T011 [P] 对齐旋钮清单与覆盖情况：把新增旋钮（如纳入 `traitConvergeBudgetMs`）同步到 `specs/017-perf-tuning-lab/knobs.md` 与 `specs/017-perf-tuning-lab/testing.md`
- [x] T012 [P] 补齐 017 文档入口互引（README/014 perf/产物目录）以避免双入口漂移：`specs/017-perf-tuning-lab/README.md`

---

## Dependencies & Execution Order

- Phase 2（T001）与 Phase 3/4/5 可并行推进，但建议优先完成（保证 017 文档“正规模板”合规）。
- US1（T002–T006）先于 US2/US3：先把候选摘要与硬门解释链路收口，再谈复现与 LLM 摘要。
- US2（T007–T008）依赖 US1 的汇总结构稳定（避免复现信息/稳定性确认字段频繁改名）。

## Parallel Examples

### US1

- 并行建议：先做 T002–T005（同一文件串行），同时起草 T006（文档），待代码字段定稿后再校对一次。

### US2

- 并行建议：T007 与 T008 都在同一脚本文件内，建议串行完成；可以与 T009（文档）并行。

### US3

- 并行建议：T009（文档提示词模板）与 T010（JSON summary 字段）可并行推进，最后以 `recommendation.latest.json` 的最终字段为准统一校对。
