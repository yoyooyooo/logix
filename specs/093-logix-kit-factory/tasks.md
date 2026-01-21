# Tasks: Logix Kit Factory（语法糖机器）

**Input**: Design documents from `specs/093-logix-kit-factory/`  
**Prerequisites**: `specs/093-logix-kit-factory/plan.md`（required）, `specs/093-logix-kit-factory/spec.md`（required）, `specs/093-logix-kit-factory/research.md`, `specs/093-logix-kit-factory/data-model.md`, `specs/093-logix-kit-factory/contracts/*`, `specs/093-logix-kit-factory/quickstart.md`  
**Tests**: REQUIRED（`packages/logix-core/test/Kit/*` 验证“等价展开 + 稳定 identity + 零副作用”）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: 可并行（不同文件/无依赖）
- **[Story]**: `[US1]` / `[US2]` / `[US3]`
- 每条任务必须带明确文件路径

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 建立 core 子模块落点与测试目录（不引入语义）

- [ ] T001 Create new core submodule file `packages/logix-core/src/Kit.ts`
- [ ] T002 [P] Create workflow-only sugar file `packages/logix-core/src/KitWorkflow.ts`
- [ ] T003 Export `Kit` and `KitWorkflow` in `packages/logix-core/src/index.ts`
- [ ] T004 [P] Create test folder `packages/logix-core/test/Kit/` and add `packages/logix-core/test/Kit/README.md` (scope + conventions)

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 先落地“最小结构 + 边界门禁”，再做 story 增量

**⚠️ CRITICAL**: 进入任意 User Story 之前必须完成本阶段

- [ ] T005 Implement `InputKit` + `externalTrait` (pure composition; `meta` follows `TraitMeta.sanitize` whitelist) in `packages/logix-core/src/Kit.ts`
- [ ] T006 Implement `ServiceKit` base helpers (`layer`/`use`) in `packages/logix-core/src/Kit.ts`
- [ ] T007 Sync API surface docs with final file split in `specs/093-logix-kit-factory/contracts/public-api.md`
- [ ] T008 Sync identity rules with code entrypoints in `specs/093-logix-kit-factory/contracts/identity.md`
- [ ] T024 [P] Add dev-time meta feedback (`Kit.validateMeta(meta)` + optional dev warn) in `packages/logix-core/src/Kit.ts` + tests `packages/logix-core/test/Kit/Kit.metaValidation.test.ts`
- [ ] T025 [P] Add deterministic helper `Kit.makeStepKey(prefix, literal)` in `packages/logix-core/src/Kit.ts` + tests `packages/logix-core/test/Kit/Kit.stepKey.test.ts`
- [ ] T026 [P] Add hot-path boundary guard test (Kit must not be imported/used by tick core) in `packages/logix-core/test/Kit/Kit.tickBoundary.test.ts`

**Checkpoint**: `@logixjs/core/Kit` 可被引入且无副作用（仅导出类型与组合函数）

---

## Phase 3: User Story 1 - 端口型能力的统一接入（Priority: P1）

**Goal**: 只声明一次 `Context.Tag` 端口契约，即可生成 Trait/Logic/Workflow 三面 sugar（等价展开）

**Independent Test**: 仅通过单测即可验证：descriptor 正确、identity 稳定、创建阶段零副作用

### Tests for User Story 1（REQUIRED）

- [ ] T009 [P] [US1] Add tests for `Kit.forService(tag)` in `packages/logix-core/test/Kit/Kit.forService.test.ts`
- [ ] T010 [P] [US1] Add tests for workflow sugar delegating to `Workflow.call` in `packages/logix-core/test/Kit/KitWorkflow.forService.test.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Implement `Kit.forService(tag)` and `serviceKit.input(pick)` via `ExternalStore.fromService` in `packages/logix-core/src/Kit.ts`
- [ ] T012 [US1] Implement workflow sugar (must delegate to `Workflow.call/callById`, no new serviceId rule) in `packages/logix-core/src/KitWorkflow.ts`
- [ ] T013 [US1] Update usage + de-sugared view to match final API in `specs/093-logix-kit-factory/quickstart.md`

**Checkpoint**: US1 端口型输入+命令的“造糖/吃糖”可在单测中独立演示

---

## Phase 4: User Story 2 - Module-as-Source 的标准化（Priority: P2）

**Goal**: 把 “module + ReadQuery” 标准化为 InputKit，并继承 073 的稳定 lane 门禁

**Independent Test**: 单测验证 `ExternalStore.fromModule` 的错误语义与 descriptor 形状不被 Kit 改写

### Tests for User Story 2（REQUIRED）

- [ ] T014 [P] [US2] Add tests for `Kit.forModule(module, readQuery)` in `packages/logix-core/test/Kit/Kit.forModule.test.ts`

### Implementation for User Story 2

- [ ] T015 [US2] Implement `Kit.forModule(module, readQuery)` via `ExternalStore.fromModule` in `packages/logix-core/src/Kit.ts`
- [ ] T016 [US2] Update Module-as-Source notes (imports requirement + unstableSelectorId fail-fast + no dynamic instance selection) in `specs/093-logix-kit-factory/quickstart.md`
- [ ] T027 [US2] Improve fail-fast message for unresolved/ambiguous Module-as-Source imports in `packages/logix-core/src/internal/state-trait/external-store.ts` + tests in `packages/logix-core/test/Kit/Kit.forModule.test.ts`

**Checkpoint**: US2 在不依赖 React/宿主的前提下可独立通过单测验收

---

## Phase 5: User Story 3 - 不引入额外运行时负担（Priority: P3）

**Goal**: Kit 不进入 tick 热路径，并尽量支持 tree-shaking（input-only 不强拉 workflow）

**Independent Test**: 静态边界 + 单测断言：Kit 创建阶段不触发 pick/subscribe；`Kit.ts` 不直接依赖 Workflow

### Tests for User Story 3（REQUIRED）

- [ ] T017 [P] [US3] Add no-side-effect tests (pick not called; subscribe not called) in `packages/logix-core/test/Kit/Kit.noSideEffect.test.ts`
- [ ] T018 [P] [US3] Add boundary test to keep `packages/logix-core/src/Kit.ts` workflow-free in `packages/logix-core/test/Kit/Kit.workflowBoundary.test.ts`

### Implementation for User Story 3

- [ ] T019 [US3] Ensure Workflow-only logic stays in `packages/logix-core/src/KitWorkflow.ts` and document layered imports in `specs/093-logix-kit-factory/contracts/public-api.md`

**Checkpoint**: US3 的“无额外负担”可由测试与静态边界共同守住

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档对齐与质量门禁

- [ ] T020 [P] Add user-facing recipe (if needed) in `apps/docs/content/docs/guide/recipes/kit-factory.md`
- [ ] T021 Sync `specs/093-logix-kit-factory/spec.md` success criteria wording with final API names
- [ ] T022 Run workspace gates (typecheck/lint/test) and fix issues in `packages/logix-core/src/Kit.ts`
- [ ] T023 Run quickstart validation and adjust examples in `specs/093-logix-kit-factory/quickstart.md`
- [ ] T028 [P] Keep `specs/093-logix-kit-factory/domain-kit-guide.md` in sync with final API and identity rules
- [ ] T029 [P] Add one reference domain kit (Router) in `examples/logix/src/patterns/router-kit.ts` to validate real-world usage (forService + workflow stepKey pattern)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1/US2/US3（Phase 3–5）** → **Polish (Phase 6)**

### User Story Dependencies

- **US1 (P1)**：依赖 Phase 2（最小结构）
- **US2 (P2)**：依赖 Phase 2（复用 InputKit）
- **US3 (P3)**：依赖 US1/US2 的测试与实现（确保 boundary 不被破坏）

---

## Parallel Opportunities

- Phase 1: `T002` / `T004` 可并行
- Phase 3: `T009` / `T010` 可并行
- Phase 5: `T017` / `T018` 可并行

---

## Parallel Example: User Story 1

```text
并行启动：
- T009 [US1] tests for forService
- T010 [US1] tests for workflow sugar

串行收口：
- T011 → T012 → T013
```

## Parallel Example: User Story 2

```text
并行启动：
- T014 [US2] tests for forModule

串行收口：
- T015 → T016
```

---

## Implementation Strategy

### MVP First（US1 Only）

1. 完成 Phase 1–2（建立 Kit 落点）
2. 完成 Phase 3（US1 + tests）
3. 立即用 `packages/logix-core/test/Kit/*` 验收 US1

### Incremental Delivery

1. US1 → US2 → US3（每步都以单测作为独立验收）
