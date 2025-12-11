---
title: Capability Plugin System Architecture (v3)
status: definitive.v3
version: 3.0.1
value: core
priority: next
related:
  - ../../../runtime-logix/core/01-architecture.md
  - ../../../runtime-logix/core/03-logic-and-flow.md
  - ../../../runtime-logix/core/06-platform-integration.md
  - ../state-graph-and-capabilities/01-field-capabilities-overview.md
---

# Capability Plugin System Architecture (v3)

> **说明**：与字段能力相关的 `CapabilityMeta` 协议在  
> `topics/state-graph-and-capabilities/01-field-capabilities-overview.md` 中以「Field Capabilities」角度做了统一 Mapping；  
> 本文继续作为更广义能力插件体系（不限字段）的详细规范。

> **The "Bound Helper Pattern"**
>
> Logix v3 的能力扩展体系彻底摒弃了“上帝对象扩展 (`$.extension`)”模式，转而采用 **函数组合 (Functional Composition)** + **依赖注入 (Dependency Injection)** + **元数据协议 (Metadata Protocol)** 的微内核架构。

## 1. 核心架构决策 (Architecture Decision)

### 1.1 The Problems

- **God Object Problem**: 试图将所有插件能力挂载到 `$` 上（如 `$.query`），导致 `BoundApi` 类型无限膨胀，且 Core 必须感知所有插件类型。
- **Inference Hell**: 插件方法若不接收 `$`，无法自动推导当前 Module 的 `State/Action` 类型，迫使开发者手动标注泛型。
- **Runtime Coupling**: 插件注册表使得 Core 运行时变得臃肿且难以 Tree-shaking。

### 1.2 The Solution: Bound Helper Pattern

v3 确立了唯一的扩展形态：**Bound Helper Function**。

```typescript
// ✅ Correct V3 Way
import { Query } from '@logix/query'

// Helper 接收 $ 作为首个参数，自动推导上下文，类型零负担
yield *
  Query.query($, {
    target: 'profile',
    key: (s) => ['user', s.id],
  })
```

- **Tiny-Kernel**: Core 只需要定义 `BoundApi` 接口，它仅作为 **Type Witness (类型见证者)** + **State Context**。
- **Inference-First**: 利用 TS 泛型推导，`config` 内的 `s` 自动锁定为当前 State 类型。
- **Effect-Native**: 通用能力（Lifecycle, Logger, Error）直接从 Effect 环境获取，不再挂载到 `$` 上。
- **Runtime 无注册表**: 能力包的形态固定为「Helper + Layer + Schema 工厂」，Runtime 仅合并 Layer，不维护插件列表或动态注册表。

## 2. 协议定义 (Protocol Specification)

所有 Logix 插件（官方或第三方）必须遵守以下协议。

### 2.1 Helper Signature (Type A: Effect)

用于驱动副作用或数据流的 Helper。

```typescript
export const myHelper = <S extends Logix.ModuleShape<any, any>, R>(
  // Anchor Parameter: Only for State/Action typing
  $: Logix.BoundApi<S, R>,
  // Config derives schema from S
  config: MyHelperConfig<Logix.StateOf<S>>,
): Effect.Effect<void, never, R | MyService> => {
  // Implementation...
}
```

> [!IMPORTANT]
> **Error Convergence**: Helper 返回的 Effect 必须尽可能保证 `E = never`。
>
> - 业务失败（如网络错误）**必须**通过 State 暴露（如 `state.error`）。
> - 只有严重的配置错误（Defect）才允许导致 Fiber 崩溃。

### 2.2 Lifecycle & Scoping

Logix V3 不再提供 `$.lifecycle`。插件和业务逻辑应直接使用 Effect Scope 能力或 Core 提供的 Utilities。

```typescript
import { Lifecycle } from '@logix/core'

Effect.gen(function*() {
   // ✅ Standard Effect Way
   yield* Effect.addFinalizer(...)

   // ✅ Logix Utility Way
   yield* Lifecycle.onInit(Effect.log('Init'))
})
```

### 2.3 Controller Signature (Type B: Controller)

用于返回命令式句柄的高级 Helper。

```typescript
export const useMap = <S extends Logix.ModuleShape<any, any>, R>(
  $: Logix.BoundApi<S, R>,
  config: MapConfig
): Effect.Effect<MapController, never, R | MapService> => {
  // ...
}

// Usage
const map = yield* Map.useMap($, ...);
yield* map.flyTo([0,0]);
```

### 2.4 Metadata Protocol (for Schema Integration)

为了支持 `Query.field` 等 Schema 上的语法糖，Core 定义了标准的元数据协议。

```typescript
// @logix/core symbol
export const CapabilityMeta = Symbol.for('@logix/core/CapabilityMeta')

// Plugin implementation
export const field = (config) =>
  Schema.annotations({
    [CapabilityMeta]: {
      kind: 'Query',
      priority: 10,
      // 惰性工厂：Module.live 时展开为 Logic
      factory: ($, fieldName) => Query.query($, { ...config, target: fieldName }),
    },
  })
```

## 3. 最佳实践 (Best Practices)

### 3.1 Fluent Pipe Definition

为了避免 Schema 定义中引用自身 State 的递归类型问题，同时避免将 State 拆分为多段，推荐使用 Effect `pipe` 模式：

```typescript
const UserState = Schema.Struct({
  id: Schema.String,
}).pipe(
  Query.attach('profile', {
    key: (s) => ['user', s.id], // ✅ 自动推导
  }),
)
```

### 3.2 Service Injection

插件包应提供 `Layer` 工厂，用于平台侧注入。

```typescript
// App Entry
const runtime = Logix.Runtime.make(Root, {
  layer: Layer.mergeAll(Query.layer(new QueryClient()), Router.layer(history)),
})
```

## 4. 平台与工具链集成 (Platform Integration)

### 4.1 Parser Strategy

Parser 仅需识别 `Identifier($, Obj)` 形式的调用表达式。

- **Identifier**: 插件类型 (`Query.query`)
- **Arg 0**: Context Anchor (`$`)
- **Arg 1**: Static Config (用于 Studio 属性面板)

### 4.2 Studio View

- **Effect Helper**: 渲染为常驻的 Logic 节点。
- **Controller Helper**: 渲染为资源节点 + 变量引用。
- **Schema Field**: 渲染为 State 节点上的能力徽标 (Badge)。

### 4.3 工程化编译路径（Codegen / Typegen）

在 v3 的元编程体系下，能力插件除了 Runtime 扫描 Schema Metadata 外，还允许引入 **本地工程化辅助**：

- 对于像 Query / Reactive / Link 这类“来源型能力”，推荐继续由 Runtime 在 `Module.live` 阶段扫描 `CapabilityMeta`，调用 Helper Factory 生成 Logic；
- 对于 Action / Reducer 这类“就地状态转移能力”，可以通过独立的 generator（参考 `L9/logix-state-first-module-codegen.md`）在构建期：
  - 从 State Schema / annotations 中推导出 `actions` / `reducers`；
  - 生成普通的 `Module.make(...)` 实现和 `.d.ts`，作为 Runtime 的输入。

统一原则是：**Schema 只承载 Blueprint，真正的执行路径可以是 Runtime 编译（Module.live）或 Build-Time 编译（Codegen），但两者都遵守同一套 Capability Metadata 协议，不引入第二种“魔法通道”。**

## 5. 迁移指南 (Migration)

彻底废弃以下模式：

- ❌ `$.query(...)` (God Object)
- ❌ `$.lifecycle.onInit(...)` (Bound Lifecycle)
- ❌ `Logix.Plugin.define(...)` (Old Registry)

拥抱新模式：

- ✅ `Query.query($, ...)`
- ✅ `yield* Lifecycle.onInit(...)`
- ✅ `Schema.annotations({ [CapabilityMeta]: ... })`
