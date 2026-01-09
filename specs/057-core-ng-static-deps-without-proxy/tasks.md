# Tasks: 057 ReadQuery/SelectorSpec + SelectorGraph（静态 deps / 无 Proxy）

**Input**: Design documents from `specs/057-core-ng-static-deps-without-proxy/`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）

**Tests**: 本特性会触及 `@logixjs/core` / `@logixjs/react` / `@logixjs/devtools-react` 的核心路径与诊断协议；默认视为 REQUIRED（除非在对应 task 内写清为何可缺失）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 仅 User Story phases 必须标注（`[US1]`/`[US2]`/`[US3]`/`[US4]`）
- 每条任务描述必须包含精确文件路径

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 创建 057 的 perf 落点目录 `specs/057-core-ng-static-deps-without-proxy/perf/.gitkeep`
- [x] T002 [P] 预留 ReadQuery public submodule 文件 `packages/logix-core/src/ReadQuery.ts`
- [x] T003 [P] 在 core barrel 导出 ReadQuery `packages/logix-core/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: 本阶段未完成前，不开始任何 user story 实现（避免协议漂移与并行真相源）。

- [x] T004 定义 ReadQuery/SelectorSpec 的最小类型与 Static IR（lane/producer/fallbackReason/readsDigest/equalsKind）`packages/logix-core/src/ReadQuery.ts`
- [x] T005 定义 strict gate 配置入口（mode + requireStatic.selectorIds + denyFallbackReasons）`packages/logix-core/src/Runtime.ts`
- [x] T006 对齐 DebugSink 的 react-selector 投影字段（light/full Slim、可序列化）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T007 对齐 DebugSink 的 react-selector txn 对齐策略（优先用显式 txn；缺失时允许用 lastTxnByInstance 兜底对齐）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T008 对齐 FlowRuntime.fromState：支持 ReadQuery/SelectorSpec 输入（函数 selector 仍作为语法糖）`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`、`packages/logix-core/src/Flow.ts`
- [x] T009 [P] FlowRuntime.fromState 的 ReadQuery 分支语义测试 `packages/logix-core/test/Flow/FlowRuntime.fromState.ReadQuery.test.ts`

---

## Phase 3: User Story 1 - 继续允许函数 selector，但尽量静态化 (Priority: P1) 🎯 MVP

**Goal**: 仍允许 `(s)=>...` 写法；在常见“纯取数/struct”子集自动进入 static lane（AOT/JIT）；失败则 dynamic 并证据化。

**Independent Test**:

- `ReadQuery.compile((s)=>s.count)` 产出 `lane=static` 且 `reads=['count']`（或等价 id）
- `useSelector(handle, (s)=>({count:s.count,age:s.age}))` 在其它字段变化时返回对象引用复用（不要求用户传 shallow）
- 动态分支/调用导致无法静态化时，回退 dynamic 并给出 `fallbackReason`

### Tests

- [x] T010 [P] [US1] 覆盖 JIT 子集与 fallbackReason 的单测 `packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
- [x] T011 [P] [US1] 覆盖 struct memo（引用复用）的 React hook 测试 `packages/logix-react/test/Hooks/useSelector.structMemo.test.tsx`

### Implementation

- [x] T012 [US1] 实现 `ReadQuery.compile`（优先显式 ReadQuery → selectorFn 元数据 → 常见子集 parse → dynamic）`packages/logix-core/src/ReadQuery.ts`
- [x] T013 [US1] 设计并实现 JIT selectorId 的稳定生成策略（基于 reads/shape，而非函数名/源码）`packages/logix-core/src/ReadQuery.ts`
- [x] T014 [US1] 在 `useSelector` 内部接入 ReadQuery（不改变外部签名）：根据 equalsKind 选择默认 equality（struct 默认 shallow）`packages/logix-react/src/internal/hooks/useSelector.ts`

---

## Phase 4: User Story 2 - Devtools 清晰区分车道并解释降级 (Priority: P1)

**Goal**: Devtools/证据能看清 selector 的 `selectorId/lane/producer/fallbackReason/readsDigest`，并能与 txn 对齐。

**Independent Test**:

- `trace:react-selector` 的 meta（light/full）包含 lane 证据字段，且可序列化
- react-selector 事件能对齐到对应 txn（至少可在同 instance 内与 state:update 对齐）
- UI 能展示 lane 分布与 fallbackReason TopN（不依赖日志）

### Moved (absorbed by 060)

> 为避免 “Read Lanes / Txn Lanes” 两套证据与 UI 口径并行，本 US2 的剩余工作（DebugSink 投影、Devtools UI 汇总、以及集成测试）由 `specs/060-react-priority-scheduling/` 的 US2 统一交付；本 spec 只保留 React 侧 meta 产出（见 T023）。

### Implementation

- [x] T023 [US2] 扩展 `trace:react-selector` meta：上报 `selectorId/lane/producer/fallbackReason/readsDigest`（dev/test 或 devtools enabled）`packages/logix-react/src/internal/hooks/useSelector.ts`

---

## Phase 5: User Story 3 - SelectorGraph 精准通知与缓存 (Priority: P1)

**Goal**: 把“订阅/重算”从“每次 commit 重算所有 selector”升级为“只重算 deps 受影响的 selector”，并缓存结果与成本摘要。

**Independent Test**:

- dirtyRoots 与某 selector 的 reads 不重叠时，该 selector 零重算/零通知
- deps 受影响时，每个 txn 至多重算一次并更新缓存
- 诊断开启时可在 Devtools 中看到 selector eval 摘要并与 txn 对齐

### Tests

- [x] T030 [US3] SelectorGraph overlap/缓存语义单测（含“零重算”断言）`packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- [x] T031 [US3] React 侧静态车道订阅正确性测试（static lane 使用 selector subscription；dynamic 仍走旧路径）`packages/logix-react/test/Hooks/useSelector.laneSubscription.test.tsx`

### Implementation

- [x] T032 [US3] 为 ModuleRuntime 增加 ReadQuery 订阅入口（返回带 meta 的 changes），并保留函数 selector 作为语法糖（dynamic lane）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T033 [US3] 实现 SelectorGraph（索引/缓存/精准通知），输入复用 dirtyPaths/dirtyRoots `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- [x] T034 [US3] 在 diagnostics on 时发出 selector eval 事件（用于 txn→selector→render 因果链）`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- [x] T035 [US3] React：为 static lane 创建“按 selectorId 缓存的 ExternalStore”，订阅 ModuleRuntime 的 ReadQuery changes；dynamic lane 回退到现有 state+selector 路径 `packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts`
- [x] T036 [US3] React：在 `useSelector` 内根据 lane 选择订阅路径（static→SelectorGraph store；dynamic→legacy store）`packages/logix-react/src/internal/hooks/useSelector.ts`

---

## Phase 6: User Story 4 - Strict Gate（静态车道覆盖率可控） (Priority: P2)

**Goal**: CI/perf gate 下可把 dynamic 回退升级为失败（结构化、可序列化、可复现）。

**Independent Test**:

- strict gate 开启时，任何被要求 static 的 selector 若发生 dynamic 回退，则以结构化失败阻断（至少包含 `moduleId/instanceId/txnSeq + selectorId + debugKey? + fallbackReason`）

### Tests

- [x] T040 [US4] strict gate 失败语义与结构化输出测试 `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`

### Implementation

- [x] T041 [US4] 在 ReadQuery.compile / SelectorGraph 注册点接入 strict gate：对 requireStatic 的 selector 在 dynamic 时 fail/warn `packages/logix-core/src/ReadQuery.ts`
- [x] T042 [US4] 将 strict gate 的失败落为可序列化 diagnostic（便于 Devtools/CI 采集）`packages/logix-core/src/ReadQuery.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T050 [P] 落盘 perf evidence（Node+Browser before/after/diff；硬结论至少 `profile=default`；suites/budgets SSoT=matrix.json；diff `comparability.comparable=true` 且 `summary.regressions==0`；必须在独立 `git worktree/单独目录` 中采集）并写入结论摘要 `specs/057-core-ng-static-deps-without-proxy/perf/README.md`
- [x] T051 （Moved to 060）更新用户文档的 lanes 入口/跳转与推荐写法，由 `specs/060-react-priority-scheduling/` 的 Phase 7 统一交付 `apps/docs/content/docs/guide/essentials/react-integration.md`
- [x] T052 跑通 workspace 质量门（typecheck/lint/test）并把通过口径回写到 quickstart `specs/057-core-ng-static-deps-without-proxy/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 →（US1/US2/US3 并行，建议先 US1）→ US4 → Polish
- US2 依赖：US1（需要 lane 证据可产出）
- US3 依赖：US1（需要 ReadQuery.compile/selectorId），建议在 US2 前后并行推进
