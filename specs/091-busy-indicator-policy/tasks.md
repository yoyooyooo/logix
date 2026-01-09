# Tasks: 091 Busy Indicator Policy

**Input**: `specs/091-busy-indicator-policy/spec.md`, `specs/091-busy-indicator-policy/plan.md`  
**Prerequisites**: `specs/088-async-action-coordinator/`（ActionRun pending 作为事实源）  
**Tests**: UI 行为与时间语义必须有自动化覆盖（避免回归与手写计时器复发）。

## Phase 1: Setup（文档与默认参数）

- [ ] T001 补齐用户文档：busy 的默认参数与心智模型（≤5 关键词 + 何时显示/不显示）`apps/docs/content/docs/guide/advanced/busy-indicator.md`
- [ ] T002 定义默认参数候选并记录理由（delay/minDuration）`specs/091-busy-indicator-policy/research.md`

---

## Phase 2: Foundational（BusyPolicy + 去重调度）

- [ ] T010 实现 BusyPolicy（纯函数/纯配置）：delay/minDuration/（可选）maxDelay `packages/logix-react/src/internal/busy/BusyPolicy.ts`
- [ ] T011 实现去重调度：同一 boundary 内只维护 0/1 个计时器链路，避免风暴 `packages/logix-react/src/internal/busy/BusyScheduler.ts`（新建）
- [ ] T012 单测：BusyPolicy 的纯行为（不同耗时序列 → 显示/隐藏时机）`packages/logix-react/test/internal/busy/BusyPolicy.test.ts`（新建）

---

## Phase 3: User Story 1（P1）BusyBoundary（MVP）

**Goal**: 快操作无 busy；慢操作有稳定 busy。

**Independent Test**: delay/minDuration 行为可自动化断言。

- [ ] T020 [US1] 实现 BusyBoundary（聚合 pending 源 + 应用 BusyPolicy）`packages/logix-react/src/internal/busy/BusyBoundary.tsx`
- [ ] T021 [US1] React 测试：快/慢两种耗时下 busy 行为符合 SC-001 `packages/logix-react/test/BusyBoundary.DelayMinDuration.test.tsx`（新建）

---

## Phase 4: User Story 2（P2）业务接入点（Action Props / hooks）

**Goal**: 业务不写计时器，仅声明 action/resource 即可。

**Independent Test**: 示例业务代码中无 setTimeout/最短显示逻辑。

- [ ] T030 [US2] 提供 `useBusy` / `useBusyState`：从 ActionRun/Resource 聚合 pending `packages/logix-react/src/internal/hooks/useBusy.ts`（新建）
- [ ] T031 [US2] 提供最小 Action Props 组件示例（可选）`packages/logix-react/src/ActionButton.tsx`（新建或放 examples）

---

## Phase 5: User Story 3（P3）并发/嵌套/可访问性

**Goal**: 并发与嵌套可预测；默认可访问。

**Independent Test**: 并发/嵌套用例可自动化断言；aria 语义存在。

- [ ] T040 [US3] 嵌套裁决策略（外层聚合/内层局部）并补齐测试 `packages/logix-react/src/internal/busy/BusyBoundary.tsx`
- [ ] T041 [US3] React 测试：并发/嵌套下避免 over-feedback `packages/logix-react/test/BusyBoundary.Nesting.test.tsx`
- [ ] T042 [US3] 可访问性：默认输出最小 aria 语义并补齐测试 `packages/logix-react/test/BusyBoundary.A11y.test.tsx`
