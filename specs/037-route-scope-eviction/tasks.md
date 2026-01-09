# Tasks: 037 限定 scope 的全局（Host(imports) + ModuleScope）

**Input**: `specs/037-route-scope-eviction/spec.md` + `specs/037-route-scope-eviction/plan.md`（并参考 `research.md` / `data-model.md` / `contracts/*` / `quickstart.md` / `perf.md`）

## 格式约定：`T### [P?] [US?] 描述 + 文件路径`

- `[P]`：可并行（不同文件/无依赖）
- `[US1]/[US2]`：仅用于 User Story 阶段任务
- 每条任务必须包含明确文件路径

---

## Phase 0: Spec Kit Artifacts（规格产物固化）

- [x] T001 固化需求与验收口径（FR/NFR/SC + Clarifications）`specs/037-route-scope-eviction/spec.md`
- [x] T002 固化实现方案与 Constitution Check `specs/037-route-scope-eviction/plan.md`
- [x] T003 [P] 固化现状事实与决策（句柄语义/甜点区/高级区/DEFERRED）`specs/037-route-scope-eviction/research.md`
- [x] T004 [P] 固化 ScopeRegistry 数据模型与不变量 `specs/037-route-scope-eviction/data-model.md`
- [x] T005 [P] 固化 React ModuleScope 契约（含 useImported + Bridge 语义）`specs/037-route-scope-eviction/contracts/react-module-scope.md`
- [x] T006 [P] 标记 eviction/clear 契约为 DEFERRED `specs/037-route-scope-eviction/contracts/react-modulecache-eviction.md`
- [x] T007 [P] Quickstart：路由 Host(imports) + 弹框 keepalive + 结束 scope `specs/037-route-scope-eviction/quickstart.md`
- [x] T008 [P] Perf 口径：热路径不回退 + 后续基线建议 `specs/037-route-scope-eviction/perf.md`

---

## Phase 1: User Story 1 - 路由范围的“限定 scope 全局”（P1）🎯 MVP

**Goal**: 同一路由内弹框模块 keepalive；离开路由 scope 结束后统一销毁；默认写法不依赖 `useModule(ModuleTag)` 的单例语义。

**Independent Test**: 复刻 `specs/037-route-scope-eviction/quickstart.md` 的最小场景：路由 A 下弹框反复打开/关闭不丢状态；切到路由 B 后 A 的弹框模块不存活；返回 A 后从初始状态开始。

- [x] T009 [US1] React：提供 `ModuleScope.make`（Provider + use + useImported + Bridge）并导出 `packages/logix-react/src/ModuleScope.ts`, `packages/logix-react/src/index.ts`
- [x] T010 [US1] React：单测（缺 Provider 抛错、ref 稳定、useImported 等价、scopeId 隔离）`packages/logix-react/test/Hooks/moduleScope.test.tsx`
- [x] T011 [US1] Core：提供 ScopeRegistry（按 runtime tree 隔离）并在 `Runtime.make` 默认注入 `packages/logix-core/src/ScopeRegistry.ts`, `packages/logix-core/src/Runtime.ts`, `packages/logix-core/src/index.ts`
- [x] T012 [P] [US1] Core：补 ScopeRegistry 单测（register/get/release/clear*，含“中间释放”）`packages/logix-core/test/ScopeRegistry.test.ts`
- [x] T013 [P] [US1] React：补 ModuleScope.Bridge 单测（缺注册/已释放抛错；注册后跨子树复用同一 scope）`packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx`

---

## Phase 2: User Story 2 - 文档化可落地的最佳实践（P2）

**Goal**: 业务开发者能从“甜点区 → 高级区”逐层学会：Host(imports) 表达“限定 scope 全局”，并用 ModuleScope 解决 host 透传。

**Independent Test**: 仅阅读文档即可实现并解释 User Story 1 的验收场景（含常见误用与排错路径）。

- [x] T014 [US2] 用户文档配方：路由 scope 下弹框 keepalive（甜点区/高级区/常见坑）`apps/docs/content/docs/guide/recipes/route-scope-modals.md`
- [x] T015 [P] API 文档：新增 ModuleScope 页面并加入导航 `apps/docs/content/docs/api/react/module-scope.md`, `apps/docs/content/docs/api/react/meta.json`
- [x] T016 [P] API 文档：useImportedModule 指路 ModuleScope `apps/docs/content/docs/api/react/use-imported-module.md`
- [x] T017 [P] Runtime SSoT：React integration guide 补 ModuleScope 指引 `docs/ssot/runtime/logix-react/01-react-integration.md`
- [x] T018 [P] 文档：补齐 Bridge（实验性）段落（前提/失败模式/不进入甜点区）`apps/docs/content/docs/api/react/module-scope.md`, `specs/037-route-scope-eviction/contracts/react-module-scope.md`

---

## Phase 3: Polish & Cross-Cutting Concerns

- [x] T019 质量门：`pnpm typecheck` + `pnpm lint` + `pnpm test`（一次性非 watch）`package.json`
- [x] T020 验收：运行 `$speckit acceptance 037-route-scope-eviction` 并根据输出修正漂移点（若有）`specs/037-route-scope-eviction/spec.md`, `specs/037-route-scope-eviction/acceptance.md`, `specs/037-route-scope-eviction/tasks.md`

---

## Deferred（本期不交付，仅保留入口）

- [x] T021 [DEFERRED] 显式 eviction/clear API（如需另起 spec/phase）`specs/037-route-scope-eviction/contracts/react-modulecache-eviction.md`

---

## Dependencies & Execution Order

- Phase 0 为单一事实源：应先完成并保持与实现一致。
- MVP 最小闭环：Phase 1（US1）即可独立验收；Phase 2（US2）用于把能力“降心智成本”并防误用。
- 可并行项：T012 / T013 / T018 可由不同人并行推进（不同包/不同文档文件）。
