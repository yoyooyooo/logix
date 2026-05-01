# Tasks: Query 收口到 `@logixjs/query`（026，与 Form 同形）

**Input**: `specs/026-unify-query-domain/spec.md` + `specs/026-unify-query-domain/plan.md`（并参考 `research.md` / `data-model.md` / `contracts/*` / `quickstart.md`）

## 格式约定：`T### [P?] [US?] 描述 + 文件路径`

- `[P]`：可并行（不同文件/无依赖）
- `[US1]/[US2]/[US3]`：仅用于 User Story 阶段任务
- 每条任务必须包含明确文件路径

---

## Phase 0: Repo Structure（目录命名治理）

- [x] T000 重命名目录：`packages/logix-query`（保持 npm 包名 `@logixjs/query` 不变）`packages/logix-query`
- [x] T000a 重命名目录：`packages/logix-form`（保持 npm 包名 `@logixjs/form` 不变）`packages/logix-form`
- [x] T000b [P] 更新仓库内硬编码目录路径引用（`packages/logix-query`/`packages/logix-form`）`specs/*`, `apps/docs/content/docs/*`, `scripts/*`

---

## Phase 1: Setup（SSoT 与落点对齐）

- [x] T001 [P] 回写 SSoT：统一 Query 合同口径与命名到 026（去掉 Blueprint/EngineTag/Query.middleware 等过时表述）`specs/007-unify-field-system/contracts/query.md`
- [x] T002 [P] 回写 SSoT：更新包级速查中 `@logixjs/query` 的推荐入口/注入语义到 026 `docs/ssot/handbook/cheatsheets/packages-user-view/README.md`

---

## Phase 2: Foundational（性能/证据落点准备）

- [x] T003 为 026 性能证据建立 README 与字段口径（对齐 `logix-perf-evidence` 输出）`specs/026-unify-query-domain/perf/README.md`

---

## Phase 3: User Story 1 - 查询能力只有一个入口（P1）🎯 MVP

**Goal**: 仓库内 Query 入口只剩 `@logixjs/query`，不再出现 `@logixjs/core/Middleware/Query` 的推荐/引用。

**Independent Test**: `rg "@logixjs/core/Middleware/Query"` / `rg "Middleware.Query"` 在仓库文档/示例/脚手架中 0 命中；Query 相关示例能只通过 `@logixjs/query` 入口表达。

- [x] T004 [US1] 移除 core 的 `./Middleware/Query` exports `packages/logix-core/package.json`
- [x] T005 [US1] 删除历史占位入口实现（不保留兼容层）`packages/logix-core/src/Middleware.Query.ts`
- [x] T006 [US1] 清理 core public barrel 中与 Query 入口绑定的导出/引用 `packages/logix-core/src/index.ts`
- [x] T007 [P] [US1] 迁移脚手架生成的 Query import 形状（统一 `import * as Query from "@logixjs/query"`）`scripts/logix-codegen.ts`
- [x] T008 [P] [US1] 迁移示例到 `@logixjs/query` 入口 `examples/logix/src/scenarios/middleware-resource-query.ts`
- [x] T009 [P] [US1] 迁移旧 spec 引用（不再出现 core Query 入口）`specs/000-module-fields-runtime/spec.md`
- [x] T010 [P] [US1] 迁移旧 quickstart 引用（不再出现 core Query 入口）`specs/000-module-fields-runtime/quickstart.md`
- [x] T011 [P] [US1] 迁移旧 research 引用（不再出现 core Query 入口）`specs/000-module-fields-runtime/research.md`
- [x] T012 [P] [US1] 迁移旧 references 引用（不再出现 core Query 入口）`specs/000-module-fields-runtime/references/resource-and-query.md`
- [x] T013 [P] [US1] 将 core 内 Query 专用集成测试迁出（core 仅保留 kernel 断言）`packages/logix-core/test/ResourceQuery.Integration.test.ts`
- [x] T014 [P] [US1] 将 core 内 Query 专用集成测试迁出（core 仅保留 kernel 断言）`packages/logix-core/test/FieldKernel.SourceRuntime.test.ts`
- [x] T015 [P] [US1] 将 core 内 Query 语法糖测试迁出或删除（避免 core 依赖领域包协议）`packages/logix-core/test/QuerySource.SyntaxSugar.test.ts`
- [x] T016 [P] [US1] 清理迁移过程中遗留的类型断言文件（迁移到 query 包或删除）`packages/logix-core/test/QuerySource.SyntaxSugar.d.ts`
- [x] T017 [US1] 迁移说明补齐“Module vs impl/tag 的句柄语义”（避免 controller 类型丢失的误用）`specs/026-unify-query-domain/contracts/migration.md`

---

## Phase 4: User Story 2 - Query 与 Form 的领域形状一致（P2）

**Goal**: `@logixjs/query` 以 Form 同构的“模块工厂 + controller 句柄扩展”作为唯一推荐写法，并把类型做到尽可能完美（FR-006/SC-006）。

**Independent Test**: `Query.make(..., { queries })` 的 `queries` key union 会贯穿到 `state.queries[queryName]` 与 `controller.refresh(queryName?)`；`deps` 受 `StateFieldPath<{ params; ui }>` 约束；`useModule(QueryModule)` / `$.use(QueryModule)` 拿到强类型 controller。

- [x] T018 [US2] 固化 `@logixjs/query` public barrel：只保留 `make/fields/Engine/TanStack`，移除重复入口（`EngineTag`/`Query.layer`/`Query.middleware`）`packages/logix-query/src/index.ts`
- [x] T019 [US2] 将引擎 Tag 与注入入口收敛为 `Query.Engine` + `Query.Engine.layer(...)`（Effect-native）`packages/logix-query/src/Engine.ts`
- [x] T020 [US2] 将外部引擎接管点收敛为 `Query.Engine.middleware(...)`（不再暴露顶层 `Query.middleware`）`packages/logix-query/src/Engine.ts`, `packages/logix-query/src/Middleware.ts`
- [x] T021 [US2] 让 `Query.make` 对外一发返回可组合的 Query Program `packages/logix-query/src/Query.ts`
- [x] T022 [US2] 通过 `Symbol.for("logix.module.handle.extend")` 把 controller 挂到 ModuleHandle（React/Logic 同一写法）`packages/logix-query/src/Query.ts`
- [x] T023 [US2] 明确 `controller.refresh(target?)` 语义：省略 target = 刷新所有 query（并对 key 不可用做可解释 no-op）`specs/026-unify-query-domain/data-model.md`
- [x] T024 [US2] 固化快照命名空间：Query snapshots 统一落到 `state.queries.*`（Query.make/Query.fields 同形）；并保留关键字（禁止 queryName 包含 `.`，建议禁止 `params/ui/queries` 等可读性冲突名）`packages/logix-query/src/Query.ts`
- [x] T025 [US2] 收窄 `refresh(target?)`：target 必须是 `keyof queries | undefined`（消灭 name typo）`packages/logix-query/src/Query.ts`
- [x] T026 [US2] 收窄 `deps`：`Query.make(...).queries[*].deps` 受 `FieldKernel.StateFieldPath<{ params; ui }>` 约束（深度 4）`packages/logix-query/src/Fields.ts`
- [x] T027 [US2] 对齐默认逻辑与类型：auto-trigger 使用新 Engine 入口与 typed target `packages/logix-query/src/internal/logics/auto-trigger.ts`
- [x] T028 [US2] 对齐默认逻辑与类型：invalidate 使用新 Engine 入口与 typed target `packages/logix-query/src/internal/logics/invalidate.ts`
- [x] T029 [US2] 类型回归测试：覆盖 `refresh` target、保留关键字、`deps` 路径拼写错误应在编译期失败 `packages/logix-query/test/Query.types.test.ts`
- [x] T030 [US2] 行为回归测试：`controller.refresh()`（无 target）应刷新所有 query（并覆盖 key 不可用的跳过语义）`packages/logix-query/test/Query.controller.refreshAll.test.ts`

---

## Phase 5: User Story 3 - 收口不牺牲性能与可诊断性（P3）

**Goal**: 引擎可替换、TanStack 默认推荐、四种组合语义可解释；提供集成测试与 perf/诊断证据。

**Independent Test**: `packages/logix-query/test/*` 覆盖“四种组合语义 + edge cases”；`pnpm perf bench:026:query-auto-trigger` 产出 before/after JSON 并归档到 `specs/026-unify-query-domain/perf/*`；用户文档能从入门到高级说清楚（含 owner-wiring）。

- [x] T031 [US3] 实现/完善引擎接管点：覆盖 `EffectOp(kind="field-source")`，启用但缺失注入必须显式失败 `packages/logix-query/src/internal/middleware/middleware.ts`
- [x] T032 [US3] 固化 TanStack 默认实现：`Query.TanStack.engine(queryClient)` 满足 Engine 契约并保持 Env 捕获语义 `packages/logix-query/src/internal/engine/tanstack.ts`
- [x] T033 [US3] 测试“四种组合语义”（layer×middleware）`packages/logix-query/test/Engine.combinations.test.ts`
- [x] T034 [US3] 测试 edge cases：`manual` 独占、`key(state) => undefined`、并发 switch/exhaust 不产生错误写回 `packages/logix-query/test/Query.edge-cases.test.ts`
- [x] T035 [US3] 测试 invalidate：事件化 + `engine.invalidate`（可选）+ source.refresh `packages/logix-query/test/Query.invalidate.test.ts`
- [x] T036 [US3] 新增 026 perf 脚本（覆盖 switch+debounce+key 可用/不可用切换；diagnostics off/on；入口：`pnpm perf bench:026:query-auto-trigger`）
- [x] T037 [US3] 归档 perf 结果与 diff（JSON）`specs/026-unify-query-domain/perf/*`
- [x] T038 [US3] 用户文档：讲清 `Query.make`、controller、四种组合语义、默认 TanStack、优化阶梯，以及 `switch`/取消语义指路 `apps/docs/content/docs/guide/learn/query.md`
- [x] T039 [US3] 用户文档：跨模块联动最佳实践（owner wiring + imports scope）`apps/docs/content/docs/guide/learn/cross-module-communication.md`
- [x] T040 [US3] 用户文档：deep-dive 只保留概念与指路，避免示例漂移 `apps/docs/content/docs/guide/learn/deep-dive.md`
- [x] T041 [US3] 用户文档：Learn 导航收口（含 query 条目）`apps/docs/content/docs/guide/learn/meta.json`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T042 [P] 全仓修正过时文档中的大小写敏感路径（例如 `packages/logix-core/src/Middleware.ts` 等 PascalCase 子模块）`docs/specs/`
- [x] T043 [P] 全仓修正过时文档中的大小写敏感路径（用户文档侧）`apps/docs/content/docs/`
- [x] T044 质量门：`pnpm typecheck` + `pnpm lint` + `pnpm test`（一次性非 watch）`package.json`
- [x] T045 [P] Dev 诊断：FieldKernel 全体系 schema 校验（computed/source/link/check）。当 entry 的 `fieldPath/deps/link.from/check.writeback.path` 不存在于 stateSchema 时发出可定位 warning（例如 `state_field::schema_mismatch`；diagnostics off 接近零成本），避免任何 fields 在宿主模块上静默写出新字段（Query.fields 只是其中一个场景）`packages/logix-core/src/internal/state-field/build.ts`, `packages/logix-core/src/internal/state-field/converge.ts`
- [x] T046 [P] 用户文档：新增“可中断 IO（取消与超时）”最佳实践（ResourceSpec.load 通过 AbortSignal 真正取消；与 `switch`/keyHash gate 的关系）`apps/docs 当前 advanced 口径文档`, `apps/docs/content/docs/guide/advanced/meta.json`

---

## Phase 7: Acceptance Fixups（性能/诊断闭环）

- [x] T047 [P] 性能：优化 TanStack engine 的 fetch 热路径（避免引入不必要的 Promise/QueryClient 重路径），并刷新 026 perf 证据以满足 NFR/SC 预算 `packages/logix-query/src/internal/engine/tanstack.ts`, `specs/026-unify-query-domain/perf/*`
- [x] T048 [P] 诊断：把 source 的并发策略（switch/exhaust-trailing）写入可序列化的 replayEvent/证据链，便于解释与回放 `packages/logix-core/src/internal/runtime/core/ReplayLog.ts`, `packages/logix-core/src/internal/state-field/source.ts`
- [x] T049 [P] 文档：补齐 query 的“≤5 关键词 + 粗粒度成本模型 + 诊断字段”段落，对齐 NFR-005/SC-005 `apps/docs/content/docs/guide/learn/query.md`

---

## Phase 8: 透明性（去糖化视图）与 meta 合同对齐（增量）

- [x] T050 [P] quickstart 增补 De-sugared View：把 `Query.make/Query.fields` 展开到 `FieldKernel.source`/`EffectOp` 主线，并明确“哪些字段会进入 IR/导出边界”与定位入口 `specs/026-unify-query-domain/quickstart.md`, `apps/docs/content/docs/guide/learn/query.md`
- [x] T051 [P] Meta 口径对齐 016：将 Query 相关可导出 `meta` 的类型/文档统一指向 `TraitMeta/JsonValue`（裁剪规则不在 Query 自定义），并补齐迁移/指路说明 `packages/logix-query/src/Fields.ts`, `packages/logix-query/src/Query.ts`, `specs/026-unify-query-domain/contracts/*`

---

## Dependencies & Execution Order

- Phase 0（目录命名治理）应最先完成：后续任务的文件路径以 `packages/logix-query`/`packages/logix-form` 为准。
- Phase 1（SSoT 对齐）应先完成，避免实现过程中出现并行真相源。
- US1/US2/US3 可以在不同人力下并行推进，但建议最小闭环顺序：US1（入口收口）→ US2（同形 + 类型闭环）→ US3（引擎语义 + 测试/性能/文档）。
- US3 的测试与 perf 证据依赖 US2 的 API/类型收敛完成后再稳定落地。
