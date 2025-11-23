# Form Engine Specification

> **Status**: Draft
> **Date**: 2025-11-21
> **Layer**: Domain Adapter

本文档定义了基于 Kernel 构建的下一代表单引擎。该引擎旨在结合 React Hook Form 的易用性 API 与 Effect-TS Kernel 的强大运行时能力，解决复杂表单场景下的性能、校验与联动难题。

## 1. 核心价值 (Value Proposition)

- **Kernel-Powered**: 继承 Kernel 的所有特性（因果追踪、时光机重放、并发控制）。
- **Headless & Performant**: 细粒度订阅 (`useField`)，零无效渲染。
- **Schema-First**: 深度集成 `@effect/schema`，类型安全与运行时校验合一。
- **Async-Ready**: 内置处理异步校验竞态、防抖与提交状态管理。

## 2. 架构分层 (Architecture Layers)

```mermaid
graph TD
    React[React Layer (Hooks)] -->|useForm/useField| Domain[Form Domain Layer]
    Domain -->|Preset Logic| Kernel[Kernel Runtime]
    Kernel -->|State/Event| React
```

- **Layer 0: Kernel**: 通用状态机 (State + Event + Logic)。
- **Layer 1: Form Domain**: 预置表单模型 (Values/Errors/Touched) 与 核心逻辑 (Validate/Submit)。
- **Layer 2: React Bindings**: 适配 React 生态的 Hooks 与组件。

## 3. 文档索引

- [01-domain-model.md](./01-domain-model.md): 定义表单的状态结构与事件协议。
- [02-logic-preset.md](./02-logic-preset.md): 预置的表单业务逻辑（校验、提交、重置）。
- [03-react-api.md](./03-react-api.md): 面向用户的 React Hooks API 设计。
