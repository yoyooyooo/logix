# 内核设计 (Kernel Design Specification)

> **Status**: Definitive (v2.3 Unified Action)
> **Date**: 2025-11-23
> **Scope**: Kernel Runtime (Full Feature Set)

## 1. 核心概念 (Core Concepts)

Kernel 是一个**“意图驱动的双流状态机”**。它通过严格区分“数据”与“意图”来消除架构上的模糊性：

1.  **State (持久状态)**: Schema 定义的、持久化的业务数据快照 (The Container)。
    *   *特性*: 惰性计算、可持久化、驱动 UI 渲染。
2.  **Actions (统一意图)**: Schema 定义的、瞬态的业务动作 (The Intent)。
    *   *特性*: 携带载荷 (Payload)、携带元数据 (Meta)、驱动业务逻辑。
    *   *范围*: 涵盖数据变更 (Mutation)、UI 交互 (Interaction)、瞬态通知 (Ephemeral Signals)。
3.  **Rules (逻辑规则)**: 声明式的业务规则，负责响应 State 变化、Action 派发或外部信号，并产生副作用。

## 2. API 设计: `makeStore`

```typescript
declare function makeStore<S, A, Services>(config: StoreConfig<S, A, Services>): Store<S, A, Services>
```

### 2.1 StoreConfig

```typescript
type StoreConfig<S, A, Services> = {
  // 1. 状态契约 (The What)
  // 定义 State 的结构与约束
  stateSchema: Schema.Schema<S>

  // 2. 初始态 (The T0)
  // 状态机的时间起点
  initialState: S

  // 3. 意图契约 (The How)
  // 定义外界可以对状态机施加的所有“力” (Tagged Union)
  // 包含：数据修改意图 (e.g. 'updateUser') 和 瞬态交互意图 (e.g. 'toast')
  actionSchema: Schema.Schema<A>

  // 4. 外部输入源 (The Source)
  // 定义不属于 State 的外部事件流 (WebSocket, Timer, Global Events)
  inputs?: Record<string, Stream.Stream<any>>

  // 5. 逻辑编排 (The Rules)
  // 接收一个 LogicApi 工厂，返回一组结构化的规则定义
  rules?: (api: LogicApi<S, A, Services>) => readonly LogicRule[]

  // 6. 依赖注入 (Dependency Injection)
  // 显式注入服务对象，供 Logic 通过 api.services 访问
  services?: Services

  // 7. 运行时环境 (Effect Runtime)
  // 用于执行所有 Effect。支持三级回退策略：
  // Config (Explicit) > Context (Implicit) > Global Default
  runtime?: Runtime.Runtime<any>
}
```

### 2.2 LogicApi (The Builder)

`LogicApi` 是一个强类型的规则构建器，它绑定了当前 Store 的泛型上下文 (`S`, `A`)。

```typescript
interface LogicApi<S, A, Services> {
  // --- 1. Rule Factory (规则工厂) ---
  // 创建一个结构化的逻辑规则
  rule: (definition: RuleDefinition<S, A>) => LogicRule;

  // --- 2. Triggers (触发器构建器) ---
  // 用于定义规则的触发条件
  on: {
    // 监听状态变化 (Path 自动补全)
    change: <V>(selector: (s: S) => V) => Trigger<V>;
    // 监听 Action (Type 自动补全)
    action: <T extends ActionType<A>>(type: T) => Trigger<ActionPayload<A, T>>;
    // 监听外部输入流 (Input 自动补全)
    input: <K extends keyof Inputs>(key: K) => Trigger<Inputs[K]>;
    // 组合触发器
    combine: (...triggers: Trigger<any>[]) => Trigger<any>;
  };

  // --- 3. Operations (操作构建器) ---
  // 用于构建副作用管道
  ops: {
    // 状态操作
    set: <V>(selector: (s: S) => V, value: V, meta?: SetOptions) => Operation;
    update: <V>(selector: (s: S) => V, updater: (old: V) => V, meta?: SetOptions) => Operation;
    
    // 动作派发 (Type-Safe Action Creators)
    // 自动映射 ActionSchema，例如: api.ops.actions.userUpdate({ name: 'John' })
    actions: ActionDispatchers<A>;

    // 流程控制
    debounce: (ms: number) => Operation;
    throttle: (ms: number) => Operation;
    filter: (predicate: (ctx: any) => boolean) => Operation;
    
    // 任务执行
    fetch: (effect: Effect<any>) => Operation;
    compute: (fn: (ctx: any) => any) => Operation;
  };

  // --- 4. Pipeline (管道构建器) ---
  // 串行组合多个操作
  pipe: (...ops: Operation[]) => Operation;

  // --- 5. Dependencies ---
  services: Services;
  inputs: Inputs;
}
```

### 2.3 ActionDispatchers (Type Mapping)

`api.ops.actions` 是一个 Proxy 对象，它将 `ActionSchema` 中定义的 Tagged Union 映射为强类型的方法调用。

**映射规则**:
*   假设 Action Type 为 `user/update`，Payload 为 `{ name: string }`。
*   映射为: `api.ops.actions['user/update'](payload: { name: string })`。
*   返回: 一个包含完整 Action 对象的 `Effect` (或 Operation)。

> **Design Note**: 我们保留原始的 Action Type 字符串作为键名，以避免复杂的命名转换逻辑，同时利用 TypeScript 的 `keyof` 提供自动补全。

## 3. 运行时与依赖注入 (Runtime & DI)

Kernel 深度集成 Effect-TS 的 Context 系统，支持灵活的依赖注入策略。

### 3.1 Runtime 解析策略

Store 在启动时会按照以下优先级确定使用的 `Runtime`：

1.  **Explicit Config**: `makeStore({ runtime: myRuntime })` 传入的实例。
2.  **Implicit Context**: (React场景) 通过 `RuntimeProvider` 注入的上下文 Runtime。
3.  **Global Default**: 通过 `KernelConfig.setDefaultRuntime()` 设置的全局兜底 Runtime。

### 3.2 依赖注入模式

*   **模式 A: 显式参数 (推荐)**
    通过 `config.services` 传入对象，Logic 中通过 `api.services` 访问。适合绝大多数场景，简单直观。

*   **模式 B: Effect Context (高级)**
    Logic 中直接 `yield* MyTag`。要求 Store 运行的 Runtime 中已包含该 Tag 的 Layer 实现。适合大型应用共享全局能力 (Logger, Auth, API)。

## 4. 关键机制 (Key Mechanisms)

### 4.1 Action-Driven Architecture
UI Dispatch Action -> Kernel Handle Action -> State Change / Side Effect。

### 4.2 循环防护 (Loop Protection)
*   **同步熔断**: 限制调用栈深度。
*   **因果熔断**: 基于 Trace ID 检测 A -> B -> A 循环。

### 4.3 可观测性 (Observability)
基于 Action Trace 的全链路追踪。每个 Action 生成唯一 `traceId`，所有衍生的 `set` 或 `dispatch` 继承该 ID。

## 5. 最佳实践: 模块化逻辑 (Modular Logic)

为了避免在大型项目中出现“巨型 Store 文件”，Kernel 提供了 `createLogicBuilder` 辅助函数，支持将逻辑拆分到独立模块中，同时保持类型安全。

### 5.1 定义类型绑定的构建器

在 Store 的类型定义文件中，导出一个绑定了泛型的 `defineRule`。

```typescript
// store/types.ts
import { createLogicBuilder } from '@kernel/core';
import type { MyState, MyAction, MyServices } from './schema';

// 一次绑定，处处受益
export const defineRule = createLogicBuilder<MyState, MyAction, MyServices>();
```

### 5.2 编写独立逻辑模块

在业务模块中，使用 `defineRule` 编写逻辑。无需重复声明泛型，`api` 参数会自动获得类型推导。

```typescript
// features/auto-save.ts
import { defineRule } from '../store/types';

export const autoSave = defineRule(api => api.rule({
  name: 'AutoSave',
  trigger: api.on.change(s => s.content), // 类型自动推导！
  do: api.pipe(
    api.ops.debounce(1000),
    api.ops.fetch(ctx => api.services.save(ctx.value))
  )
}));
```

### 5.3 组装 Store

在 `makeStore` 中引入并使用这些模块。

```typescript
// store/index.ts
import { autoSave } from '../features/auto-save';

makeStore({
  // ...
  rules: (api) => [
    // 直接调用模块化逻辑
    autoSave(api),
    // ...其他逻辑
  ]
})
```
