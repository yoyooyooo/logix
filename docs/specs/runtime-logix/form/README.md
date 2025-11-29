# Form Engine Specification

> **Status**: Draft
> **Date**: 2025-11-21
> **Layer**: Domain Adapter

本文档定义了基于 Logix 构建的下一代表单引擎。该引擎旨在结合 React Hook Form 的易用性 API 与 Effect-TS 的强大运行时能力，解决复杂表单场景下的性能、校验与联动难题。

## 1. 核心价值 (Value Proposition)

- **Logix-Powered**: 继承 Logix 的所有特性（因果追踪、时光机重放、并发控制）。
- **Headless & Performant**: 细粒度订阅 (`useField`)，零无效渲染。
- **Schema-First**: 深度集成 `@effect/schema`，类型安全与运行时校验合一。
- **Async-Ready**: 内置处理异步校验竞态、防抖与提交状态管理。

## 2. 架构分层 (Architecture Layers)

```mermaid
graph TD
    React[React Layer (Hooks)] -->|useForm/useField| Domain[Form Domain Layer]
    Domain -->|Preset Logic| Logix[Logix Engine Runtime]
    Logix -->|State/Event| React
```

- **Layer 0: Logix**: 通用状态机 (State + Event + Logic)。
- **Layer 1: Form Domain**: 预置表单模型 (Values/Errors/Touched) 与 核心逻辑 (Validate/Submit)。
- **Layer 2: React Bindings**: 适配 React 生态的 Hooks 与组件。

## 3. 文档索引

- [01-domain-model.md](./01-domain-model.md): 定义表单的状态结构与事件协议。
- [02-logic-preset.md](./02-logic-preset.md): 预置的表单业务逻辑（校验、提交、重置）。
- [03-react-api.md](./03-react-api.md): 面向用户的 React Hooks API 设计。

## 4. Form 与 AppRuntime 的关系

Form Store 本质上是一个标准的 Logix 领域模块实例，它可以根据业务需求选择生命周期与接入方式。

### 4.1 局部表单 (Local Form)

- **场景**：页面级表单、弹窗表单、行内编辑等随 UI 生命周期波动的场景；
- **生命周期**：随宿主组件销毁而销毁；
- **接入方式**：
  - 在组件中使用 `useLocalStore`（或 `useForm` 封装）基于对应的 Module/Live 创建本地实例；
  - 不需要注册进 `Logix.app` 的 `modules`，也不参与应用级拓扑分析。

```ts
function UserForm({ userId }: { userId: string }) {
  const formStore = useLocalStore(() => makeFormStore({ userId }), [userId]);
  // ...
}
```

### 4.2 全局表单 (Global Form)

- **场景**：全局搜索栏、跨步向导（Wizard）的状态保持、全局设置面板等需要跨页面/模块共享状态的表单；
- **生命周期**：随应用常驻，由 AppRuntime 管理；
- **接入方式**：
  - 使用对应的 Module.live 定义全局表单模块，例如 `GlobalSearchFormModule.live(initial, GlobalSearchLogic, ...)`；
  - 使用 `Logix.provide` 将该模块的 Live Layer 注册进 `Logix.app` 的 `modules`：
    - `modules: [Logix.provide(GlobalSearchFormTag, GlobalSearchFormLive), ...]`；
  - 在 `Logix.app` 的 `processes` 中，使用 L2 IntentRule（`$.use + $.on($Other.changes/...).then($SelfOrOther.dispatch)`）或普通 Logic Effect 编写该表单与其他模块的联动逻辑。

这样，Form 作为 Logix 的一个领域实例，可以在 **Local** 与 **Global** 两种模式下工作：
Local 模式贴合 UI 生命周期，Global 模式则参与应用级拓扑，并受 DevTools 与平台治理能力统一管理。
