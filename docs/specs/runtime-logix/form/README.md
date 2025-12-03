# Form Engine Specification

> **Status**: Draft (to be aligned with current logix-core)
> **Layer**: Form Core Adapter (Thin Wrapper)

本文档在 v3 logix-core 能力之上，收紧表单引擎的定位：**Form 不是另一套引擎，而是围绕 Logix.Module 的轻量状态封装 + React 绑定**。

## 1. 设计立场

- **Logix 优先**：状态管理、异步流程、Schema/Effect 能力全部由 `logix-core` 提供，Form 层不再自建并行的 DSL 或运行时。
- **薄核心层**：Form Core 只做两件事：
  - 约定一份通用的表单状态形状（Dual-Store：`values` + `ui`）；
  - 提供少量可选的 Logic 预置（脏检查、校验策略、数组操作），在当前 PoC 中基于 `Logix.Module` + `Module.logic(($)=>...)` + `Flow` 实现。
- **React 专注 DOM**：React 适配层只关心 DOM/Foucs 等前端细节（`onFocus`/`onBlur`、事件对象适配、细粒度订阅），不干预逻辑与状态模型。

换句话说：**Form = Logix.Module<FormShape> +（可选）FormLogicPresets + React Hooks**。

## 2. 架构分层 (Architecture Layers)

```mermaid
graph TD
    React[React Layer (Hooks)] -->|useForm/useField| FormCore[Form Core (Shape + Presets)]
    FormCore -->|Module.live + Module.logic(($)=>...)| Logix[logix-core Runtime]
    Logix -->|State/Action/Flow| React
```

- **Layer 0: logix-core**：通用状态机（ModuleShape / ModuleRuntime / Logic / Flow）。
- **Layer 1: Form Core**：标准化 FormShape（`FormState<T>`/`FormAction`）与一组推荐 Logic Preset（可选）。
- **Layer 2: React Bindings**：`useForm` / `useField` / `useFieldArray` 等 Hooks，将 FormShape 投影为组件友好的 props。

## 3. 文档索引

- [01-domain-model.md](./01-domain-model.md): 定义表单的状态形状（FormShape）与 Action 协议，严格对齐 `_tag`/`payload` 约定。
- [02-logic-preset.md](./02-logic-preset.md): 在 Bound API `$`（由 `Module.logic(($)=>...)` 注入） + `Flow` 上实现的一组轻量预置逻辑（可选挂载）。
- [03-react-api.md](./03-react-api.md): 基于 ModuleRuntime 的 React Hooks API 设计，专注订阅与 DOM 事件适配。
 - [04-real-world-poc.md](./04-real-world-poc.md): 模拟真实 B2B 管理后台的 PoC 项目骨架，只写类型与 demo，不含具体实现。

## 4. 生命周期与 AppRuntime 关系（收紧版）

Form 只在「是否注册为 AppRuntime 模块」这一个维度和其他模块区分：

- **局部表单 (Local Form)**：在组件内通过 `ModuleRuntime.make` 或 `FormModule.live` + React Hook 创建，生命周期随组件；不强制接入 AppRuntime。
- **全局表单 (Global Form)**：将 `FormModule.live(...)` 作为 Layer 注册进 AppRuntime，与其他领域模块一视同仁；所有跨模块协作仍通过 `Link.make` / Logic 实现。

本规范后续的所有示例，都视 Form 为「普通 Logix 模块的一个专用 Shape」，不再引入额外的 Engine/Runtime 概念。
