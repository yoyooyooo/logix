# Tasks: Root Runtime Runner（根模块运行入口）

**Input**: `specs/024-root-runtime-runner/spec.md`、`specs/024-root-runtime-runner/plan.md`、`specs/024-root-runtime-runner/research.md`、`specs/024-root-runtime-runner/data-model.md`、`specs/024-root-runtime-runner/contracts/*`、`specs/024-root-runtime-runner/quickstart.md`  
**Prerequisites**: `specs/024-root-runtime-runner/plan.md`（required）、`specs/024-root-runtime-runner/spec.md`（required）

**Tests**: 本特性落点涉及 `packages/logix-core` 与 `packages/logix-test`，测试视为必选；并补齐最小“启动耗时”基线证据，防止无意引入重复 build/boot 的开销。

**Organization**: 任务按用户故事分组；US2 依赖 US1 的 program runner 表面积；US3 文档可与 US1 并行推进，但以 US1/US2 的最终契约为准收口。

## Phase 1: Foundational（Blocking Prerequisites）

**Purpose**: 在进入任意用户故事实现前，先固化“对外契约 + 错误分类 + 测试基座 + 性能证据跑道”。

- [x] T001 固化 program runner 对外契约（以 contracts 为准，允许微调命名但不得改变语义）：`specs/024-root-runtime-runner/contracts/api.md`
- [x] T002 [P] 列出 runtime SSoT 需同步的落点清单（不在本阶段改 SSoT 内容；留待 Phase N 收口）：`docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md`、`docs/ssot/runtime/logix-core/api/README.md`
- [x] T003 设计并锁定错误分类与可行动提示（Boot/Main/DisposeTimeout 可区分；包含退出策略提示字段；错误载荷需 Slim、可序列化，并包含稳定 id；DisposeTimeout 必须包含可行动建议，例如“检查未 unregister 的 event listener / 未 join 的 fiber / 未关闭资源句柄”）：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.errors.ts`、`packages/logix-core/src/Runtime.ts`（对外类型与行为约束）
- [x] T004 [P] 建立“启动耗时”基线脚本与证据跑道（入口：`pnpm perf bench:024:boot`；输出 JSON；目录与 `perf.md` 落点齐备；不要求本任务内产出结论数据）：`specs/024-root-runtime-runner/perf.md`、`specs/024-root-runtime-runner/perf/`
- [x] T005 固化事务边界约束（runner 不进入事务窗口、不引入 IO/async、不提供写逃逸通道），写入契约并在实现处补最小防线：`specs/024-root-runtime-runner/contracts/api.md`、`packages/logix-core/src/Runtime.ts`
- [x] T006 [P] 建立 internal 主实现骨架（顶层只接线）：新增 `packages/logix-core/src/internal/runtime/runner/*` 并确保 `packages/logix-core/src/Runtime.ts` 仅作为薄入口导出（避免实现散落/循环依赖）：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.context.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.options.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.closeScope.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.signals.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.exitCode.ts`、`packages/logix-core/src/Runtime.ts`
- [x] T007 [P] 固化 024/025 的“单一 boot 内核”复用点（避免 Runner/TrialRun 漂移）：明确 025 Trial Run 必须复用 `Runtime.openProgram`/ProgramRunner boot，而不是复制装配逻辑，并在两侧 plan 中建立引用：`specs/024-root-runtime-runner/integration-evaluation-with-025.md`、`specs/025-ir-reflection-loader/plan.md`

**Checkpoint**: 进入实现阶段前，契约/错误分类/证据跑道已明确且可复跑。

---

## Phase 2: User Story 1 - 一键运行根模块（脚本/命令行友好） (Priority: P1) 🎯 MVP

**Goal**: 提供 `@logixjs/core` 的 program runner：自动启动 program module、执行主流程、最终释放资源；并提供 `ctx.$` 以复用 `$.use(module)` + handle-extend（controller）。

**Independent Test**: 在测试中构造一个包含常驻监听逻辑的 program module：用 program runner 执行主流程（显式退出条件）后能正常返回，且资源释放发生（Layer finalizer 被调用）。

### Tests for User Story 1（先写测试，确保失败后再实现）

- [x] T010 [P] [US1] `runProgram`：boot 后主流程可派发 action 并观察到状态变化（证明常驻逻辑已启动）：`packages/logix-core/test/Runtime.runProgram.basic.test.ts`
- [x] T011 [P] [US1] `runProgram`：成功/失败两种路径都会释放资源（用可观测 finalizer 断言）：`packages/logix-core/test/Runtime.runProgram.dispose.test.ts`
- [x] T012 [P] [US1] `runProgram`：`ctx.$.use(module)` 能拿到 handle-extend（controller/extra 字段），而不仅是 `ModuleRuntime`：`packages/logix-core/test/Runtime.runProgram.handleExtend.test.ts`
- [x] T013 [P] [US1] `runProgram`：Boot/Main/DisposeTimeout 可区分，且包含可行动提示（尤其 DisposeTimeout 的建议字段/提示文本）与稳定标识（至少 `moduleId + instanceId`）：`packages/logix-core/test/Runtime.runProgram.errorCategory.test.ts`
- [x] T014 [P] [US1] `openProgram`：返回的 `ctx` 必须已完成 boot（可立即交互使用）；scope-bound，上层关闭 scope 后资源释放（不要求进程退出，但要有可观测释放证据）：`packages/logix-core/test/Runtime.openProgram.scoped.test.ts`
- [x] T018 [P] [US1] `runProgram/openProgram`：`RuntimeOptions.onError` 被透传并可用于顶级错误上报（不改变退出策略）：`packages/logix-core/test/Runtime.runProgram.onError.test.ts`
- [x] T019 [P] [US1] `runProgram`：主流程可通过外部信号/观测条件表达退出（不侵入模块定义）；退出后释放资源且进程可自然退出：`packages/logix-core/test/Runtime.runProgram.exitCondition.test.ts`
- [x] T024 [P] [US1] `openProgram`：同进程并行运行多个 root 实例相互隔离（state/handle/registry），关闭各自 Scope 时释放互不影响；不得出现 process-global fallback：`packages/logix-core/test/Runtime.openProgram.multiRoot.isolated.test.ts`
- [x] T025 [P] [US1] `runProgram`：当 finalizer 卡住导致关闭 scope 超时，`closeScopeTimeout` 生效并以 DisposeTimeout 失败，同时触发 `onError` 告警；错误载荷必须包含可行动建议（例如未 unregister listener / 未 join fiber 等）：`packages/logix-core/test/Runtime.runProgram.disposeTimeout.test.ts`
- [x] T026 [P] [US1] `runProgram`：注入 typed args（`main(ctx, args)`）可在不读 `process.argv` 的前提下驱动分支，并保持可测试：`packages/logix-core/test/Runtime.runProgram.args.test.ts`
- [x] T027 [P] [US1] `runProgram`：`handleSignals` 捕获 SIGINT/SIGTERM 后触发 graceful shutdown（关闭 `ctx.scope`），覆盖“信号在 boot 尚未完成时到达”的场景；不得调用 `process.exit`，且监听器可被移除（无泄漏/串扰）：`packages/logix-core/test/Runtime.runProgram.signals.test.ts`
- [x] T028 [P] [US1] `runProgram`（CLI mode）：启用 `exitCode` 后，`main` 成功返回 `void|number` 可映射到 `process.exitCode`；失败路径默认映射为非 0（默认 1），并可通过 `onError` 保持可解释：`packages/logix-core/test/Runtime.runProgram.exitCode.test.ts`
- [x] T029 [P] [US1] `runProgram`（CLI mode）：`reportError=false` 时 runner 不做默认错误输出（由调用方接管）；`reportError=true` 时默认输出行为可被观测（或通过 `onError` 接入）：`packages/logix-core/test/Runtime.runProgram.reportError.test.ts`

### Implementation for User Story 1

- [x] T015 [US1] 实现 `Runtime.openProgram`：返回 `ProgramRunContext`（scope/runtime/module/`$`），并在返回前完成 boot（至少触碰一次 program module 的 tag，确保实例化与 logics/processes 启动）；生命周期绑定 Scope；透传 `RuntimeOptions`（含 `onError`）；strict by default（不静默回退到 global），不得引入进程级全局解析：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.context.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.options.ts`、`packages/logix-core/src/Runtime.ts`
- [x] T016 [US1] 实现 `Runtime.runProgram`：基于 `openProgram` 封装“一次性运行”；确保 boot（触碰 program module 的 tag 一次）发生在进入 main 之前；确保 finally 释放（含 `closeScopeTimeout`）；支持 typed args（`main(ctx, args)`）、可选 `handleSignals`（Node）、可选 CLI `exitCode/reportError`；不引入隐式保活；透传 `RuntimeOptions`（含 `onError`）：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.context.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.options.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.closeScope.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.signals.ts`、`packages/logix-core/src/internal/runtime/runner/ProgramRunner.exitCode.ts`、`packages/logix-core/src/Runtime.ts`
- [x] T017 [US1] 让 `ctx.$` 在脚本侧可用且语义与 Logic 一致（复用 `Bound.make(shape, runtime)`；保证 `$.use(module)` 合并 handle-extend）：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/Bound.ts`

---

## Phase 3: User Story 2 - 与测试运行时对齐（复用同一套心智模型） (Priority: P2)

**Goal**: `@logixjs/test` 彻底切到 program runner 新模型：不再自建生命周期/装配（Scope/boot/释放），以 program module 为唯一输入复用 `Runtime.openProgram/runProgram` 内核，并在其之上叠加 trace/断言/TestClock；不提供兼容层，仓库内用例/示例同步迁移。

**Independent Test**: 同一个 program module：用 `Runtime.runProgram` 与 `@logixjs/test` 的入口分别跑，关键可观测行为（状态/动作时间线）一致；测试入口仍能提供额外断言与可控时钟。

### Tests for User Story 2

- [x] T020 [P] [US2] 新测试入口与 program runner 行为一致：同一 program module 在两种入口下产出一致的关键可观测行为（state/actions/trace 口径一致），且释放语义一致（finalizer 可观测）：`packages/logix-test/test/TestProgram.test.ts`（重写为新模型）
- [x] T021 [P] [US2] 回归验证：仓库内所有测试/示例完成迁移后仍可运行，且无旧 API 残留（至少 `TestProgram.make`/`itScenario`/`Scenario.ts`/`TestRuntime.ts`/`_op_layer`）：`packages/logix-test/test/Scenarios.test.ts`（可能删除/重写）、`packages/logix-test/test/vitest_program.test.ts`（重写并改名）、`examples/logix-react/test/module-flows.integration.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] 重写 `@logixjs/test` 的测试入口（新模型）：以 program module 为唯一输入导出 `TestProgram.runProgram(programModule, body, options?)`（复用 `Runtime.openProgram/runProgram` 内核），在一次运行内收集 trace 并提供 `TestApi`（含 `api.ctx.$`/dispatch/assert/TestClock）；`Vitest.ts` 提供 `itProgram/itProgramResult` 语法糖；移除 `TestProgram.make(config)`/ScenarioBuilder：`packages/logix-test/src/api/TestProgram.ts`、`packages/logix-test/src/Vitest.ts`、`packages/logix-test/src/index.ts`
- [x] T023 [US2] 删除旧生命周期内核与装配 hack：移除/合并 `packages/logix-test/src/Scenario.ts`、`packages/logix-test/src/runtime/TestRuntime.ts`，同时移除基于 `_op_layer` 的 env/process layer 分类；长期流程统一走 program module 的 `processes`（与 024 runner 对齐）

---

## Phase 4: User Story 3 - 统一心智模型与文档（解释“为何不会自动退出”） (Priority: P3)

**Goal**: 用户文档与 runtime SSoT 同步解释 program runner 的使用方式、退出策略与常见误用，避免 Host/Deferred 变体扩散。

**Independent Test**: 读者按文档将一个旧的“手动挡”示例改写为 program runner + 显式退出条件；无需侵入业务模块定义即可正确运行。

- [x] T031 [P] [US3] 更新用户文档：补齐 program runner 用法与“为何不会自动退出”的解释（避免内部术语），并说明错误上报与退出策略的关系：`apps/docs/content/docs/api/core/runtime.md`

---

## Phase N: Polish & Regression Defenses（Required）

- [x] T030 [P] [US3] 同步 runtime SSoT（收口阶段）：program runner 的语义、`module vs runtime` 区分、`ctx.scope/ctx.$` 的定位、`RuntimeOptions.onError` 顶级上报、`closeScopeTimeout` 释放收束、`handleSignals/args/exitCode/reportError`（CLI ergonomics）、退出策略不自动推断：`docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md`
- [x] T032 [P] [US3] 同步 runtime glossary（收口阶段）：补齐 Program runner/ProgramRunContext/closeScopeTimeout/DisposeTimeout/handleSignals/exitCode/reportError 等术语：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.md`
- [x] T033 [P] 同步 runtime SSoT/impl（收口阶段）：更新 `@logixjs/test` 的推荐入口与心智模型（删掉 `TestProgram.make/Scenario` 旧口径，改为 program module + core runner 复用）：`docs/ssot/runtime/logix-core/impl/07-test-package.md`
- [x] T034 [P] 同步 `docs/specs` 旧口径（收口阶段）：替换所有对 `TestProgram.make/itScenario/Scenario` 的过时描述，统一指向新模型与 `Runtime.runProgram/openProgram`：`docs/specs/review/runtime-ssot-spec-todo.md`、`docs/ssot/platform/implementation-status.md`、`specs/003-trait-txn-lifecycle/quickstart.md`
- [x] T035 [P] 迁移验收（收口阶段）：在 `@logixjs/test` 源码范围（`packages/logix-test/src`）内旧 API / hack 不再出现（允许其它包/示例/规格出现同名 UI 术语或 `effect` 的 `_op_layer` 内部标记）；验收命令：`rg "TestProgram\\.make\\(" packages/logix-test/src`、`rg "\\bitScenario\\b" packages/logix-test/src`、`rg "\\bScenario(Config|Builder)?\\b" packages/logix-test/src`、`rg "\\bTestRuntime\\b" packages/logix-test/src`、`rg "_op_layer\\b" packages/logix-test/src`；确认 `handoff.md` 已包含关键迁移的 Before/After 代码对比；并确认 `contracts/api.md`、`quickstart.md`、runtime SSoT 与 examples 的用法口径一致
- [x] T043 [P] 收口复核 runtime SSoT 链接与口径：更新 api/README.md 入口链接，并确认与 `contracts/api.md`、`quickstart.md`、025 引用点一致：`docs/ssot/runtime/logix-core/api/README.md`
- [x] T041 [P] 更新 `specs/024-root-runtime-runner/quickstart.md`：确保示例与最终 API/术语一致
- [x] T040 记录并校验“启动耗时”证据（基于 `pnpm perf bench:024:boot` 与落点，manual vs new API，预算≤5%）；更新 `specs/024-root-runtime-runner/perf.md` 并提交 raw JSON：`specs/024-root-runtime-runner/perf.md`、`specs/024-root-runtime-runner/perf/`
- [x] T042 [P] 更新 `specs/024-root-runtime-runner/handoff.md`：记录最终裁决、迁移要点与对齐结论（尤其 `@logixjs/test` 的调整）；必须包含“Before/After”代码对比（至少覆盖：单模块测试迁移、以及多模块+Link/长期流程迁移）

---

## Dependencies & Execution Order（简版）

- Phase 1（T001–T006）完成后，US1/US2/US3 才能进入实现与收口。
- US2 依赖 US1 的 program runner 表面积（open/run + ctx 语义）。
- US3 可与 US1 并行起草，但必须在 US1/US2 最终契约确定后收口。

---

## Acceptance Follow-ups（Post-acceptance）

> 来自 `$speckit acceptance 024 025` 的漂移/缺口项；用于恢复质量门并消除长期漂移风险。

- [x] T050 [P] [Acceptance] 修复 `examples/logix-react` 的 program module 导出/用法漂移，恢复工作区 `pnpm typecheck`：更新 `examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`（`QuerySearchDemoHostImpl` → `QuerySearchDemoHostModule` 并匹配 `useModule(...)` 的参数类型）、更新 `examples/logix-react/test/module-flows.integration.test.ts`（传入 `ModuleImpl/AnyModule`，移除错误的 `.impl` 链式访问，并收敛 `unknown` 推导）。Refs: SC-004, FR-008
- [x] T051 [P] [Acceptance] 为 `Runtime.runProgram` 补齐与 `openProgram` 同等的同步事务窗口防线（禁止在 StateTransaction body 内调用），确保 runner 不会把 IO/async 引入事务窗口。Refs: NFR-004
