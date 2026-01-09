# Tasks: 092 E2E Latency Trace

**Input**: `specs/092-e2e-latency-trace/spec.md`, `specs/092-e2e-latency-trace/plan.md`  
**Prerequisites**: `specs/088-async-action-coordinator/`、`specs/089-optimistic-protocol/`、`specs/090-suspense-resource-query/`  
**Tests**: 必须包含 diagnostics off/on 的回归门禁与 browser-level 断言。

## Phase 1: Setup（文档与展示入口）

- [ ] T001 补齐用户文档：如何读懂 E2E trace（segment 解释、采样开关、常见瓶颈）`apps/docs/content/docs/guide/advanced/e2e-trace.md`
- [ ] T002 Devtools UI 信息架构：从 action run drill-down 到 E2E timeline 的入口设计（最小可用）`packages/logix-devtools-react/src/internal/ui/*`

---

## Phase 2: Foundational（事件模型 + 采样控制面）

- [ ] T009 [Decomposition] 新增互斥子模块 `TraceE2E`（只放类型/纯函数/常量；不改运行行为）`packages/logix-core/src/internal/runtime/core/TraceE2E.ts`
- [ ] T010 定义 `trace:e2e` 的 Slim 事件模型（segments + reason + stable ids；light tier 也保留 Slim meta）`packages/logix-core/src/internal/runtime/core/TraceE2E.ts` + `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`（薄接线）
- [ ] T011 定义采样控制面（开关/比例/白名单），并挂到 Runtime.devtools options（复用 `sampling`）`packages/logix-core/src/Runtime.ts`
- [ ] T012 ring buffer 有界：确认 DevtoolsHub 的容量/快照裁剪策略，并补齐可配置项 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

---

## Phase 3: User Story 1（P1）串联 action→txn→notify→commit

**Goal**: 一条 action run 的端到端时间线可解释，并能定位瓶颈段。

**Independent Test**: 在示例中分别注入四类瓶颈，trace 能区分主要段。

- [ ] T020 [US1] 在 action runtime 侧记录关键时间点与关联信息（pending/io:wait/settle + 关联 txnId/opSeq）`packages/logix-core/src/internal/runtime/core/ActionRuntime.ts`（依赖 088）
- [ ] T021 [US1] 在 notify 侧记录 delay/合并信息（priority/raf/timeout 等原因）`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- [ ] T022 [US1] React commit 采样：记录 commit（可选 paint）时间点，并与 action 链路 id 关联（必须可关）`packages/logix-react/src/internal/hooks/useModule.ts`
- [ ] T023 [US1] Devtools UI：展示 E2E timeline（按 segment 排列 + 主要瓶颈高亮）`packages/logix-devtools-react/src/internal/ui/E2ETraceView.tsx`（新建）
- [ ] T024 [US1] React no tearing 断言：同一 commit 内 E2E trace 关联的快照锚点一致（不出现“同屏新旧快照混读”）`packages/logix-react/test/internal/E2ETrace.noTearing.test.tsx`（新建）

---

## Phase 4: User Story 2（P2）回归门禁（off/on 对照）

**Goal**: diagnostics off 近零成本；on 下开销可度量并在预算内。

**Independent Test**: perf workload 下能产出可比 before/after/diff。

- [ ] T030 [US2] 增加 perf workloads：off/on 对照，覆盖 notify/commit 路径 `specs/092-e2e-latency-trace/perf/*`
- [ ] T031 [US2] 自动化断言：off 下不产出 trace（或极少），on 下产出且可序列化 `packages/logix-core/test/internal/Observability/E2ETrace.OffOn.test.ts`（新建）

---

## Phase 5: User Story 3（P3）采样与体积控制

**Goal**: 采样可控，事件体积有界，隐私/敏感信息不过载。

**Independent Test**: 采样率调整后事件数量按预期变化；payload 始终可序列化。

- [ ] T040 [US3] 实现采样策略（比例/白名单）并补齐测试 `packages/logix-core/src/internal/runtime/core/TraceE2E.ts`
- [ ] T041 [US3] 实现 payload downgrade/裁剪规则并记录原因字段 `packages/logix-core/src/internal/runtime/core/TraceE2E.ts`
