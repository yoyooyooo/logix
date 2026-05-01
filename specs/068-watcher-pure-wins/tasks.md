# Tasks: 068 Watcher 纯赚性能优化（全量交付）

**Input**: Design documents from `specs/068-watcher-pure-wins/`
**Prerequisites**: `specs/068-watcher-pure-wins/plan.md`, `specs/068-watcher-pure-wins/spec.md`

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Add perf evidence index doc in `specs/068-watcher-pure-wins/perf/README.md`
- [ ] T002 [P] Register 068 perf scripts in `packages/logix-perf-evidence/package.json`
- [ ] T003 [P] Add Node perf bench suite in `packages/logix-perf-evidence/scripts/068-watcher-pure-wins.watcher-fanout.node.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define watcher/topic routing contract hooks in `packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
- [ ] T005 Implement internal watcher counters (start/stop/snapshot) in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [ ] T006 [P] Add shared watcher test harness in `packages/logix-core/test/internal/Watcher/WatcherHarness.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Watcher 压力可回归（防泄漏/防灾难退化） (Priority: P1) 🎯

**Goal**: 新增可回归压力用例，能稳定发现“watcher/订阅/Fiber 泄漏”与灾难性退化，并给出可解释锚点。

**Independent Test**: 在单模块与多模块场景下，高频触发后资源指标不继续增长；销毁/回收后指标回落且无事件外溢。

- [ ] T007 [US1] Emit watcher lifecycle counters from `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- [ ] T008 [US1] Add core regression test (single module pressure) in `packages/logix-core/test/Flow/WatcherPressure.singleModule.test.ts`
- [ ] T009 [US1] Add core regression test (multi module + destroy) in `packages/logix-core/test/Flow/WatcherPressure.multiModuleDestroy.test.ts`
- [ ] T010 [US1] Add browser perf boundary for watcher pressure in `packages/logix-react/test/browser/perf-boundaries/watcher-pressure.test.tsx`

---

## Phase 4: User Story 2 - Action 分发不被无关 watcher 拖慢 (Priority: P1)

**Goal**: `$.onAction("tag")` 不再依赖全量广播 + filter；无关 tag watcher 不参与触达与背压。

**Independent Test**: dispatch 目标 tag 时，无关 tag watcher 不触发；并可通过 perf evidence 证明“无关 watcher 增长不导致灾难性退化”。

- [ ] T011 [US2] Add per-tag topic hubs to runtime in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [ ] T012 [US2] Route dispatch publish to tag topic hubs in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- [ ] T013 [US2] Switch `$.onAction("tag")` to topic stream in `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- [ ] T014 [US2] Add unit test for cross-tag isolation in `packages/logix-core/test/Bound/Bound.onAction.tagTopic.test.ts`
- [ ] T015 [US2] Wire Node perf bench to 068 suite in `packages/logix-perf-evidence/scripts/068-watcher-pure-wins.watcher-fanout.node.ts`

---

## Phase 5: User Story 3 - State 订阅支持“声明依赖 → 增量通知” (Priority: P2)

**Goal**: `$.onState(selector)` 在可声明依赖时走增量通知；无关字段提交不触发 handler；不可声明时安全回退并可门禁。

**Independent Test**: 对静态可推导 selector，“无关字段提交”时 handler 触发次数为 0；动态 selector 能安全回退且可被 strict gate 观测。

- [ ] T016 [US3] Route `$.onState` through ReadQuery/SelectorGraph in `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- [ ] T017 [US3] Align Flow `fromState` routing in `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
- [ ] T018 [US3] Add regression test (static lane skip on unrelated dirtySet) in `packages/logix-core/test/ReadQuery/ReadQuery.onState.staticLaneSkip.test.ts`
- [ ] T019 [US3] Add regression test (dynamic lane fallback + strict gate) in `packages/logix-core/test/ReadQuery/ReadQuery.onState.dynamicLaneGate.test.ts`

---

## Phase 6: User Story 4 - 编译期优化可选且可回退（宁可放过不可错杀） (Priority: P2)

**Goal**: 不配置任何构建期插件也能正确运行；显式启用编译期优化时仅对可证明语义等价的子集生效，其余自动回退并可解释。

**Independent Test**: 同一套核心用例在 `compilationEnhancement=off` 与 `compilationEnhancement=on` 下行为一致；`dynamic lane` 场景稳定回退并输出原因锚点。

- [ ] T020 [US4] Define optional compilation artifacts contract + strict gate knobs in `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- [ ] T021 [US4] Prefer precompiled artifacts when enabled; fallback to JIT/dynamic lane when unsure in `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- [ ] T022 [US4] Add regression test (on/off equivalence + fallback reason anchors) in `packages/logix-core/test/ReadQuery/ReadQuery.compilationEnhancement.onoff.test.ts`
- [ ] T023 [US4] Add perf suite C scaffolding in `packages/logix-perf-evidence/scripts/068-watcher-pure-wins.compilation-onoff.node.ts`

---

## Phase 7: Propagation IR & Closure Taxonomy（契约固化）

**Purpose**: 固化传播 IR/闭包分型的“契约与证据口径”，作为后续优化的单一事实源（不交付新的执行后端）。

- [ ] T024 Add propagation IR contract doc in `specs/068-watcher-pure-wins/contracts/propagation-ir-contract.md`
- [ ] T025 Add closure taxonomy contract doc in `specs/068-watcher-pure-wins/contracts/closure-taxonomy-contract.md`

---

## Phase 8: Evidence, Docs & Polish

- [ ] T026 [P] Update watcher docs to reflect topic-index + ReadQuery routing in `docs/ssot/runtime/logix-core/impl/04-watcher-performance-and-flow.01-dispatch-to-handler.md`
- [ ] T027 [P] Update draft perf regression suite to include 068 coverage in `docs/specs/drafts/topics/runtime-v3-core/03-perf-regression-suite.md`
- [ ] T028 Collect before Node perf evidence to `specs/068-watcher-pure-wins/perf/before.node.watcher.fanout.<envId>.default.json`
- [ ] T029 Collect after Node perf evidence to `specs/068-watcher-pure-wins/perf/after.node.watcher.fanout.<envId>.default.json`
- [ ] T030 Diff Node perf evidence to `specs/068-watcher-pure-wins/perf/diff.node.watcher.fanout.before__after.json`
- [ ] T031 Collect before browser perf evidence to `specs/068-watcher-pure-wins/perf/before.browser.watcher.pressure.<envId>.default.json`
- [ ] T032 Collect after browser perf evidence to `specs/068-watcher-pure-wins/perf/after.browser.watcher.pressure.<envId>.default.json`
- [ ] T033 Diff browser perf evidence to `specs/068-watcher-pure-wins/perf/diff.browser.watcher.pressure.before__after.json`
- [ ] T034 Collect before Node compilation on/off evidence (Suite C) to `specs/068-watcher-pure-wins/perf/before.node.compilation-onoff.<envId>.default.json`
- [ ] T035 Collect after Node compilation on/off evidence (Suite C) to `specs/068-watcher-pure-wins/perf/after.node.compilation-onoff.<envId>.default.json`
- [ ] T036 Diff Node compilation on/off evidence (Suite C) to `specs/068-watcher-pure-wins/perf/diff.node.compilation-onoff.before__after.json`
- [ ] T037 Write conclusions and link all artifacts in `specs/068-watcher-pure-wins/perf/README.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (US1/US2/US3/US4 in parallel) → Phase 7 → Phase 8
- US1/US2/US3/US4 都依赖 Phase 2（需要统一的内部计数/路由钩子与测试 harness）

## Parallel Opportunities

- Phase 1 的 T001/T002/T003 可并行
- Phase 8 的文档更新（T026/T027）可与 perf evidence 采集（T028~T037）并行推进
