# Logix Implementation Status Snapshot

> **Last Updated: 2025-12-01**
>
> 本文档作为 Logix 实施进度的单一事实源，替代旧版 TODO 清单。

## 1. 核心引擎 · @logixjs/core

**整体状态**: ✅ **Stable** (关键路径已打通，观测性已落地)

- [x] **ModuleRuntime**: 核心运行时，支持 State/Action/Logic/Lifecycle。
  - [x] `getState` / `setState` / `dispatch`
  - [x] `changes(selector)`
  - [x] `ref(selector)` (支持 Lens/Prism)
  - [x] 错误上报 (`lifecycle:error` -> DebugSink)
- [x] **Logic / Flow**: 业务逻辑编排 DSL。
  - [x] `BoundApi` (state, actions, flow, lifecycle)
  - [x] `FlowBuilder` (run, runLatest, runExhaust)
  - [x] Logic Middleware & EffectOp 总线（错误边界与追踪）
- [x] **Link / Orchestration**: 跨模块编排。
  - [x] `Logic.Link` (多模块输入，声明式连接)
  - [x] Runtime（通过 `Logix.Runtime.make` 构造；应用级 Layer/Scope 统一管理，进程 Fork）
- [x] **Observability**:
  - [x] `DebugSink` (支持 Console/Memory Sink)
  - [x] `Trace` (Action Dispatch, State Update, Lifecycle Error)
- [x] **Testing**:
  - [x] `ModuleRuntime.test.ts` (错误流验证)
  - [x] `Link.test.ts` (跨模块集成验证)
  - [x] `compliance/ModuleRuntime.test.ts` (基础合规性)

**Backlog**:
- [ ] **Performance**: 大规模 Action 吞吐下的性能优化。
- [ ] **Remote**: `RemoteStoreAdapter`（未收敛）。

## 2. 测试工具包 · @logixjs/test

**整体状态**: ✅ **Usable** (支持 TestClock / ExecutionResult，多模块场景已可覆盖日常用例)

- [x] `TestProgram.runProgram(programModule, body, options?)` / `runTest`（推荐入口，返回 `ExecutionResult`）
- [x] 测试入口对齐 program runner（复用 `@logixjs/core` 的 `Runtime.openProgram/runProgram` 生命周期内核）
- [x] **TestClock Integration**:
  - [x] 去除硬编码 `Effect.sleep`，通过 `TestClock.adjust` + `waitUntil` 控制时间推进。
  - [x] `assertState` / `assertSignal` 统一使用确定性等待 helper。
- [x] **ExecutionResult**:
  - [x] `runTest` / `TestProgram.runProgram` 返回完整执行 Trace (`ExecutionResult`)。
  - [ ] 基于 Trace 的高级断言工具 (e.g. `expect(result).toHaveAction('increment')`) 仍在设计中。
- [x] **Multi-Module Support**:
  - [x] 多模块协作通过 `programModule.implement({ imports: [...] })` 表达。
  - [x] Link / 长期流程通过 `programModule.implement({ processes: [...] })` 表达（不再依赖 `_op_layer` 分类）。
  - [x] service mock 通过 `options.layer` 注入（透传给 core Runtime），避免引入第二套装配语义。

## 3. React 适配层 · @logixjs/react & @logixjs/form

**整体状态**: ⚠️ **Partial** (基础 Hooks 可用，高级特性与表单引擎缺失)

- [x] **Core Hooks**:
  - [x] `useModule` (获取 Runtime)
  - [x] `useSelector` (订阅状态变化)
  - [x] `useDispatch` (派发 Action)
- [ ] **Advanced Features**:
  - [ ] **Suspense**: 支持异步 State 读取挂起。
  - [ ] **Concurrent Mode**: 验证 React 18+ 并发渲染兼容性。
  - [x] **Scope Isolation**: 多 `RuntimeProvider` 嵌套场景验证（含 `runtime` 覆盖与 `layer` Env 叠加/覆盖），实现细节见 `.codex/skills/project-guide/references/runtime-logix/logix-react/README.md` 与 `@logixjs/react` hooks 测试。
- [ ] **Form Engine (@logixjs/form)**: **CRITICAL MISSING**
  - [ ] `FormShape` 定义 (Values + UI State)。
  - [ ] `FormModule` 工厂。
  - [ ] `useForm` / `useField` Hooks。
  - [ ] 内置验证逻辑 (`validate`, `dirty`, `touched`)。

## 4. Builder / 工具链 · @logixjs/builder

**整体状态**: 🛑 **Not Started**

- [ ] **AST Parsing**: 解析 Intent DSL / Flow 图。
- [ ] **Code Generation**: 从 Spec 生成代码。
- [ ] **Visual Editor**: 集成 ReactFlow / Tldraw (Spec Studio)。

## 优先级建议 (Next Steps)

1.  **@logixjs/test 升级**: 引入 `TestClock` 和 `ExecutionResult`，消除测试中的不确定性 (Flakiness)，为后续复杂场景测试打底。
2.  **React 高级特性验证**: 补充 Suspense/Concurrent 测试，确保 UI 层健壮。
3.  **Form 引擎启动**: 实现 `@logixjs/form`，这是 ToB 业务最核心的场景。
