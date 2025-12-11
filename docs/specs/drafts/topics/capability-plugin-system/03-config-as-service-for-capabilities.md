---
title: Config as Service Pattern (v3)
status: definitive.v3
version: 3.0.0
layer: Implementation Pattern
related:
  - 01-capability-plugin-blueprint.md
---

# Config as Service Pattern (v3)

> **"Config is just a Layer"**
>
> 在 Logix v3 中，**能力配置 (Capability Config)** 等同于 **服务注入 (Service Injection)**。我们不再维护一套独立的 `RuntimeConfig` 对象，而是全盘拥抱 Effect 的 Layer/Context 机制。

## 1. 核心理念

### 1.1 The Shift

- **Old Way**: `const runtime = Logix.Runtime.make({ queries: { retry: 3 } })`
- **New Way**: `const runtime = Logix.Runtime.make(module, { layer: Query.layer({ retry: 3 }) })`

### 1.2 Why?

- **Uniformity**: 配置就是环境 (Environment)。
- **Fractal**: Effect Layer 天生支持分形（Scope 嵌套、覆盖）。
- **Type Safe**: Tag 保证了获取到的 Config 一定是类型匹配的。

## 2. 实现模式

### 2.1 Capability Spine (Spine Layer)

每个插件应提供一个 "Spine" (脊柱) 层，用于承载其全局配置。

```typescript
// @logix/query definition
export class QueryConfig extends Context.Tag('QueryConfig')<
  QueryConfig,
  { defaultStaleTime: number } // Service Shape
>() {}

// Factory for User
export const layer = (config: { defaultStaleTime: number }) => Layer.succeed(QueryConfig, config)
```

### 2.2 Consumption (In Logic)

在 Helper 中，通过 `$.use` (或 `Effect.service`) 读取配置。

```typescript
// Inside Query.query helper
const globalConfig = yield * $.use(QueryConfig)
const staleTime = localConfig.staleTime ?? globalConfig.defaultStaleTime
```

## 3. 分形配置 (Fractal Config)

由于 Logix Runtime 支持 Fork，这一模式天然支持分形配置。

### 3.1 根配置 (Root)

```typescript
// App root
Logix.Runtime.make(Root, {
  layer: Query.layer({ defaultStaleTime: 5000 }),
})
```

### 3.2 局部覆盖 (Local Override)

在某个子树或组件下，可以通过 `provideService` 或 `Layer` 覆盖配置。

```typescript
// Subtree
const SubRuntime = RootRuntime.fork({
  // Only affects this scope and below
  layer: Query.layer({ defaultStaleTime: 0 }),
})
```

## 4. 结论

**Config as Service** 不是一个新发明，而是对 Effect 核心能力的正确使用。它消除了 Logix Core 中关于 "Plugin Config merging" 的所有特殊逻辑，将复杂度完全托管给了 Effect Runtime。
