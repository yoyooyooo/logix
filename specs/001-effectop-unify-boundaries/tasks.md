# Tasks: 001-effectop-unify-boundaries（EffectOp 总线彻底收口）

**Input**: Design documents from `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/`
**Prerequisites**: `plan.md`（required）, `spec.md`（required）, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Phase 1: Foundational（防呆基座，阻塞所有后续）

- [x] T001 [US1] 盘点所有“边界执行点”清单并落到文档（覆盖内部/调试类边界）：`specs/001-effectop-unify-boundaries/research.md`
- [x] T002 [US1] 在 Runtime 内核引入唯一执行入口 `runOperation`（统一补齐 meta + 读取 middleware stack + 空 stack 直通）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T003 [US1] 引入 linkId 传播机制（边界起点创建、嵌套复用、对外保证总是存在）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（或等价 core 文件） + `packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- [x] T004 [US1] 定义“显式拒绝失败”类型与语义，并确保拒绝发生在用户程序之前：`packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- [x] T005 [US1] 定义全局/局部策略优先级规则的承载方式（meta 字段）并在运行时做约束：`packages/logix-core/src/internal/runtime/EffectOpCore.ts` + `packages/logix-core/src/middleware/index.ts`

**Checkpoint**: 任意一次边界操作在执行前都只能走 `runOperation`；linkId 总是存在；拒绝语义与优先级规则有可测试落点。

---

## Phase 2: Tests（先写兜底测试，再接线实现）

- [x] T006 [US1] 新增“总线覆盖矩阵”测试：触发各类边界操作，中间件必须观测到（含内部/调试类边界）：`packages/logix-core/test/*`
- [x] T007 [US1] 新增“守卫拒绝=显式失败且无副作用”测试：被拒绝操作不得执行用户副作用：`packages/logix-core/test/*`
- [x] T008 [US1] 新增“linkId 关联”测试：同一链路多步操作共享 linkId，独立链路不同：`packages/logix-core/test/*`
- [x] T009 [US1] 新增“优先级”测试：局部不能关闭全局守卫；局部可关闭纯观测：`packages/logix-core/test/*`

---

## Phase 3: Wiring（把所有边界执行点接入 runOperation）

- [x] T010 [US1] Flow 边界：`run/runLatest/runExhaust/runParallel/*Fork` 每次事件处理都提升为 Operation 并进入总线：`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`、`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [x] T011 [US1] Action 边界：dispatch/emit 进入总线并携带 linkId：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（及相关 runtime 文件）
- [x] T012 [US1] State 边界：update/mutate/reducer/patch 进入总线并携带 linkId：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T013 [US1] Lifecycle + Debug/Devtools 边界：内部/调试类边界一律进入总线：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts` 等
- [x] T014 [US1] Trait/Service 边界：StateTrait.install 与 resource/query 相关边界进入总线并携带 linkId：`packages/logix-core/src/internal/state-trait/install.ts`（及相关）

---

## Phase 4: Remove Legacy（移除旧入口与旧叙事）

- [x] T015 [US3] 删除遗留“局部加固/包一层”入口（含 branded type）并修复所有引用：`packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts`、`packages/logix-core/src/Logic.ts`、`packages/logix-core/src/Bound.ts` 等
- [x] T016 [US2] 保持业务侧写法稳定：最小修改现有示例/文档，迁移到“全局 middleware + 局部 meta 标注”：`apps/docs/**`、`examples/**`

---

## Phase 5: 001a 回查与对齐（FR-007/SC-004）

- [x] T017 [US3] 回查 `specs/001a-module-traits-runtime/*` 中与 EffectOp/Middleware 相关承诺，输出“已覆盖/需修订/延期”清单：写入 `specs/001-effectop-unify-boundaries/research.md`
- [x] T018 [US3] 需要修订的规范/用户文档同步修订（只做叙事与契约对齐，不引入新概念）：`docs/specs/runtime-logix/**`、`apps/docs/**`

---

## Phase 6: Quality Gates（必须通过）

- [x] T019 运行 `pnpm typecheck`（通过）
- [x] T021 运行 `pnpm test --filter logix-core`（通过）
