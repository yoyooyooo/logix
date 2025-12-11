# runtime-logix 规范落地 TODO 清单

> **Review Report (2025-11-30)**
>
> 经过对 `packages/logix-core`, `packages/logix-react`, `packages/logix-test` 及 `packages/form` 的代码审查，当前实施状态如下：
> - **Core**: 基础架构 (`ModuleRuntime`, `DebugSink`) 已就位，但高级特性 (`ref(selector)`, Compliance Test) 缺失。
> - **React**: 基础 Hooks (`useModule`, `useSelector`) 已实现。
> - **Form**: **完全缺失** (`packages/form/src` 为空)，这是当前最大的功能缺口。
> - **Test**: 原型可用 (`Scenario`, `TestRuntime`)，但缺乏 `TestClock` 集成与多模块支持，存在硬编码 `sleep`。
> - **Builder**: 尚未启动。

## 1. 核心引擎 · @logix/core

### 1.5 `ModuleRuntime.ref(selector)` 与 `BoundApi.state.ref`

- **当前状态**:
  - `ModuleRuntime.ts` 中仅实现了 `ref: () => stateRef`，返回完整 State 的 SubscriptionRef。
  - `changes(selector)` 已实现。
- **TODO**:
  - [ ] 实现 `ref(selector)`：返回一个只读或可写的 `SubscriptionRef` 视图（需处理 Lens/Prism 逻辑）。
  - [ ] 在 `BoundApi` 中暴露此能力。

### 1.7 Debug / Inspector 能力

- **当前状态**:
  - `DebugSink.ts` 已实现，支持 `module:init`, `state:update`, `action:dispatch` 等事件记录。
- **TODO**:
  - [ ] **Test 集成**: 让 `runTest` 收集这些 trace 并返回 `ExecutionResult`。
  - [ ] **DevTools**: 开发基于 Chrome Extension 或独立 UI 的 Inspector。

### 1.8 ModuleRuntime 合规测试套件

- **当前状态**: **缺失**。
- **TODO**:
  - [ ] 创建 `@logix/core/test/compliance`。
  - [ ] 编写标准测试用例，覆盖 `getState`, `setState`, `dispatch` 及其时序约束。
  - [ ] 验证 `RemoteStoreAdapter` 等 PoC。

## 2. React 适配层 · @logix/react & @logix/form

### 3.1 Form 核心模型 (FormShape)

- **当前状态**: **CRITICAL MISSING** (`packages/form` 为空)。
- **TODO**:
  - [ ] 实现 `FormState<T>` (values + ui)。
  - [ ] 定义 `FormAction` 协议。
  - [ ] 实现 `FormModule` 工厂。

### 3.2 Form Logic Presets

- **当前状态**: **MISSING**。
- **TODO**:
  - [ ] 实现 `dirty`, `touched`, `validate` 等预置逻辑。
  - [ ] 封装 `FormPreset.make`。

### 3.3 React Hooks (Form)

- **当前状态**: **MISSING**。
- **TODO**:
  - [ ] 实现 `useForm`, `useField`, `useFieldArray`。
  - [ ] 确保基于 `@logix/react` 的 `useModule` 构建。

## 4. 测试工具包 · @logix/test

### 4.1 测试入口重构（TestProgram）

- **当前状态**:
  - `@logix/test` 已提供 `TestProgram.make` 作为推荐入口，支持单模块与多模块 / Link 场景。
  - `runTest` 用于在 `TestContext` 下执行任意 `Effect`；配合 `TestProgram.run` 时，返回值为 `ExecutionResult`（包含 Trace）。
  - 旧版 `defineTest` / `Scenario` 已从公共 API 中移除，仅保留内部实现片段。
  - `Execution` 已补充一批基于 Trace 的断言 helper（如 `expectActionSequence` / `expectNoActionTag`），可用于编排更可读的集成测试断言。
- **TODO**:
  - [ ] 在现有 `Execution.*` helper 基础上，进一步整理基于 Trace 的声明式断言 DSL（例如 `Trace.expectAction`、`Trace.expectNoError`），并在 apps/docs 中提供示例。
  - [ ] 为平台 / AI 场景定义 ExecutionDump 结构（包含 Trace + 上下文快照）。


## 5. Builder / 工具链 · @logix/builder

- **当前状态**: **尚未创建**。
- **TODO**:
  - [ ] 初始化包结构。
  - [ ] 实现基础 AST 解析与 Flow 图构建。
