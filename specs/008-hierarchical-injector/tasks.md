# Tasks: 008 层级 Injector 语义统一（Nearest Wins + Root Provider）

**Input**: `specs/008-hierarchical-injector/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）

**Tests**: 本特性触及 `packages/logix-core` / `packages/logix-react` 的核心解析路径；测试与回归防线视为 REQUIRED（除非在任务中显式给出可复现的替代证据）。

**Organization**: 按用户故事分组，保证每个故事可独立实现与验证。

## Phase 1: Setup（共享准备）

**Purpose**: 先把“怎么衡量/怎么验收/怎么迁移”准备好，避免热路径改动缺少证据链。

- [x] T001 创建性能证据记录文件 `specs/008-hierarchical-injector/perf.md`
- [x] T002 [P] 新增 perf 脚本（入口：`pnpm perf bench:008:resolve-module-runtime`）
- [x] T003 更新 `specs/008-hierarchical-injector/plan.md` 的 Constitution Check，补齐宪章 v2.1.0 新增自检项（Strict by Default/稳定标识/诊断 Slim）

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: 在改热路径前先锁死基线与裁决口径。

- [x] T004 运行并记录“变更前”perf 基线到 `specs/008-hierarchical-injector/perf.md`（入口：`pnpm perf bench:008:resolve-module-runtime`）
- [x] T005 [P] 梳理并记录“隐式解析路径清单”到 `specs/008-hierarchical-injector/research.md`（落点：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`）

**Checkpoint**: Perf 基线与隐式路径清单已固化，可开始按用户故事推进。

---

## Phase 3: User Story 1 - 层级解析可预测且一致 (Priority: P1) 🎯 MVP

**Goal**: strict 默认下，Logic/React 入口都遵循同一套“Nearest Wins + 不回退全局 registry”语义；缺失提供者必须稳定失败并可修复。

**Independent Test**: 构造“多 root + 缺失提供者 + 已存在其他 root 实例”场景，断言 strict 解析不会误拿到其他 root 的 runtime；并在 React 侧覆盖多层 imports.get（host→child→grandchild）。

### Tests for User Story 1

- [x] T006 [P] [US1] 新增回归测试：strict 缺失提供者时不回退到进程级 registry `packages/logix-core/test/hierarchicalInjector.strict-isolation.test.ts`
- [x] T007 [P] [US1] 新增回归测试：多层 imports.get 解析正确且稳定（覆盖 root host 与 local host）`packages/logix-react/test/hooks/useImportedModule.hierarchical.test.tsx`
- [x] T008 [P] [US1] 新增回归测试：当 root 已提供同模块时，`useModule(Program)` 仍必须创建局部实例（不得复用 root 单例）`packages/logix-react/test/hooks/useModule.program-vs-tag.test.tsx`
- [x] T009 [P] [US1] 新增回归测试：`useModule(Program,{ key })` 同 key 复用、异 key 隔离（并验证缺失 key 仍为组件级局部实例）`packages/logix-react/test/hooks/useModule.program-keyed.test.tsx`
- [x] T010 [P] [US1] 新增回归测试：imports-scope injector（`ImportsScope`）不持有完整 Context 且在 Scope.close 后可释放 `packages/logix-core/test/hierarchicalInjector.importsScope.cleanup.test.ts`

### Implementation for User Story 1

- [x] T011 [US1] 移除 ModuleTag 解析的进程级 registry fallback，并对齐 effect 原语（`Effect.service`/`yield* ModuleTag`）`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [x] T012 [US1] 调整 dev 错误信息：明确 strict 语义与修复建议（不再暗示“全局 registry 可用”）`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [x] T013 [US1] 重新定位 runtimeRegistry：仅用于内部调试（不作为解析兜底）并更新注释 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T014 [US1] 在 core 构造并挂载 imports-scope injector（`ImportsScope`，仅 ModuleToken→ModuleRuntime 映射；不持有完整 Context），并在 Scope.close 后释放引用 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T015 [US1] React strict imports 解析改为读取 `parentRuntime` 的 `ImportsScope`（不再依赖 `ImportedModuleContext`；多层 imports.get 依赖各 runtime 自身的 ImportsScope）`packages/logix-react/src/internal/resolveImportedModuleRef.ts`
- [x] T016 [US1] 移除 React `ImportedModuleContext` 外部 registry 与清理钩子（更新：`packages/logix-react/src/hooks/useModule.ts`、`packages/logix-react/src/hooks/useLocalModule.ts`、`packages/logix-react/src/internal/ModuleCache.ts`）`packages/logix-react/src/internal/ImportedModuleContext.ts`
- [x] T017 [US1] 更新/替换“卸载后清理”回归用例：从 ImportedModuleContext cleanup 迁移到 ImportsScope 生命周期断言 `packages/logix-react/test/internal/importedModuleContext.cleanup.test.tsx`
- [x] T018 [US1] 运行并记录“变更后”perf 指标到 `specs/008-hierarchical-injector/perf.md`（入口：`pnpm perf bench:008:resolve-module-runtime`）

**Checkpoint**: strict 默认已不再依赖进程级 registry；US1 的两类回归用例通过；perf 证据已记录。

---

## Phase 4: User Story 2 - Root Provider（单例）语义清晰可用 (Priority: P2)

**Goal**: 支持“显式 root/global”解析并保证不受子 scope 覆盖；strict 入口不允许静默降级到 root。

**Independent Test**: 在同一条执行链中同时存在 root provider 与子 scope override 时，显式 global 必定拿到 root；strict 必定失败并提示如何选择正确语义。

### Tests for User Story 2

- [x] T019 [P] [US2] 新增回归测试：显式 global/root 解析（ServiceTag + ModuleTag）不受子 scope override 影响 `packages/logix-core/test/hierarchicalInjector.root-provider.test.ts`
- [x] T020 [P] [US2] 新增回归测试：React 侧 `useModule(ModuleTag)`（受 `RuntimeProvider.layer` 影响）与 `runtime.runSync(Root.resolve(Tag))`（固定 root）语义对比 `packages/logix-react/test/hooks/useRootResolve.test.tsx`

### Implementation for User Story 2

- [x] T021 [US2] 引入 RootContextTag（每棵 Runtime 一份，禁止跨 root）`packages/logix-core/src/internal/runtime/core/RootContext.ts`
- [x] T022 [US2] 在 AppRuntime 构建时注入 RootContextTag `packages/logix-core/src/internal/runtime/AppRuntime.ts`
- [x] T023 [US2] 提供显式 root/global 解析入口：新增 `Logix.Root.resolve(Tag)` 并基于 RootContextTag 解析 ServiceTag/ModuleTag（ModuleTag 只返回 root 单例）`packages/logix-core/src/Root.ts`
- [x] T024 [US2] React 侧移除 `useImportedModule/host.imports.get` 的 global mode 语义与分支，保持 strict-only（root/global 单例通过 `Root.resolve` 获取）`packages/logix-react/src/internal/resolveImportedModuleRef.ts`
- [x] T025 [US2] 修正文档演练与注释：`$.use`=strict、跨模块协作使用 `orchestration link alias`、root/global 使用 `Root.resolve`（含 Root Mock 策略、`Root.resolve(ModuleTag)` 语义边界；补充 “Angular `providedIn:\"root\"` ↔ root layer + `Root.resolve`/`useModule(ModuleTag)`” 心智模型）`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`
- [x] T026 [P] [US2] 新增测试：`Root.resolve` 不受 `RuntimeProvider.layer` 覆盖影响（同时覆盖“如何 mock root provider”的测试形态）`packages/logix-core/test/hierarchicalInjector.root-resolve.override.test.ts`

**Checkpoint**: US2 用例通过：显式 global/root 不受 override 影响；strict 不静默降级。

---

## Phase 5: User Story 3 - 缺失/冲突时错误可读可修复 (Priority: P3)

**Goal**: 解析失败时给出同构且可修复的诊断信息（token/入口/mode/起点 scope/修复建议），并在不同入口保持一致。

**Independent Test**: 人工制造缺失与语义不匹配场景，断言错误信息包含关键字段且不会携带大对象/闭包。

### Tests for User Story 3

- [x] T027 [P] [US3] 强化 core 错误断言（tokenId/from/entrypoint/mode/fix）`packages/logix-core/test/BoundApi.MissingImport.test.ts`
- [x] T028 [P] [US3] 强化 react 错误断言（parent/child/mode/fix）`packages/logix-react/test/hooks/useImportedModule.test.tsx`

### Implementation for User Story 3

- [x] T029 [US3] 统一 core 错误 name 与字段，并确保载荷 Slim（不包含 Context/Effect/闭包）`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [x] T030 [US3] 统一 react 错误信息与字段（补 entrypoint/mode/startScope 等可读信息）`packages/logix-react/src/internal/resolveImportedModuleRef.ts`
- [x] T031 [US3] 将错误口径沉淀为 Debugging SSoT（不引入新协议则注明“仅错误文本”）`docs/ssot/runtime/logix-core/observability/09-debugging.md`

**Checkpoint**: 三个入口（`$.use` / `orchestration link alias` / `useImportedModule`）的错误可读且可修复；断言用例通过。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档、示例与迁移说明收口，确保对外体验一致。

- [x] T032 删除 `$.useRemote` 作为公共 API（同步更新类型导出与内部用例；迁移推荐为 `$.use` 或 `orchestration link alias`）`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [x] T033 [P] 同步用户文档：跨模块协作从 `$.useRemote` 迁移到 `orchestration link alias`（含最小示例与语义对比表）`apps/docs/content/docs/guide/learn/cross-module-communication.md`
- [x] T034 [P] 同步评审文档：移除/更新 `$.useRemote` 的公共 API 表述（保持与 008 一致）`docs/ssot/handbook/reading-room/reviews/02-mental-model-and-public-api.md`
- [x] T035 [P] 新增迁移辅助脚本（best-effort）：扫描 `$.useRemote` 与“`$.use(Module)` 但未声明 imports”的常见误用并输出提示 `scripts/migrate/008-hierarchical-injector.scan.ts`
- [x] T036 [P] 更新 runtime SSoT：作用域边界与最佳实践（UI 默认只绑定 Host，一跳 imports 直连；深层模块通过投影/边界 resolve 一次并透传 ModuleRef；必要时把常用模块提升为 Host 的直接 imports）`docs/ssot/runtime/logix-react/01-react-integration.md`
- [x] T037 [P] 更新多实例最佳实践（如需补充）：strict 与 global 的使用边界 `docs/ssot/runtime/logix-core/patterns/10-pattern-multi-instance.md`
- [x] T038 [P] 同步用户文档：补齐“组件侧读子模块”的推荐心智（Host 一跳、提升 imports、边界 resolve 一次） `apps/docs/content/docs/api/core/runtime.md`
- [x] T039 [P] 同步用户文档：`useModule/useLocalModule` 的单例/多实例心智与与最佳实践（UI 默认只拿 Host）`apps/docs/content/docs/api/react/use-module.md`
- [x] T040 [P] 同步用户文档：`useImportedModule`/`imports.get` 的推荐用法（最多一跳；深层用透传 ModuleRef/投影）与错误示例 `apps/docs/content/docs/api/react/use-imported-module.md`
- [x] T041 更新示例以对齐最佳实践（避免 strict 误用）：`examples/logix-react/src/demos/QuerySearchDemoLayout.tsx`
- [x] T042 运行质量门并修复回归（typecheck/test；lint 暂不纳入 gate）`package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1）→ Foundational（Phase 2）→ US1（Phase 3）→ US2（Phase 4）→ US3（Phase 5）→ Polish（Phase 6）

### User Story Dependencies

- US1（P1）无依赖，可作为 MVP 单独交付
- US2（P2）依赖 US1 的 strict 统一（否则 root/global 与 strict 的对比不稳定）
- US3（P3）建议在 US1/US2 之后补齐（需要明确 mode 边界以便错误可解释）

### Parallel Opportunities

- 标记为 `[P]` 的任务可并行推进（不同文件/弱依赖）
- US1/US2/US3 的测试任务优先并行写完（先红后绿）

---

## Parallel Example: User Story 1

```text
Task: [US1] 新增回归测试：strict 缺失提供者时不回退到进程级 registry packages/logix-core/test/hierarchicalInjector.strict-isolation.test.ts
Task: [US1] 新增回归测试：多层 imports.get 解析正确且稳定 packages/logix-react/test/hooks/useImportedModule.hierarchical.test.tsx
```
