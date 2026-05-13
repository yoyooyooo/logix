# Tasks: Action Surface（actions/dispatchers/reducers/effects）与 Manifest

**Input**: Design documents from `specs/067-action-surface-manifest/`
**Prerequisites**: `specs/067-action-surface-manifest/plan.md`、`specs/067-action-surface-manifest/spec.md`（其余为可选补充）

**Tests**: 涉及 `packages/logix-core` 运行时与反射链路，单测/类型回归/性能证据视为必需（NFR-001/SC-004/SC-006）。

## Phase 1: Setup（证据落盘与交接锚点）

- [x] T001 创建 `specs/067-action-surface-manifest/perf/README.md`（记录 envId、before/after/diff 路径与 PASS 判据；引用 `plan.md` 的 Perf Evidence Plan）

---

## Phase 2: Foundational（阻塞所有用户故事）

- [x] T002 在 `packages/logix-core/src/Action.ts` 定义 `Logix.Action` 命名空间（`ActionToken`/`ActionCreator`/`makeActions`，内部 canonical=token map，schema map 作为 sugar）
- [x] T003 [P] 在 `packages/logix-core/src/Module.ts` 支持 `actions` schema map → token map 规范化，并固化 `actionTag = key`（forward-only；不得引入独立 stable tag）
- [x] T004 [P] 在 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 移除 Proxy `$.actions.<tag>` 动态属性主路径，改为暴露两套视图：`$.actions`（creator，纯数据）与 `$.dispatchers`（Effect 执行）
- [x] T005 在 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` / `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts` 对齐 dispatch 入口：支持 `$.dispatch(token, payload)` / `$.dispatch(action)`，并保留字符串 tag 的派发/订阅作为兼容路径（FR-009）
- [x] T006 [P] 将 `Reducer.mutate` 调整为 payload-first（`(state|draft, payload)`）并全仓修正 call sites（`packages/logix-core/src/**` + 相关测试）
- [x] T007 [P] 将 `onAction(token)` 的回调入参改为 payload-first，并保持 predicate/string 监听仍回调完整 action object（FR-016；重点落点：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`）

**Checkpoint**: 不依赖 codegen 的 token-first 路径可编译；`actions/dispatchers/reducer/onAction` 的类型与运行期语义不再依赖 Proxy/字符串作为主路径。

---

## Phase 3: User Story 1 - 运行时事件可回链到 Action 定义（Studio/Devtools） (Priority: P1) 🎯 MVP

**Goal**: 每次 action 派发都能通过 `ActionRef(moduleId + actionTag)` 稳定映射回模块 manifest 中的 action 定义摘要（无定义时降级 unknown/opaque）。

**Independent Test**: 构造一个包含多个 actions/primary reducer 的模块，派发多次 action，验证事件里的 `{moduleId, actionTag}` 能 join `CoreReflection.extractManifest(...).actions[]`；未声明 action 标记为 unknown/opaque。

- [x] T008 [US1] 在 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts` 统一 actionTag 语义（`_tag` 为权威，必要时仅容错读取 `type`），并确保 action debug event 的 `label === actionTag`
- [x] T009 [US1] 在 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`（或等价投影点）确认/补齐 `RuntimeDebugEventRef.kind="action"` 的 ActionRef 映射规则，并为 unknown action 提供可解释降级字段
- [x] T010 [P] [US1] 在 `packages/logix-core/src/internal/reflection/manifest.ts` / `packages/logix-core/src/internal/reflection-api.ts` 输出 `ModuleManifest.actions[]`（至少含 `actionTag` + payload kind + primaryReducer 摘要 + best-effort source），并稳定排序
- [x] T011 [P] [US1] 新增单测 `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts`：验证 actions[] 的稳定排序与 payload kind 推断；并验证事件 ActionRef 可 join 到 manifest entry
- [x] T012 [US1] 新增单测 `packages/logix-core/test/internal/Runtime/Action.UnknownFallback.test.ts`：派发未声明 action 时事件被标记为 unknown/opaque，且不污染已声明 actions 的统计/对齐

---

## Phase 4: User Story 2 - 平台可提取可序列化的 Module Manifest（免 AST） (Priority: P2)

**Goal**: `CoreReflection.extractManifest` 输出 deterministic JSON（可 diff），并具备体积预算与确定性截断策略（SC-006）。

**Independent Test**: 对同一模块重复提取 manifest，字节级一致；当 actions 过多导致超 64KB 时，截断点与 digest 一致且可解释。

- [x] T013 [US2] 在 `packages/logix-core/src/internal/reflection/manifest.ts` 实现 `maxBytes` budget + 确定性截断策略，并输出 `meta.__logix.truncated` 证据（SC-006）
- [x] T014 [P] [US2] 新增单测 `packages/logix-core/test/internal/Reflection/Manifest.Truncation.test.ts`：构造超大 actions 集合，验证多次生成 digest 一致、截断点一致、且只按稳定顺序裁剪尾部（吸收 review R101）
- [x] T015 [P] [US2] 新增单测 `packages/logix-core/test/internal/Reflection/Manifest.Determinism.test.ts`：同输入多次提取字节级一致（SC-001），并覆盖 `effects[]` 为空/存在时的稳定排序

---

## Phase 5: User Story 4 - 副作用注册面可治理（effects/$.effect） (Priority: P2)

**Goal**: 将副作用注册提升为一等概念：同一 actionTag 允许多个 handler（1→N），事务外执行、失败隔离、可去重、可诊断；并能在 manifest/诊断中解释来源（sourceKey）。

**Independent Test**: 为同一 actionTag 注册多个 effects（Module.make 声明 + setup 注册），派发一次 action 触发 K 次 handler；重复注册同一来源不翻倍且有诊断；run 动态注册只对未来 action 生效并提示。

- [x] T016 [US4] 在 `packages/logix-core/src/Module.ts` 支持 `effects` 声明（图纸级别），并在运行时转译为内部 logic unit（setup 阶段调用 `$.effect` 注册）
- [x] T017 [US4] 在 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 实现 `$.effect(token, handler)`：setup 注册为主；run 动态注册作为高级能力（必须产出 dynamic/late 诊断）
- [x] T018 [P] [US4] 新增 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`（或等价落点）：实现 “每 tag 单 watcher + handlers fan-out” 的执行模型（事务外、失败隔离、默认不承诺顺序）
- [x] T019 [P] [US4] 在 `packages/logix-core/src/internal/reflection/manifest.ts` 增补 `ModuleManifest.effects[]`（至少包含 Module.make 声明的 effects；试运行可补齐 setup 注册并标记 kind=registered），并按 `(actionTag, sourceKey)` 稳定排序
- [x] T020 [P] [US4] 新增单测 `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts`：覆盖 (tag, sourceKey) 去重=no-op、dynamic/late 诊断、handler failure 隔离

---

## Phase 6: User Story 3 - 开发者可选用 token-first 获得 IDE 跳转/引用（不依赖 codegen） (Priority: P3)

**Goal**: token-first 写法获得“跳转到定义/找引用/重命名”闭环；并在文档中明确 actions/dispatchers 的语义边界与推荐写法（避免 Schema/Token 混用造成 DX 不确定）。

**Independent Test**: 以 schema map 定义 actions；在逻辑中使用 `$.dispatchers.add(1)` / `$.onAction($.actions.add).run((payload)=>...)`；类型与运行行为正确（IDE 跳转由开发者人工验证）。

- [x] T021 [US3] 更新 `specs/067-action-surface-manifest/quickstart.md`：统一术语为 “Module Manifest（ModuleManifest）”，并明确推荐写法（schema map 或 `Logix.Action.makeActions`，避免混用）（吸收 review R102）
- [x] T022 [P] [US3] 在 `packages/logix-core` 补充类型回归用例（例如 `packages/logix-core/test/types/ActionSurface.d.ts.test.ts` 或等价位置）：确保 `$.actions` 仅为 creator、`$.dispatchers` 为 Effect 执行，且 token-first 的 payload 类型可推导

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T023 [P] 跑通并落盘 perf evidence：按 `specs/067-action-surface-manifest/plan.md` 的 Perf Evidence Plan 生成 before/after/diff（要求 `meta.comparability.comparable=true`；若不可比则复测/缩小 files 子集）
- [x] T024 [P] 回写 `specs/067-action-surface-manifest/perf/README.md`：填入 envId、profile、before/after/diff 路径与 PASS/FAIL 结论（含 `meta.matrixId/matrixHash`）
- [x] T025 [P] 更新 runtime SSoT 文档：固化 `actions/dispatchers/effects` 的对外语义与示例（按 plan.md 的 Constitution Check 指示路径）
- [x] T026 跑通质量门：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`

---

## Phase 8: Acceptance Follow-ups（post-acceptance）

- [x] T027 修复 `quickstart.md` 漂移：移除对未导出的 `Logix.Action.make` 的引用，改用 `Logix.Action.makeActions`（SC-003）
- [x] T028 对齐 `$.dispatchers` 的性能目标：避免为每个 bound instance 预先生成 O(n) 的 dispatcher 闭包（改为 lazy/cached 视图）
- [x] T029 增强 ActionAnchor 粒度：为 `ModuleManifest.actions[]` 提供 per-action best-effort source（而非模块级复用），并保持 deterministic + budget
- [x] T030 Perf Evidence 可复现性：在可控环境下补一次 clean after 的 perf diff（消除 `git.dirty.after=true` 警告）或写明该 warning 的具体原因

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 为前置；Phase 2 完成后可进入 US1（MVP）。
- US2（determinism/budget/truncation）与 US4（effects）可在 US1 打通后并行推进。
- US3 以文档与类型回归为主，可在 Phase 2 完成后并行推进。
