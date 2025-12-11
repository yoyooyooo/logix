---
title: Beyond State & Action - The Unified Schema Vision
status: draft
version: 1.3
value: vision
priority: 100
related: []
---

# Beyond State & Action: The Unified Schema Vision

> 本文基于 [SCD Pattern](../../L9/schema-capability-dual-pattern.md) 进一步发散。
> 核心追问：**如果 Schema 不仅仅是 State/Action 的定义，它还能是什么？**

## 1. 突破 State/Action 的二元对立

目前的 Logix Module 定义结构是：

```ts
Logix.Module.make("User", {
  state: { ... },  // 名词：数据
  actions: { ... } // 动词：意图
})
```

但在 SCD Pattern 的视角下，Schema 本质上是 **"Capability 的静态描述"**。既然 Capability (如 Router, Socket, Lifecycle) 是丰富多彩的，为什么 Schema 只能局限在 `state` 和 `actions` 这两个桶里？

## 2. 可能性一：`setup` (Configuration Schema)

有些东西既不是 State（不随时间变化），也不是 Action（不是用户触发），而是**模块的静态配置**。

**场景**：

- Router 的路径参数定义。
- Socket 的频道订阅配置。
- 埋点的基础上下文（如 pageId）。

**构想**：引入 `setup` 或 `config` 顶级字段。

```ts
Logix.Module.make("UserDetail", {
  // 静态配置：定义模块的"构造参数"
  setup: {
    route: Router.define("/user/:id"),
    socket: Socket.channel("user-updates"),
    tracker: Tracker.context({ page: "user_detail" })
  },

  state: { ... },
  actions: { ... }
})
```

**SCD 映射**：

- `setup.route` (Schema) -> 自动注册路由表，解析 URL 参数注入 State。
- `setup.socket` (Schema) -> 自动建立连接，分发消息到 Action。

## 3. 可能性二：`events` (Output Schema)

目前的 Module 主要是"输入型"（接收 Action）。但在微前端或模块编排场景下，模块还需要定义**"对外输出什么事件"**。

**场景**：

- 弹窗模块：确认/取消事件。
- 选人组件：选中事件。

**构想**：引入 `events` 顶级字段。

```ts
Logix.Module.make("UserPicker", {
  state: { ... },

  // 输出契约：定义模块会抛出什么
  events: {
    onSelect: Schema.Struct({ userId: Schema.String }),
    onCancel: Schema.Void
  }
})
```

**SCD 映射**：

- `events.onSelect` (Schema) -> 生成 `$.emit('onSelect', payload)` Capability。
- 父模块可以通过 `$.use(UserPicker).on('onSelect', ...)` 消费。

### 3.1 Deep Dive: Actions vs Events

你可能会问：_Action 本身就可以被监听，为什么还需要 Events？_

这关乎 **语义边界 (Semantic Boundary)** 和 **封装性 (Encapsulation)**：

1.  **Actions are Inputs/Commands (输入/指令)**
    - 语义：外部希望模块做什么（如 `submit`），或模块内部发生了什么交互（如 `clickRow`）。
    - 消费者：主要是**模块自身的 Logic**。
    - 风险：如果外部直接监听 `actions.clickRow`，当模块重构（改名为 `actions.selectItem`）时，外部代码会崩溃。Action 是实现细节。

2.  **Events are Outputs/Notifications (输出/通知)**
    - 语义：模块**显式承诺**对外暴露的契约（如 `onSelect`）。
    - 消费者：**父模块**或**编排层**。
    - 价值：Event 是防腐层。模块内部可以从 `clickRow` 重构为 `doubleClickRow`，只要最终都触发 `emit('onSelect')`，外部契约就不变。

**类比**：

- **Action** ≈ React 组件内部的 `handleClick` 或 Redux 的 `dispatch`。
- **Event** ≈ React 组件的 `props.onSelect` 回调。

## 4. 可能性三：`services` (Dependency Schema)

模块可能依赖某些外部服务，而这些依赖也应该在 Schema 中显式声明，而不是在 Logic 里隐式 `yield* ServiceTag`。

**构想**：引入 `services` 顶级字段。

```ts
Logix.Module.make('Payment', {
  // 依赖声明：我需要这些能力才能运行
  services: {
    paymentGateway: PaymentGateway.schema, // 声明依赖接口
    logger: Logger.schema,
  },
})
```

**SCD 映射**：

- `services.paymentGateway` (Schema) -> 运行时自动从 Env 注入，挂载到 Logic 中的 `services.paymentGateway` 接口（例如通过 `$.use(ServicesTag)` 注入）。
- 实现了**依赖注入的可视化**。

### 4.1 Deep Dive: `services` Schema vs `imports` Layer

在 `Module.implement({ imports: [...] })` 中，我们已经可以通过 Layer 注入依赖。那么 `services` Schema 的价值何在？

**区别在于：Interface vs Implementation**。

1.  **`services` Schema 定义的是 Interface (需求)**
    - 它声明："我需要一个 PaymentGateway，它的形状是这样。"
    - 它是**静态的**，属于 Module Definition 的一部分。
    - 平台（Studio）读取它来画出"插座"。

2.  **`imports` Layer 提供的是 Implementation (实现)**
    - 它声明："我把 StripePaymentGateway 注入给你。"
    - 它是**运行时的**，属于 Module Implementation 的一部分。
    - 平台（Runtime）执行它来接通"插头"。

**取舍与协作**：

- **Schema-First**: 推荐优先使用 `services` Schema 声明依赖。
- **Auto-Wire**: 运行时可以检查 `imports` 中提供的 Layer 是否满足 `services` Schema 的要求（类型检查）。
- **Mocking**: 在测试时，工具链可以根据 `services` Schema 自动生成 Mock Layer，而不需要手动构造复杂的 Layer。

## 5. 可能性四：`slots` (Composition Schema)

正如低代码组件通过 Slot 声明"此处可以放什么"，Logix Module 也可以通过 `slots` 声明其**逻辑插槽**。

**场景**：

- 列表模块：需要一个"筛选器模块"和一个"详情模块"。
- 布局模块：需要"侧边栏"和"内容区"。

**构想**：引入 `slots` 顶级字段。

```ts
Logix.Module.make('Dashboard', {
  // 组合契约：声明我需要哪些子模块
  slots: {
    sidebar: Slot.Module({ implements: SidebarInterface }),
    content: Slot.Module(),
  },
})
```

**SCD 映射**：

- `slots.sidebar` (Schema) -> 生成 `$.slots.sidebar` Capability。
- 允许父模块在实例化时注入子模块：`Dashboard.live({ slots: { sidebar: MySidebar } })`。
- 运行时可以通过 `$.slots.sidebar.state` 访问子模块状态，实现**父子通信的解耦**。

### 5.1 与工程化辅助的关系

本草案更多从“Schema 作为 Blueprint”角度发散 Module 的多种维度（setup / services / slots / events 等）。在 v3 的整体体系下，这些 Blueprint 除了可以在 Runtime 被 `Module.live` 扫描并展开为 Logic，也可以在构建期被 **本地工程化工具** 消费：

- 类似 `L9/logix-state-first-module-codegen.md` 中的 State-First Codegen，可以针对某些维度（如 actions/reducers）在构建期生成普通 TS 模块与类型声明；  
- 对于 Query / Reactive / Link / Schema Link / ResourceField 等“来源型能力”，仍然优先通过 SCD + Capability Plugin 在 Runtime 编译；
- 统一约束是：**Schema/Metadata 只负责声明，具体“什么时候、在哪个阶段编译”为可插拔策略，而不是 Schema 自己变成解释执行的 Runtime。**

## 6. 终局愿景：Module as a Resource

如果我们将上述可能性整合，Module 就不再只是一个 Redux-like 的状态机，而变成了一个**自描述的云原生资源 (Cloud-Native Resource)**：

```ts
Logix.Module.make("Order", {
  // 1. Identity & Config
  setup: { ... },

  // 2. Dependencies (Inputs)
  services: { ... },

  // 3. Composition (Children)
  slots: { ... },

  // 4. Internal State (Data)
  state: { ... },

  // 5. Operations (Methods)
  actions: { ... },

  // 6. Notifications (Outputs)
  events: { ... }
})
```

这与 K8s CRD (Custom Resource Definition) 或 Terraform Resource 的结构惊人地相似。
**SCD Pattern** 是支撑这一愿景的核心技术：每一个字段（无论是 setup, state, events 还是 slots）都是某个 Capability 的 Schema 投影。

## 7. 深度反思：与底层 Runtime 的映射与价值

这些新字段（slots, services, events）并不是凭空创造的魔法，它们与底层的 Effect-Native 机制有着严格的对应关系。

### 7.1 映射关系矩阵

| Schema Field | Bound API (`$`)     | Runtime/Effect 机制     | 核心价值                                                                          |
| :----------- | :------------------ | :---------------------- | :-------------------------------------------------------------------------------- |
| `state`      | `$.state`           | `SubscriptionRef`       | 数据驱动视图                                                                      |
| `actions`    | `$.actions`         | `Queue` / `Hub`         | 意图输入                                                                          |
| `slots`      | `$.slots.<name>`    | `Context` (依赖注入)    | **逻辑组合解耦**：父子模块不需要硬编码 import 关系，而是通过 Slot 接口通信。      |
| `services`   | `services.<name>`   | `Context.Tag` + `Layer` | **依赖显式化**：Logic 不再隐式 `yield* Tag`，而是显式声明依赖，便于 Mock 和测试。 |
| `events`     | `$.emit(name)`      | `PubSub` / `Hub`        | **输出契约**：明确模块的输出边界，充当防腐层，隔离内部实现细节。                  |
| `setup`      | `$.config.<name>`   | `Config` Service        | **静态配置**：将硬编码常量提取为可配置参数。                                      |

### 7.2 为什么不能只写 Effect？(The Value of Schema)

既然底层都是 Effect，为什么不直接在 Logic 里写 `yield* ServiceTag` 或者 `yield* ParentModule.actions.xxx`？

1.  **黑盒 vs 白盒 (Blackbox vs Whitebox)**
    - **Effect Logic 是黑盒**：只有运行代码（或进行复杂的 AST 分析）才知道它依赖了什么服务、调用了哪个子模块。
    - **Schema 是白盒**：它是静态的、声明式的元数据。平台（Studio）无需运行代码就能画出完整的**依赖拓扑图**。

2.  **隐式 vs 显式 (Implicit vs Explicit)**
    - **隐式依赖**：在 Logic 深处 `yield* LoggerTag` 是隐式的。
    - **显式契约**：在 `services: { logger: ... }` 中声明是显式的。这强制开发者思考模块的边界条件。

3.  **平台化与 AI (Platform & AI)**
    - AI Copilot 在生成代码时，如果有了 Schema 提供的结构化上下文（"这个模块需要 Logger 和 PaymentService"），生成的 Logic 代码准确率会大幅提升，幻觉会减少。

### 7.3 结论

这些新字段是对 Effect 底层机制的 **结构化封装 (Structured Encapsulation)**。
它们没有改变 Logix "Effect-Native" 的本质，而是为这个强大的运行时穿上了一层 **"可解释、可编排、可管理"** 的外衣。

## 8. 风险控制：避免“平台逻辑侵入运行时”

> 用户顾虑：_这些新字段会不会让平台逻辑疯狂涌向运行时，增加开发者负担？_

这是一个非常重要的警示。为了避免 Logix 变成一个臃肿的“低代码运行时”，我们需要划定明确的边界。

### 8.1 核心原则：Runtime-Agnostic Core

**`@logix/core` 必须保持纯净。**

1.  **Core 只定义扩展点**：Core 只知道 `Module` 有 `state` 和 `actions`，以及一个通用的 `extensions` 字典（或 `Capabilities` 接口）。
2.  **新字段是“虚”的**：`setup`, `events`, `services`, `slots` 这些字段**不应该硬编码在 Core 的 Module 类型定义里**。
3.  **通过插件包扩展**：这些字段应该由 `@logix/plugin-events`, `@logix/plugin-slots` 等插件包通过 TypeScript Module Augmentation 注入。

### 8.2 桥接包策略 (Bridge Package Strategy)

正如用户建议的，我们应该使用**桥接包**来隔离平台侧逻辑：

- **`@logix/core`**: 只有 `state`, `actions`。这是所有 Logix 应用的最小集。
- **`@logix/std` (Standard Library)**: 引入 `events`, `services` 等常用模式。这是大多数业务开发者的起手式。
- **`@logix/platform-bridge`**: 专门用于对接 Studio 的元数据提取和运行时注入。

### 8.3 开发者体验 (DX) 保护

对于普通开发者：

- **默认不强制**：如果你不需要 Studio 的可视化能力，完全可以只写 `state` 和 `actions`，像以前一样在 Logic 里写 Effect。
- **渐进式增强**：当你觉得模块太复杂，需要理清依赖关系时，再引入 `services` Schema。
- **零运行时开销**：这些 Schema 主要是给编译器和 Studio 看的。在生产环境运行时，它们只是生成了标准的 Effect 代码，没有额外的 Overhead。

### 8.4 结论

我们不能为了平台化而牺牲运行时的简洁性。
**Unified Schema Vision 是一个“可选的、渐进式的”增强层，而不是强制的枷锁。**
它应该作为 `@logix/std` 或特定插件包的一部分存在，而不是侵入 `@logix/core` 的内核。
