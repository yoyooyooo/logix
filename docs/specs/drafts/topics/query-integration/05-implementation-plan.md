---
title: "Logix Query 集成：实施计划"
status: draft
version: 1.0
layer: Implementation
related:
  - 01-unified-api-design.md
---

# Logix Query 集成实施计划

基于 [统一 API 设计](./01-unified-api-design.md) 以及对当前 `runtime-logix` 代码库的分析，本文档概述了实现 TanStack Query 集成的具体步骤。

## 1. 第一阶段：基础建设 (Layer 3 - 手动集成)

**目标**：在不修改 Core 的前提下，立即启用 "手动集成" 能力。

### 1.1 `QueryClientTag` & `QueryClientLayer`
- **位置**: `packages/logix-query/src/QueryClient.ts` (新包)
- **实现**:
  - 定义 `QueryClientTag`。
  - 提供 `makeQueryClientLayer` 辅助函数。

### 1.2 `rqLogic` 工厂 (Layer 2 - 显式 Logic)
- **位置**: `packages/logix-query/src/logic.ts`
- **实现**:
  - 创建 `createQueryLogic` (或 `rqLogic`) 工厂函数。
  - 接收参数:
    - `module`: 模块实例。
    - `config`: `{ queryKey, queryFn, mapData, mapError, ... }`。
  - 返回一个 `ModuleLogic`。
  - **内部逻辑**:
    - 使用 `$.lifecycle.onInit` 创建 `QueryObserver`。
    - 使用 `Stream.async` 将 Observer 事件桥接到 Effect Stream。
    - 使用 `$.flow` 根据 Stream 事件更新 State。

### 1.3 `rqLink` 工厂
- **位置**: `packages/logix-query/src/link.ts`
- **实现**:
  - 与 `rqLogic` 类似，但返回用于跨模块场景的 `Link` effect。

## 2. 第二阶段：Core 支持 Schema 扫描 (Layer 1 准备)

**目标**：使 `Module.live` 能够检测并处理 Schema 注解。

### 2.1 Query 的 `Schema.annotations`
- **位置**: `packages/logix-core/src/api/SchemaExtensions.ts` (或类似位置)
- **实现**:
  - 定义一个 Symbol `QueryFieldSymbol`。
  - 创建 `Query.field` 辅助函数，返回带有此注解的 Schema。
  - 注解中应携带 `QueryConfig` (queryKey, queryFn 等)。

### 2.2 更新 `ModuleFactory`
- **位置**: `packages/logix-core/src/runtime/ModuleFactory.ts`
- **变更**:
  - 在 `Module.live` (及 `make`) 中:
    1. 遍历 `shape.stateSchema` 字段。
    2. 检查 `QueryFieldSymbol`。
    3. 如果发现，使用注解中的配置生成隐式的 `ModuleLogic`。
    4. 将此 logic 预置到传递给 `ModuleRuntime.make` 的 `logics` 数组中。

## 3. 第三阶段：Layer 1 实现 (声明式 Query Field)

**目标**：完整的 "零配置" 体验。

### 3.1 递归类型推导
- **挑战**: `queryKey: (state) => ...` 需要 `State` 类型，但 `State` 正在定义中。
- **方案**:
  - **选项 A (两步法)**: 先定义 DTO，再扩展 Query。(v1 推荐)
  - **选项 B (ThisType)**: 在 `Query.field` 中使用 `ThisType<Partial<State>>`。

### 3.2 运行时注入
- 如阶段 2.2 所述，在 `ModuleFactory` 中实现 logic 生成。
- 确保生成的 logic 行为与 `rqLogic` 完全一致。

## 4. 任务拆解

### 步骤 1: 创建 `@logix/query` 包
- [ ] 初始化 `packages/logix-query`。
- [ ] 实现 `QueryClientTag`。
- [ ] 实现 `rqLogic` 工厂 (Layer 2)。
- [ ] 添加 `logix-test` 测试。

### 步骤 2: Core 增强
- [ ] 在 `@logix/core` 中添加 `Query.field` 定义。
- [ ] 修改 `ModuleFactory.ts` 以扫描并注入 logics。

### 步骤 3: 文档与示例
- [ ] 添加 `examples/logix-query-demo`。
- [ ] 更新 `apps/docs` 中的 Query 集成指南。

## 5. API 预览

```ts
// Layer 1
const UserModule = Logix.Module.make('User', {
  state: Schema.Struct({
    id: Schema.String,
    profile: Query.field({
      queryKey: (s) => ['user', s.id],
      queryFn: (...)
    })
  }),
  actions: {}
})

// Layer 2
const UserLogic = rqLogic(UserModule, {
  target: 'profile',
  queryKey: (s) => ['user', s.id],
  ...
})
```
