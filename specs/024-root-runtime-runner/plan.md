# Implementation Plan: Root Runtime Runner（根模块运行入口）

**Branch**: `024-root-runtime-runner` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/024-root-runtime-runner/spec.md`

## Summary

本特性为脚本/demo/命令行提供一个标准的“运行根模块”入口：封装 root 模块启动（触碰 root tag 触发实例化与 logics/processes 启动）与资源释放（确保 Scope 关闭），并提供一个可复用的运行上下文（root runtime + `$` Bound API），让脚本侧也能用 `$.use(module)` 获得带 handle-extend（controller 等）的句柄；同时透传 `RuntimeOptions.onError`，允许脚本/CLI 配置顶级错误上报。与此同时，`@logixjs/test` 将彻底切到同一模型：删除旧的 `TestProgram/Scenario` 生命周期模型，测试入口以 program module 为输入复用 `Runtime.openProgram/runProgram` 内核，只在其上叠加 trace/断言/TestClock（不提供兼容层）。

## Terminology

- Root module（spec）= Program module（contracts）：作为可运行程序的根模块。
- Program runner：`Runtime.runProgram` / `Runtime.openProgram`（`@logixjs/core`）。
- Exit strategy：由调用方在 `main(ctx, args)` 中显式表达；runner 只负责 boot 与释放，不做隐式保活（`args` 由 runner 注入，避免读取 `process.argv`）。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.21.1
**Primary Dependencies**: effect v3 (`effect@^3.19.8`) + `@logixjs/*`（涉及 `@logixjs/core` / `@logixjs/test`）
**Storage**: N/A（不引入持久化存储）
**Testing**: Vitest 4 (`vitest run`) + `@effect/vitest`（Effect-heavy 场景）
**Target Platform**: Node.js（脚本/测试/CLI），并与 React RuntimeProvider 语义保持一致（概念对齐，不新增浏览器特化实现）
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）
**Performance Goals**:

- 入口本身不触及事务/调度热路径；新增开销应主要来自“减少样板并保持语义一致”。
- 相对同等工作负载（手写 `Runtime.make + runPromise + dispose`），新增入口的额外启动耗时预算 ≤ 5%。
- 度量方式：添加可复跑的启动基准（重复创建/启动/释放 root runtime N 次，记录 wall time）；证据写入 `specs/024-root-runtime-runner/perf.md`，raw JSON 写入 `specs/024-root-runtime-runner/perf/`。
  **Constraints**:
- Strict by default：不得引入也不得依赖“进程级全局解析 fallback”；多 root/多实例必须仍基于 Effect Context/scope 语义解析。若仓库仍存在历史 fallback，本特性需先删除/封锁并以测试兜底，避免静默回退。
- 生命周期与退出策略分离：入口负责启动/释放；退出策略必须由调用方显式表达（主流程结束/外部信号/观测条件），不引入隐式保活。
- 释放收束：`closeScopeTimeout` 默认 1 秒；当 finalizer 卡住导致释放超时时，必须以结构化 DisposeTimeout 失败并触发 `RuntimeOptions.onError`（用于告警），避免无限悬挂且保持可解释链路；DisposeTimeout 错误必须包含可行动建议（例如未 unregister event listener / 未 join fiber / 未关闭资源句柄）。
- CLI 友好（Node-only）：`runProgram` 可选处理 SIGINT/SIGTERM 触发 graceful shutdown（关闭 `ctx.scope`，`handleSignals` 默认 `true` 可关闭），不得默认 `process.exit`；在 CLI mode（`exitCode`）下支持“结构化退出码”（success=`void|number` → `process.exitCode`，`void`=0；失败默认 1）与错误输出策略（`reportError` 默认 `true` 可关闭，或交给 `onError`），以减少脚本样板并保持可测试性；MVP 阶段 args 只透传不做 Schema 校验。
- 024/025 协同（边界裁决）：
  - 025 Trial Run 只复用 024 的 `openProgram/boot`（full boot：包含 logics/processes 启动），在受控窗口内采集证据/IR，然后关闭 scope 收束；**不执行** 024 的 `main`。
  - 超时口径：`trialRunTimeoutMs`（试跑窗口）= TrialRunTimeout；`closeScopeTimeout`（释放收束，复用 024）= DisposeTimeout（必要时两者都记录）。
  - 标识口径：`runId`（RunSession/Trial Run 会话）与 runtime `instanceId`（实例）分离；证据/IR 对齐携带 `runId + moduleId + instanceId`，不得混用或强行相等。
  - 缺失依赖（Service/Config）：Trial Run 必须 hard fail，并在失败载荷中携带缺失清单与最小上下文（阶段/入口/标识），便于 CI/平台给出行动建议。
- `@logixjs/test` 对齐：彻底切到 runner 新模型；不再自建 Scope/Layer.build/boot/释放，也不再维护 `TestProgram.make(config)`/ScenarioBuilder 这类独立装配外表；仓库内测试/示例同步迁移，不提供兼容层。
- 句柄扩展一致性：脚本侧 `$.use(module)` 必须与 Logic/React 的 handle-extend（`Symbol.for("logix.module.handle.extend")`）机制一致。
- 诊断信息必须 Slim 且可序列化；默认路径不增加额外事件/分配，失败路径仅产出最小错误载荷；复用已有错误/诊断协议，避免引入进程级单例依赖。

**Scale/Scope**:

- 新增少量公共 API（program runner）+ 对齐 `@logixjs/test` 的封装；不引入新的领域能力与持久化/网络。

## Migration Notes（Breaking Changes）

本特性包含对 `@logixjs/test` 的破坏性变更：删除旧的 `Scenario/TestRuntime/TestProgram.make(config)` 生命周期模型，统一以 `@logixjs/core` 的 `Runtime.openProgram/runProgram`（及其内部 ProgramRunner）作为唯一生命周期内核；不提供兼容层或 deprecation 期。

### 删除/替换清单（对外）

- 删除：`TestProgram.make(config)`、`ScenarioConfig`、`Scenario`、`ScenarioBuilder`
- 删除：`itScenario`、`itScenarioResult`（Vitest 语法糖）
- 删除：`Scenario.ts`、`runtime/TestRuntime.ts`、以及基于 `_op_layer` 的 env/process layer 分类 hack
- 新增：`TestProgram.runProgram(programModule, body, options?)`（以 program module 为唯一输入）
- 新增：`itProgram`、`itProgramResult`（Vitest 语法糖；命名与 `Runtime.runProgram` 对齐）

### 迁移写法（常见模式）

1. **单模块**

- 旧：`TestProgram.make({ main: { module, initial, logics } }).run(body)`
- 新：先用 `module.implement({ initial, logics })` 构造 `programModule`，再调用 `TestProgram.runProgram(programModule, body)`；`body` 内使用 `api.ctx.$`/`api.dispatch`/`api.assert.*`（以 `contracts/api.md` 为准）。

2. **多模块 + Link（长期流程）**

- 旧：`modules: [...] + layers: [Layer.scopedDiscard(LinkLogic)]`（或依赖 `_op_layer` 推断 process layer）
- 新：把协作模块实现体放到 `programModule.implement({ imports: [...] })`，把 Link/长期流程放到 `programModule.implement({ processes: [Link.make(...)] })`；Service Mock 等 Env 注入改为 `RuntimeOptions.layer`（由 `TestProgram` 透传给 core runner），不再通过 `_op_layer` 分类。

### 批量替换与验收（迁移完成后必须满足）

- `@logixjs/test` 源码范围（`packages/logix-test/src`）内旧 API / hack 不再出现；验收命令：`rg "TestProgram\\.make\\(" packages/logix-test/src`、`rg "\\bitScenario\\b" packages/logix-test/src`、`rg "\\bScenario(Config|Builder)?\\b" packages/logix-test/src`、`rg "\\bTestRuntime\\b" packages/logix-test/src`、`rg "_op_layer\\b" packages/logix-test/src`（注意：其它包可能存在同名 UI 组件 `ScenarioBuilder`；`effect` 的 Layer 本身也有 `_op_layer` 内部标记，不在此验收范围）
- `@logixjs/test` 不包含自建 scope/boot/释放逻辑：必须通过 `Runtime.openProgram/runProgram`（或其内部实现）完成生命周期管理
- `specs/*`、runtime SSoT、examples 的旧口径同步更新（见 `tasks.md` Phase N）
- 迁移文档要求：`handoff.md` 必须包含关键迁移的 Before/After 代码对比（见 `tasks.md` 的 T042/T035）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime`：本特性落在 Runtime 这一环，补齐“脚本/CLI 运行入口”的缺口；同时通过提供 `$`（Bound API）把“在脚本里也能用 `$.use` 获取 ModuleHandle（含扩展）”这条链路补齐，避免业务侧自造 Host/Deferred 样板。
- Docs-first & SSoT：对外契约更新必须同步更新 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 与 `apps/docs/content/docs/api/core/runtime.md`；若需要新增术语/心智模型，优先更新 runtime glossary（runtime 侧 SSoT）。
- Effect/Logix contracts：新增的 program runner 是对现有 `Logix.Runtime.make(...)` 的组合入口，不改变 `ModuleRuntime/ModuleHandle/Root.resolve` 的语义；对齐 `@logixjs/test` 时如需推翻早期抽象，必须提供迁移说明与回归测试覆盖。
- IR & anchors：不引入新的 IR；尽量复用既有 Debug/RunSession 证据导出链路；失败信息应保持可序列化（错误分类/entrypoint 等）。
- Deterministic identity：runner 不生成新的随机/时间身份锚点；实例 identity 仍由 ModuleRuntime 机制提供并保持稳定可关联；错误载荷/诊断至少可关联 `moduleId + instanceId`。
- Transaction boundary：runner 只负责装配与执行入口，不能在事务窗口引入 IO/async，也不新增可写逃逸通道。
- Internal contracts & trial runs：若 runner 与 `@logixjs/test`/025 Trial Run 需要共享内部协作协议，应以显式契约（Runtime Services / helper）表达，避免散落 magic 字段与参数爆炸；并应支持按实例/会话隔离与可 Mock（Trial Run 不执行 `main`；`runId` 与 `instanceId` 分离）。
- Performance budget：新增入口本身不触及热路径，但仍需提供“启动耗时”基线，防止无意引入重逻辑（例如多次 build layer/重复启动）。
- Diagnosability & explainability：需要能区分“启动/装配失败 vs 主流程失败”，并提供退出策略相关提示字段；默认不产出新增诊断事件，失败路径错误载荷必须 Slim 且可序列化，必要时复用现有错误与 Debug 事件。
- User-facing mental model（≤5 关键词）：启动 / 退出 / 释放 / 显式条件 / 作用域。
- Breaking changes：核心入口是新增能力；若为对齐 `@logixjs/test` 需要调整旧 API，必须提供迁移说明（文档 + 示例/测试），不保留兼容层。
- Quality gates：`pnpm typecheck`、`pnpm lint`、`pnpm test`（以及 `packages/logix-core` / `packages/logix-test` 的最小回归用例）。

**Re-check (post Phase 1 design)**: PASS（2025-12-24）

## Project Structure

### Documentation (this feature)

```text
specs/024-root-runtime-runner/
├── spec.md
├── plan.md
├── integration-evaluation-with-025.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
├── perf.md
├── perf/
├── handoff.md           # Phase N output (T042)
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Runtime.ts                            # 顶层公开 API + 接线（尽量薄：make/runProgram/openProgram）
└── internal/runtime/runner/               # 024 主要实现落点（internal 为主，避免散落在顶层模块）
   ├── ProgramRunner.ts                   # runner 内核：boot/openProgram/runProgram/释放
   ├── ProgramRunner.context.ts           # 构造 ProgramRunContext（scope/runtime/module/$）
   ├── ProgramRunner.options.ts           # 归一化 options（closeScopeTimeout/args/handleSignals/exitCode/reportError）
   ├── ProgramRunner.errors.ts            # Boot/Main/DisposeTimeout 分类 + Slim 可序列化错误载荷
   ├── ProgramRunner.closeScope.ts        # closeScopeTimeout 的执行与超时可解释失败
   ├── ProgramRunner.signals.ts           # Node-only：SIGINT/SIGTERM → graceful shutdown（可移除监听器）
   └── ProgramRunner.exitCode.ts          # CLI mode：exitCode/reportError 策略（不强制 process.exit）

packages/logix-test/src/
├── index.ts                          # Public API exports（同步移除旧入口）
├── vitest.ts                         # Vitest 语法糖（itProgram/itProgramResult）对齐新入口
└── api/
   └── TestProgram.ts                 # 新测试入口：以 program module 为输入复用 core runner，叠加 trace/assert/TestClock（不保留 Scenario/TestRuntime 旧模型）

perf（证据跑道，统一入口：`pnpm perf`）
└── `pnpm perf bench:024:boot`            # 启动耗时基线脚本（manual vs new API），输出 JSON 证据到 specs/024-*/perf/

.codex/skills/project-guide/references/runtime-logix/
└── logix-core/
   └── api/
      └── 05-runtime-and-runner.md        # 补齐“program runner”对外契约与心智模型（并在 api/README.md 里链接）

apps/docs/content/docs/api/core/
└── runtime.md                            # 面向用户的 Runtime 文档补齐 program runner 用法与退出策略解释
```

**Structure Decision**: program runner 属于运行时公共装配/生命周期能力，落在 `@logixjs/core`；`@logixjs/test` 作为测试向工具，复用同一生命周期语义并在其上叠加观测与时钟能力。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
