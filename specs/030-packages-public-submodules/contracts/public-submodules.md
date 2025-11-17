# Contract: Public Submodules（packages/* 对外概念裁决清单）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-24  
**Spec**: `specs/030-packages-public-submodules/spec.md`

## 1) 目的

本文件定义 `packages/*` 的对外概念（Public Submodules）与允许的子路径入口（Independent Entry Points）的裁决清单，用于：

- 给仓库维护者/贡献者一个稳定的“概念地图”（哪个包对外暴露什么）。
- 作为实现阶段的唯一裁决基线：目录结构、`package.json#exports`、示例/文档 import 形态必须与此一致。
- 明确 internal 边界，避免实现细节成为事实 public API。
- 并行开发协作与抽包策略见：
  - `contracts/collaboration-protocol.md`
  - `contracts/promotion-to-package.md`
- internal 目录分区与收敛目标见：
  - `contracts/internal-structure.md`

## 2) 通用规则（适用于所有 packages/*）

### 2.1 Public Submodule 结构

- `src/index.ts`（或 `src/index.tsx`）是对外 barrel（聚合导出）。
- `src/` 根目录（除 `index.ts(x)`、`global.d.ts` 等白名单文件外）只允许放置 Public Submodule 入口文件：
  - 文件名为 PascalCase（与核心概念同名/同前缀）。
  - 文件内容必须承担对外概念职责（允许薄封装；禁止纯 re-export 作为长期形态）。
- 所有非概念实现必须下沉到 `src/internal/**`（可自由重构）。
- 若存在 Independent Entry Point（例如 `@logix/form/react`），允许出现对应的子入口目录（例如 `src/react/index.ts`），但必须满足：
  - 该入口已在本文件中登记（见各包的 Independent Entry Points 与 2.5 Exception Registry）；
  - 该目录仅承载该入口的对外聚合（其余实现仍应下沉到 `src/internal/**` 或该入口自有 internal）。

### 2.2 子路径入口（subpath exports）的准入条件

- 仅当该入口代表一个稳定概念且具备独立价值时才允许存在（例如 React hooks 入口、Vite 插件入口）。
- 禁止保留“空壳/占位入口”（无稳定契约、无可用能力、仅为了未来可能性）。
- 必须在本文件中登记：入口目的、包含内容、与主入口（`.`）的关系。

### 2.3 Exports 边界

- `package.json#exports` 必须屏蔽 internal（例如 `./internal/*: null` 或等价策略）。
- exports 策略以 `contracts/exports-policy.md` 为准：
  - 默认推荐对标 effect：允许 `./* -> ./src/*.ts(x)`，但必须满足“`src/` 根目录治理不变量 + 回归门”；
  - 少数特殊包可使用显式 exports 列表，但必须登记原因与退出计划。

### 2.4 对标 effect 的关键借鉴点（结构 / 命名 / Tag）

> 本节不要求逐字复刻 effect，但要求在“可解释 + 可验证 + 可维护”层面达到同等质量。

- **概念 = 模块文件**：Public Submodule 对应 `src/<Concept>.ts(x)`（PascalCase），`src/index.ts(x)` 只做 barrel 聚合。
- **internal 下沉**：实现细节全部在 `src/internal/**`；不允许把 `src/internal/**` 当作“高级用户入口”。
- **exports 防泄漏**：通配导出是否安全，取决于 `src/` 根目录是否只放概念模块（effect 的核心经验）。
- **Tag 作为 value + 命名空间**：对外 Service/Contract 优先以 `class X extends Context.Tag(...)` 承载 value-level Tag，并通过同名 namespace/type 合并承载类型与构造器（参考 `@effect/platform`）。
- **命名空间导出（可选但推荐）**：对 core/domain/infra 包，优先 `export * as Runtime from "./Runtime.js"` 形态，形成稳定的“概念地图”与 import 心智模型（参考 `effect/src/index.ts`）。

### 2.5 Exception Registry（例外登记）

| Exception | Scope | Reason | Expiry | Mitigation |
|----------|-------|--------|--------|------------|
| `@logix/core/InternalContracts` | package | 仓库内协作契约需要统一入口，便于替代散落的 `runtime.__*` 魔法字段 | null | 标注为 repo-only/experimental；禁止在业务文档中作为推荐入口；必要时通过 gate 扫描阻止业务包依赖 |
| `@logix/core/Reflection` | package | 平台/CI/Agent 需要 IR/试跑入口，但稳定性与依赖面需受控 | null | 标注为 experimental；限制依赖面（仅工具链/CI）；对外 import 形态在清单中显式裁决 |
| `@logix/form/react` / `@logix/sandbox/vite` | repo | 生态惯例（React/Vite）倾向使用 lower-case 子路径；同时现有文档/示例大量使用 | null | 视为 Independent Entry Points（独立契约），必须非空壳、必须登记边界；长期可选迁移到独立包形态 |
| `global.d.ts` | repo | TS 声明文件需要在包内可见，且不应被当作概念入口 | null | root 白名单；verify gate 允许但不计入 Public Submodule |

## 3) 包级裁决（对外概念清单）

> 本清单描述“概念与入口”，不枚举实现目录与内部文件结构（实现细节属于 internal，可自由演进）。

### `@logix/core`（core / runtime）

**Core Chain（核心链路摘要）**：

- Module DSL：`Module.make(...)` 定义 state/actions → `implement(...)` 生成可运行模块。
- Runtime 执行：`Runtime.make(...)` 装配模块与服务（Tag/Layer），提供 run/session 能力。
- 事务与一致性：State 更新必须遵守事务窗口边界（事务内禁止 IO），对外可见性通过 `SubscriptionRef`/快照传播。
- 跨模块访问：`Bound/Link` 提供受控的跨模块读取/派发与依赖声明，避免隐式全局解析。
- 观测与证据：`Debug/Observability` 提供可序列化诊断事件与回放证据（稳定 id 串联因果链）。

**Public Surface（现状可 import 的入口）**：

- 主入口（barrel）：`@logix/core`
  - 推荐形态：`import * as Logix from "@logix/core"`（命名空间聚合）
  - 说明：barrel 上允许挂载少量“工具链/仓库协作”能力（例如 `Reflection`、`InternalContracts`），但必须在下方明确标注稳定性与使用边界。
- 子模块入口（subpath exports；来自 `packages/logix-core/package.json#exports`）：
  - `Actions` / `Bound` / `Debug` / `EffectOp` / `Env`
  - `Flow` / `Link` / `Logic` / `MatchBuilder`
  - `Middleware`
  - `Module` / `ModuleTag` / `Observability` / `Platform` / `Resource`
  - `Root` / `Runtime` / `State` / `StateTrait` / `TraitLifecycle`

**用户视角分层（推荐依赖面）**：

- 应用/业务作者（最常用的“写业务/接入 runtime”集合）：
  - `Module` / `State` / `Actions` / `Logic` / `Flow` / `Runtime`
  - `Bound` / `Link`（跨模块访问与依赖声明）
  - `MatchBuilder`（业务匹配/分支 DSL，若只用 Flow 的高层语法糖可不直接依赖）
- 领域/框架扩展作者（写 `packages/logix-form|logix-query|i18n|domain` 等）：
  - `ModuleTag`（ModuleTag/ModuleRuntime 等核心类型与工厂）
  - `StateTrait` / `TraitLifecycle` / `Resource`（traits/资源/生命周期下沉）
  - `EffectOp` / `Middleware`（受控的跨域接管点；默认业务侧不直接依赖）
  - `Platform` / `Env` / `Root`（平台接线与 root 解析；偏集成侧能力）
- 平台/工具链（Devtools/Sandbox/CI/Agent）：
  - `Debug` / `Observability`（观测协议与调试接入）
  - `Reflection`（IR/试跑/导出能力；建议标注为 experimental）
- 仓库内协作（repo-only，禁止业务侧依赖）：
  - `InternalContracts`（替代散落的 `runtime.__*` 魔法字段；对外标注为 repo-only/experimental）

**内部实现核心概念（不作为 public submodule；仅维护者关心）**：

- `packages/logix-core/src/internal/runtime/core/*`（运行时内核：`FlowRuntime` / `Lifecycle` / `RuntimeKernel` / `StateTransaction` / `DevtoolsHub` / `LogicDiagnostics` / `RootContext` / `TaskRunner` 等）
- `packages/logix-core/src/internal/runtime/*`、`packages/logix-core/src/internal/observability/*`（协议接线与实现细节）
- 原则：只有当某个 internal 概念需要成为“稳定契约”时，才提升为 Public Submodule；否则永远保持 internal，可自由重构。

**Notes**:

- 推荐 import：
  - `import * as Logix from "@logix/core"`（主推荐，命名空间式）
  - `import * as Runtime from "@logix/core/Runtime"`（子模块直导入，适合按概念拆分依赖）
- `Foo/Bar` 等“子域”命名：优先收敛为概念级单入口（避免层级目录成为事实 API）；若保留子域入口，必须在 exports-policy 与回归门中显式允许并记录理由。
- `Reflection` / `InternalContracts` 当前是 barrel 级概念但尚未提供 `@logix/core/<Concept>` 直导入口；后续需要裁决：补齐 exports key，或明确保持为 root-only（并在 gate 中限制依赖面）。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-core/src/index.ts` | `.` |
| Actions | `packages/logix-core/src/Actions.ts` | `./Actions` |
| Bound | `packages/logix-core/src/Bound.ts` | `./Bound` |
| Debug | `packages/logix-core/src/Debug.ts` | `./Debug` |
| EffectOp | `packages/logix-core/src/EffectOp.ts` | `./EffectOp` |
| Env | `packages/logix-core/src/Env.ts` | `./Env` |
| Flow | `packages/logix-core/src/Flow.ts` | `./Flow` |
| Link | `packages/logix-core/src/Link.ts` | `./Link` |
| Logic | `packages/logix-core/src/Logic.ts` | `./Logic` |
| MatchBuilder | `packages/logix-core/src/MatchBuilder.ts` | `./MatchBuilder` |
| Middleware | `packages/logix-core/src/Middleware.ts` | `./Middleware` |
| Module | `packages/logix-core/src/Module.ts` | `./Module` |
| ModuleTag | `packages/logix-core/src/ModuleTag.ts` | `./ModuleTag` |
| Observability | `packages/logix-core/src/Observability.ts` | `./Observability` |
| Platform | `packages/logix-core/src/Platform.ts` | `./Platform` |
| Resource | `packages/logix-core/src/Resource.ts` | `./Resource` |
| Root | `packages/logix-core/src/Root.ts` | `./Root` |
| Runtime | `packages/logix-core/src/Runtime.ts` | `./Runtime` |
| State | `packages/logix-core/src/State.ts` | `./State` |
| StateTrait | `packages/logix-core/src/StateTrait.ts` | `./StateTrait` |
| TraitLifecycle | `packages/logix-core/src/TraitLifecycle.ts` | `./TraitLifecycle` |

**Root-only (barrel namespace) Concepts（不提供 subpath export）**：

| Concept | Import Shape | Status |
|--------|--------------|--------|
| Reflection | `import * as Logix from "@logix/core"; Logix.Reflection` | experimental / repo-only |
| InternalContracts | `import * as Logix from "@logix/core"; Logix.InternalContracts` | experimental / repo-only |

### `@logix/react`（adapter / React）

**Core Chain（核心链路摘要）**：

- 适配目标：把 `@logix/core` 的 runtime/module 订阅投影到 React（hooks/组件）。
- RuntimeProvider：以 Provider 方式注入 runtime，并统一管理订阅/派发边界。
- Hooks：提供 `useRuntime/useModule/useSelector/useDispatch/...` 的最小集合，避免暴露实现细节。

**Public Submodules（最小集合）**：

- `RuntimeProvider`（组件入口）
- `Hooks`（聚合：`useRuntime` / `useModule` / `useSelector` / `useDispatch` / `useImportedModule` 等）
- `Platform`（React 宿主平台能力）
- `ReactPlatform`（可选：保留为语法糖聚合入口；如保留，必须说明其稳定性与与 Platform 的关系）

**Forbidden (internal-only)**:

- React Context、缓存、ref 等实现细节不得成为对外入口（仅允许通过 `Hooks/RuntimeProvider` 暴露必要能力）。

**推荐 import**：

- React 业务侧：优先从 `@logix/react` 取组件/Hook（避免 deep import 实现目录）。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-react/src/index.ts` | `.` |
| RuntimeProvider | `packages/logix-react/src/RuntimeProvider.ts` | `./RuntimeProvider`（via `./*`） |
| Hooks | `packages/logix-react/src/Hooks.ts` | `./Hooks`（via `./*`） |
| Platform | `packages/logix-react/src/Platform.ts` | `./Platform`（via `./*`） |
| ReactPlatform | `packages/logix-react/src/ReactPlatform.ts` | `./ReactPlatform`（via `./*`） |

### `@logix/devtools-react`（tooling / Devtools UI）

**Core Chain（核心链路摘要）**：

- UI：渲染 runtime 的诊断/证据（快照、图、时间线）并提供交互入口。
- 集成：通过 `DevtoolsLayer`/label 等最小 API 与 `@logix/core` 的 Debug/Observability 对接。
- 视图组件：`StateTraitGraphView` 等独立视图以 Public Submodule 形式对外暴露，避免实现目录成为事实 API。

**Public Submodules（建议）**：

- `LogixDevtools`（主 UI 入口）
- `DevtoolsLayer`（与 runtime 集成相关的最小 API：layer/label 等）
- `StateTraitGraphView`（可选：独立图组件）

**Forbidden (internal-only)**:

- `ui/**`、`state/**`、hooks 等实现目录不得成为推荐 import 入口。

**推荐 import**：

- UI 集成：从 `@logix/devtools-react` 取 `LogixDevtools` 等概念入口（不依赖 `ui/**`）。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-devtools-react/src/index.tsx` | `.` |
| LogixDevtools | `packages/logix-devtools-react/src/LogixDevtools.tsx` | `./LogixDevtools`（via `./*` or explicit） |
| DevtoolsLayer | `packages/logix-devtools-react/src/DevtoolsLayer.tsx` | `./DevtoolsLayer`（via `./*` or explicit） |
| StateTraitGraphView | `packages/logix-devtools-react/src/StateTraitGraphView.tsx` | `./StateTraitGraphView`（via `./*` or explicit） |

### `@logix/sandbox`（infra / Alignment Lab）

**Core Chain（核心链路摘要）**：

- Worker 沙盒：在浏览器 Worker 内编译/运行 Logix/Effect 程序，隔离宿主与用户代码。
- 协议与类型：`Protocol/Types` 定义 command/event 与可序列化 Trace/Evidence 结构。
- Client/Service：以 Tag/Layer 方式对外提供 `SandboxClient` 与集成入口。
- Vite 插件：`@logix/sandbox/vite` 提供 kernel/wasm 静态资源挂载，形成可复现开发链路。

**Public Submodules（建议）**：

- `Client`（`SandboxClient` / `createSandboxClient`）
- `Service`（Effect Tag/Layer：`SandboxClientTag` / `SandboxClientLayer`）
- `Protocol`（command/event 协议 + type guards）
- `Types`（Log/Trace/RunResult/MockManifest/UiIntent 等数据结构）
- `Vite`（`logixSandboxKernelPlugin`）

**Forbidden (internal-only)**:

- compiler、worker 等编译/运行细节必须 internal。

**推荐 import**：

- 业务/工具：从 `@logix/sandbox` 取 Client/Protocol/Types；Vite 项目从 `@logix/sandbox/vite` 取插件入口。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-sandbox/src/index.ts` | `.` |
| Client | `packages/logix-sandbox/src/Client.ts` | `./Client` |
| Service | `packages/logix-sandbox/src/Service.ts` | `./Service` |
| Protocol | `packages/logix-sandbox/src/Protocol.ts` | `./Protocol` |
| Types | `packages/logix-sandbox/src/Types.ts` | `./Types` |
| Vite | `packages/logix-sandbox/src/Vite.ts` | `./Vite` |

**Independent Entry Points（subpath exports）**：

| Import Path | Export Key | Target | Status |
|------------|------------|--------|--------|
| `@logix/sandbox/vite` | `./vite` | `packages/logix-sandbox/src/Vite.ts` | allowed |

### `@logix/test`（infra / test kit）

**Core Chain（核心链路摘要）**：

- 测试即 Effect：为 runtime/module/flow 提供可组合的测试 Program 与断言工具。
- 执行结果：提供统一的 `ExecutionResult`/report 形态，便于在 CI 与本地解释。
- 与 Vitest 集成：提供最小 glue（避免把 runner 逻辑散落到每个用例）。

**Public Submodules（建议）**：

- `TestRuntime`
- `TestProgram`
- `Execution`
- `Assertions`
- `Vitest`（`itScenario` 等）

**推荐 import**：

- 测试用例：从 `@logix/test` 取 `TestProgram/Assertions/Execution` 等概念入口（避免 deep import `api/**`/`runtime/**`）。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-test/src/index.ts` | `.` |
| TestRuntime | `packages/logix-test/src/TestRuntime.ts` | `./TestRuntime`（via `./*` or explicit） |
| TestProgram | `packages/logix-test/src/TestProgram.ts` | `./TestProgram`（via `./*` or explicit） |
| Execution | `packages/logix-test/src/Execution.ts` | `./Execution`（via `./*` or explicit） |
| Assertions | `packages/logix-test/src/Assertions.ts` | `./Assertions`（via `./*` or explicit） |
| Vitest | `packages/logix-test/src/Vitest.ts` | `./Vitest`（via `./*` or explicit） |

### `@logix/form`（domain / Form）

**Core Chain（核心链路摘要）**：

- 领域目标：在不改变 core IR/事务语义的前提下，提供表单领域的概念 DSL 与 Trait 下沉接口。
- Form 入口：`Form.make`/controller 等概念入口，驱动状态、校验、派发与订阅投影。
- Rule/Trait/Path：以概念模块承载规则、字段能力（Trait）、路径与错误模型。
- React 入口：`@logix/form/react` 仅做“订阅投影 + DOM 事件适配”的薄层（底层仍是 `@logix/react`）。

**Public Submodules（建议，与 runtime-logix 约定一致）**：

- `Form`（`make` / controller 等领域入口）
- `Rule` / `Error` / `Trait` / `Path`
- `SchemaPathMapping` / `SchemaErrorMapping`
- `FormView`（如确认其作为稳定概念；否则应 internal 并避免出现在对外类型签名中）

**Independent Entry Points**:

- `@logix/form/react`：React hooks 入口（必须是稳定可用能力，不得空壳）

**推荐 import**：

- 领域写法：`import * as Form from "@logix/form"`（概念命名空间）
- React 投影：`import { useForm, useField } from "@logix/form/react"`

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-form/src/index.ts` | `.` |
| Form | `packages/logix-form/src/Form.ts` | `./Form`（via `./*`） |
| Rule | `packages/logix-form/src/Rule.ts` | `./Rule`（via `./*`） |
| Error | `packages/logix-form/src/Error.ts` | `./Error`（via `./*`） |
| Trait | `packages/logix-form/src/Trait.ts` | `./Trait`（via `./*`） |
| Path | `packages/logix-form/src/Path.ts` | `./Path`（via `./*`） |
| FormView | `packages/logix-form/src/FormView.ts` | `./FormView`（via `./*`） |
| SchemaPathMapping | `packages/logix-form/src/SchemaPathMapping.ts` | `./SchemaPathMapping`（via `./*`） |
| SchemaErrorMapping | `packages/logix-form/src/SchemaErrorMapping.ts` | `./SchemaErrorMapping`（via `./*`） |

**Independent Entry Points（subpath exports）**：

| Import Path | Export Key | Target | Status |
|------------|------------|--------|--------|
| `@logix/form/react` | `./react` | `packages/logix-form/src/react/index.ts` | allowed |

### `@logix/query`（domain / Query）

**Core Chain（核心链路摘要）**：

- 领域目标：把“查询/缓存/失效”能力收敛为可注入 Engine（Tag/Layer）与 Traits 规则。
- Engine：定义最小查询执行契约（含 invalidate），并提供 layer 装配入口。
- Middleware：在 `EffectOp`/runtime 边界注入查询相关的拦截与证据采集（若需要）。
- TanStack：作为集成子域对外暴露观察/桥接入口（必须以概念模块封装实现目录）。

**Public Submodules（建议）**：

- `Query`（`make` / blueprint）
- `Traits`（降解到 StateTrait 的规则入口）
- `Engine`（Tag + Layer）
- `Middleware`（EffectOp 接管点）
- `TanStack`（engine/observe 等集成入口）

**Independent Entry Points**:

- `@logix/query/react`：当前若无稳定能力则禁止保留空壳入口；如需要 React 集成，必须定义明确的对外概念与契约后再开放。

**推荐 import**：

- 领域写法：`import * as Query from "@logix/query"`（概念命名空间）

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/logix-query/src/index.ts` | `.` |
| Query | `packages/logix-query/src/Query.ts` | `./Query`（via `./*`） |
| Engine | `packages/logix-query/src/Engine.ts` | `./Engine`（via `./*`） |
| Traits | `packages/logix-query/src/Traits.ts` | `./Traits`（via `./*`） |
| Middleware | `packages/logix-query/src/Middleware.ts` | `./Middleware`（via `./*`） |
| TanStack | `packages/logix-query/src/TanStack.ts` | `./TanStack`（via `./*`） |

**Independent Entry Points（subpath exports）**：

| Import Path | Export Key | Status | Note |
|------------|------------|--------|------|
| `@logix/query/react` | `./react` | forbidden | 空壳入口必须移除；如未来需要 React 集成，先定义稳定契约再开放 |

### `@logix/i18n`（domain / I18n）

**Core Chain（核心链路摘要）**：

- Driver 适配：把外部 i18n driver 封装为可注入 service（Tag + Layer）。
- 可订阅状态：以 `SubscriptionRef` 发布 snapshot（language/init/seq），保持可解释且低成本。
- Module 形态：提供 `I18nModule` 让业务模块以统一 action/订阅方式集成。

**Public Submodules（建议）**：

- `I18n`（Tag + layer + service API）
- `I18nModule`（订阅 snapshot、提供 action 语法糖的模块形态）
- `Token`（可选：若希望把 token 预算/规范作为独立概念凸显）

**推荐 import**：

- 业务侧：从 `@logix/i18n` 取 `I18n/I18nModule` 等概念入口（避免在业务侧直接依赖 driver 细节）。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/i18n/src/index.ts` | `.` |
| I18n | `packages/i18n/src/I18n.ts` | `./I18n`（via `./*`） |
| I18nModule | `packages/i18n/src/I18nModule.ts` | `./I18nModule`（via `./*`） |
| Token | `packages/i18n/src/Token.ts` | `./Token`（via `./*`） |

### `@logix/domain`（domain / module factory）

**Core Chain（核心链路摘要）**：

- 目标：为常见业务形态提供“领域模块工厂”（例如 CRUD），复用 core 的 Module/State/Actions/Logic 组合。
- Crud：以 Schema 约束实体/查询输入，提供 controller 语义（list/save/remove）并产出可运行模块。
- 约束：对外只暴露稳定领域概念（如 `Crud`），其余实现细节下沉 internal，避免把 helper/impl 固化成 API。

**Public Submodules（建议）**：

- `Crud`（CrudSpec/CrudApi/CrudModule/CrudController 与 CRUDModule 工厂入口）

**推荐 import**：

- 领域模块：`import * as Domain from "@logix/domain"` 或按概念拆分 `@logix/domain/Crud`（视 exports 策略落地而定）。

**Target Public Submodule Map（文件 ↔ export key）**：

| Concept | Source File | Export Key |
|--------|-------------|-----------|
| (root barrel) | `packages/domain/src/index.ts` | `.` |
| Crud | `packages/domain/src/Crud.ts` | `./Crud`（via `./*`） |
