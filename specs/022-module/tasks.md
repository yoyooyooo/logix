# Tasks: 022 Module（定义对象）+ ModuleTag（身份锚点）

**Input**: Design documents from `/specs/022-module/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为 022 的性能证据与落点准备可复跑脚手架

- [X] T001 Add 022 perf scripts to `.codex/skills/logix-perf-evidence/package.json`（`bench:useModule`、`bench:useModule:quick`）
- [X] T002 Add perf evidence doc scaffold in `specs/022-module/perf.md` (copy structure from `specs/008-hierarchical-injector/perf.md`)
- [X] T003 [P] Implement 022 micro-bench runner（入口：`pnpm perf bench:useModule`）(bench `$.use(ModuleTag)` vs `$.use(Module)` hit/miss; output JSON)
- [X] T004 Record **BEFORE** perf evidence in `specs/022-module/perf.md` (run `pnpm perf bench:useModule`; store raw JSON in `specs/022-module/perf/before.useModule.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立 Module（定义对象）+ ModuleTag（更名）的最小公共 API、拆壳协议、热路径预算与诊断证据

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Develop 022 codemod in `scripts/codemod/022-module-to-moduletag.ts` (ts-morph; migrate “module used as Tag” call sites: `yield* ModuleValue` → prefer `yield* $.use(ModuleValue)` when `$` is in-scope, otherwise use `ModuleValue.tag`; `Layer.succeed(ModuleValue, ...)` / `Effect.provideService(ModuleValue, ...)` → `*.succeed(ModuleValue.tag, ...)`; include `--check` dry-run + summary; add fixture-based tests in `scripts/codemod/__tests__/022-module-to-moduletag.test.ts` with fixtures under `scripts/codemod/fixtures/022-module-to-moduletag/*`) and add runner script in root `package.json` (`codemod:022:module`)
- [X] T006 Apply codemod across repo call sites via `scripts/codemod/022-module-to-moduletag.ts` (then fix leftovers surfaced by `pnpm typecheck` / `pnpm lint`)
- [X] T007 Move legacy Tag-based Module implementation to `Logix.ModuleTag` (file move `packages/logix-core/src/Module.ts` → `packages/logix-core/src/ModuleTag.ts`; keep `Logix.Module.make(id,{ state, actions, reducers? })` as the primary entry for defining modules; remaining “module used as Tag” call sites are handled by the codemod) and update internal imports/call sites as needed
- [X] T008 Define new `Module` public API (shape + typeguards + unwrap helpers + `Module.Manage.make` authoring helper + reflection fields `schemas/meta/services/dev.source` (no injection; may be undefined) + deterministic `logicUnitId`/slot keys for `withLogic/withLogics` incl. derived-id rules) in `packages/logix-core/src/Module.ts`
- [X] T009 Export `Module` + `ModuleTag` namespaces/types in `packages/logix-core/src/index.ts`
- [X] T010 Extend Bound API typing to accept `$.use(module)` in `packages/logix-core/src/Bound.ts` and `packages/logix-core/src/internal/runtime/core/module.ts` (Module overload + extended ModuleHandle typing)
- [X] T011 Extend runtime Bound API implementation to unwrap Module in `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` (O(1) detect/unwrap; preserve `Symbol.for(\"logix.module.handle.extend\")` behavior; no IO/async)
- [X] T012 Add `$.self` support for `module.logic(build, { id? })` in `packages/logix-core/src/Module.ts` (Bound API wrapper that yields current ModuleHandle)
- [X] T013 Support `Logix.Runtime.make(module)` in `packages/logix-core/src/Runtime.ts` (unwrap to `module.impl`; keep behavior equal to `Runtime.make(module.impl)`)
- [X] T014 Support `useModule(module)` in `packages/logix-react/src/hooks/useModule.ts` (unwrap to `module.impl` by default; global usage stays `useModule(module.tag)` / ModuleTag)
- [X] T015 [P] Implement handle-extend merge for React `useModule` in `packages/logix-react/src/hooks/useModule.ts` + `packages/logix-react/src/internal/ModuleRef.ts` (apply `Symbol.for(\"logix.module.handle.extend\")`; ref gains controller/services when available)
- [X] T016 [P] Align `@logix/react` docs for Module consumption in `.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`
- [X] T017 Implement `ModuleDescriptor` builder (pure + slim + serializable; include `moduleId/instanceId`; `logicUnits[].id` from resolved slot keys, and mark derived ids when applicable) in `packages/logix-core/src/Module.ts` (match `specs/022-module/contracts/schemas/module-descriptor.schema.json`)
- [X] T018 Implement descriptor trace emission (when `diagnosticsLevel != \"off\"`; once-per-instance per RunSession; exportable via `trialRun` evidence) in `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` (MUST include `moduleId/instanceId`; `type: \"trace:module:descriptor\"`, `data` aligns `specs/022-module/contracts/schemas/module-event.schema.json`)
- [X] T019 Implement dev diagnostic warning for `logicUnitId` override (default `last-write-wins`; record `Debug` event `type:\"diagnostic\" code:\"module_logic::override\" severity:\"warning\"` with resolved id + source anchors + order) in `packages/logix-core/src/Module.ts`
- [X] T020 [P] Add NoAsyncGuard test for Module unwrap/descriptor hot paths in `packages/logix-core/test/Module.NoAsyncGuard.test.ts` (forbid `Effect.async/Effect.promise/Effect.tryPromise`, `new Promise`, `Promise.*`, `async function`; scan `packages/logix-core/src/Module.ts` + `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`)
- [X] T021 [P] Add `$.use(module)` regression tests in `packages/logix-core/test/Module.use.test.ts` (unwrap equivalence + extend-handle preserved)
- [X] T022 [P] Add `Runtime.make(module)` regression test in `packages/logix-core/test/Runtime.make.Module.test.ts`
- [X] T023 [P] Add `useModule(module)` regression test in `packages/logix-react/test/useModule.module.test.tsx`
- [X] T024 [P] Add `logicUnitId` override diagnostic regression test in `packages/logix-core/test/Module.logicUnitId.override.diagnostic.test.ts` (dev warning emitted; last-write-wins effective)

**Checkpoint**: Core unwrap rules are stable; US1/US2/US3 can proceed (docs/migration can run in parallel)

---

## Phase 3: User Story 1 - 领域模块可直接挂载逻辑并运行 (Priority: P1) 🎯 MVP

**Goal**: 业务方只用一个领域对象（Form Module）完成“创建→withLogic→运行→逻辑侧可用 actions/controller（含 `$.self`）”

**Independent Test**: 在 `packages/logix-form/test` 中跑通一个用例：`Form.make(...)` 返回 Module；`module.logic` 内可 `yield* $.self` 拿到 controller；`Runtime.make(module)` 可运行且逻辑按确定性顺序生效

- [X] T025 [US1] Migrate `Form.make()` to return `Module` in `packages/logix-form/src/form.ts` (remove `FormBlueprint`; keep `EXTEND_HANDLE` injection; reflect `schemas.values`)
- [X] T026 [US1] Update `useForm` to accept Module in `packages/logix-form/src/react/useForm.ts`
- [X] T027 [P] [US1] Migrate Form test fixtures from Blueprint to Module in `packages/logix-form/test/fixtures/listScopeCheck.ts`
- [X] T028 [US1] Migrate baseline form tests to Module shape in `packages/logix-form/test/FormBlueprint.basic.test.ts`
- [X] T029 [US1] Migrate array behavior tests to Module shape in `packages/logix-form/test/FormBlueprint.array.test.ts`
- [X] T030 [US1] Migrate resource-idle tests to Module shape in `packages/logix-form/test/FormBlueprint.resource-idle.test.ts`
- [X] T031 [P] [US1] Add `$.self` controller access regression test in `packages/logix-form/test/FormModule.self.test.ts`
- [X] T032 [P] [US1] Add `withLogic` immutability regression test in `packages/logix-form/test/FormModule.withLogic.immutability.test.ts`

**Checkpoint**: Form Module 可作为 MVP 场景跑通（逻辑侧 + 运行侧 + React useForm）

---

## Phase 4: User Story 2 - 领域工厂产物统一形状（替代早期 pattern） (Priority: P2)

**Goal**: 提供一个最小 CRUD 领域工厂（`CRUD.make()`）返回 Module，并证明它与 Form Module 可被同一套入口消费

**Independent Test**: 在 `packages/domain/test` 中验证：`CRUD.make()` 返回 Module；可 `Runtime.make(crud)` 与 `$.use(crud)`；并能与 Form 一起被同一套“unwrap 入口”消费（不写领域特化分支）

- [X] T033 [P] [US2] Create new package scaffold for `@logix/domain` in `packages/domain/package.json` + `packages/domain/tsconfig.json` + `packages/domain/tsconfig.test.json` + `packages/domain/vitest.config.ts` + `packages/domain/tsup.config.ts`
- [X] T034 [US2] Implement minimal CRUD Module factory in `packages/domain/src/Crud.ts` (in-memory state + actionMap + controller.make(runtime) + `schemas/meta` reflection)
- [X] T035 [US2] Export CRUD API from `packages/domain/src/index.ts`
- [X] T036 [US2] Add CRUD Module smoke test in `packages/domain/test/CrudModule.basic.test.ts` (Runtime.make/$.use/withLogic basics)
- [X] T037 [P] [US2] Add “Form + CRUD common entrypoints” regression test in `packages/logix-core/test/Module.common-consumption.test.ts`

**Checkpoint**: 至少两个领域工厂（Form/CRUD）产物统一形状，可被同一套入口消费

---

## Phase 5: User Story 3 - 迁移可控且心智模型一致 (Priority: P3)

**Goal**: 迁移说明与示例更新，让业务开发者理解“直接吃 Module”的局部/全局语义与拆壳规则

**Independent Test**: 更新后的 `examples/logix-react` 表单 demos 不再依赖显式 `.module/.impl` 拆壳即可跑通；文档能解释“入口直接吃 Module”默认是局部还是全局

- [X] T038 [P] [US3] Update core API docs for Module/ModuleTag in `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md` and runtime glossary in `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`
- [X] T039 [P] [US3] Document `$.use(module)` / `$.self` semantics in `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`
- [X] T040 [P] [US3] Update user docs for Form Module migration in `apps/docs/content/docs/form/quick-start.md` and `apps/docs/content/docs/form/introduction.md`
- [X] T041 [US3] Migrate React form demos to consume Module directly in `examples/logix-react/src/demos/form/FormDemoLayout.tsx` and `examples/logix-react/src/demos/form/TraitFormDemoLayout.tsx`
- [X] T042 [P] [US3] Migrate remaining form demo layouts to Module in `examples/logix-react/src/demos/form/FormCasesDemoLayout.tsx` and `examples/logix-react/src/demos/form/ComplexTraitFormDemoLayout.tsx`

**Checkpoint**: 迁移文档与示例一致，调用侧心智模型统一

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T043 [P] Record **AFTER** perf evidence in `specs/022-module/perf.md` (run `pnpm perf bench:useModule` after changes; store raw JSON in `specs/022-module/perf/after.useModule.json`)
- [X] T044 [P] Validate and update any mismatched steps in `specs/022-module/quickstart.md`
- [X] T045 [P] Align descriptor contract docs with runtime payload (if drift found) in `specs/022-module/contracts/openapi.yaml`
- [X] T046 [P] Remove 022 codemod tooling after migration is complete (delete `scripts/codemod/022-module-to-moduletag.ts` + its fixtures/tests; remove `codemod:022:module` runner from root `package.json`)
- [X] T047 [P] Repo-wide 清理旧称相关命名与引用（类型、文件名、目录名、文档、示例），范围：`specs/022-module/` 之外；验收：全仓不再出现旧称残留

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion; can proceed in parallel if staffed
- **Polish (Final Phase)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - no dependencies on US2/US3
- **US2 (P2)**: Can start after Foundational - reuses Module core + unwrap rules; independent from US1’s business specifics
- **US3 (P3)**: Depends on US1 landing Form Module (migration docs + demos); docs tasks can proceed earlier but should be validated after US1

---

## Parallel Example: Foundational (Rename + New API)

```text
Task: "Rename legacy Logix.Module to Logix.ModuleTag"
Task: "Implement new Module public API in packages/logix-core/src/Module.ts"
Task: "Add useModule(module) support in packages/logix-react/src/hooks/useModule.ts"
```

## Parallel Example: US3 (Docs vs Demos)

```text
Task: "Update core API docs in .codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md"
Task: "Migrate React form demos in examples/logix-react/src/demos/form/FormDemoLayout.tsx"
```

## Parallel Example: US1 (Form Core vs Tests)

```text
Task: "Migrate Form.make() to return Module in packages/logix-form/src/form.ts"
Task: "Migrate FormBlueprint tests to Module shape in packages/logix-form/test/FormBlueprint.basic.test.ts"
```

## Parallel Example: US2 (Package Scaffold vs Factory)

```text
Task: "Create @logix/domain package scaffold in packages/domain/package.json"
Task: "Implement CRUD Module factory in packages/domain/src/Crud.ts"
```

---

## Implementation Strategy (MVP → 扩展 → 迁移)

1. **先跑证据跑道**：先补齐 `pnpm perf bench:useModule` + `specs/022-module/perf.md` 的 Before 记录，再动 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` 热路径。
2. **先打通 Phase 2**：把 Module 的拆壳协议（`$.use(module)`、`Runtime.make(module)`、`useModule(module)`）做成统一入口，避免下游各自 duck-typing。
3. **US1 做 MVP**：优先让 Form 跑通 “Module + withLogic + $.self + controller”，并用 `packages/logix-form/test` 锁死语义。
4. **US2 做第二领域样本**：用最小 CRUD 工厂验证“领域工厂产物统一形状”，避免为 demo 引入网络/持久化。
5. **US3 做迁移收口**：最后集中迁移 docs/demos（以及必要的测试/fixture），确保“免 `.module/.impl`”的心智模型在代码与文档侧一致。
