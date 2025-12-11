---
title: Logix Runtime 核心演进路线（合并草稿）
status: draft
version: 0.2.0
supersedes:
  - ../L9/logix-instrumentation-overhaul.md
  - ../L9/runtime-logix-spec-adjustments.md
  - ../L9/module-runtime-adapter-and-customization.md
related: []
---

# Logix Runtime 核心演进路线

**目标**: 整合观测性、规范边界、适配扩展三个维度的 Runtime 演进方向，形成统一的技术路线图。

---

## 一、背景与问题域

### 1.1 三个核心挑战

当前 Logix runtime-logix 规范与实现在以下三个方向存在演进需求：

1. **观测性架构** (`secure` → Supervisor)
   - 现状：`Logic.secure` 手动包装，语义歧义，非 Effect 原生
   - 目标：零侵入、Supervisor 驱动、与 Effect 生态深度集成

2. **规范边界与灵活性** (ModuleRuntime.make 职责)
   - 现状：部分规范约束过强，实现路径单一
   - 目标：区分硬边界（接口/语义）与软建议（实现方式）

3. **Runtime 适配与扩展** (自定义 Runtime 路径)
   - 现状：适配作者需从零实现 `ModuleRuntime` 接口
   - 目标：提供 Adapter 中间层，支持远程 Store / 测试 Runtime

### 1.2 设计原则

- **渐进式演进**: 优先解决实践中的燃眉之急，长期能力保留在蓝图中
- **分层清晰**: 区分 Level 1 (必须) / Level 2 (推荐) / Level 3 (蓝图)
- **业务透明**: Runtime 演进不应影响业务 Module/Logic 编写体验

---

## 二、观测性重构：从 `secure` 到 Supervisor

### 2.1 现状痛点

当前 `Logic.secure` 存在的问题：

1. **语义歧义**: 名称暗示安全/鉴权，实际是插桩/AOP
2. **手动且脆弱**: 依赖 DSL 层显式调用，绕过 Builder 就失去可观测性
3. **非 Effect 原生**: 通过函数参数传递元数据，忽略 FiberRef/Supervisor/Tracer
4. **中间件僵化**: 与调用点耦合，难以全局配置

### 2.2 目标愿景

**零侵入、无处不在、零开销**的观测性：

- **零侵入**: 业务逻辑不感知监控，无需 `secure(...)` 包装器
- **Supervisor 驱动**: 使用 `Effect.Supervisor` 自动捕获 Logic 执行生命周期
- **Trace 优先**: 元数据通过 `FiberRef` 传播，与 `Effect.Tracer` 集成
- **结构化日志**: 使用 `Effect.annotateLogs` 自动附加上下文

### 2.3 迁移路线图

#### 阶段 1: 语义对齐 (v3.1)

```typescript
// 之前
Logic.secure(effect, { name: "flow.run" })

// 之后
import { LogicContext } from "@logix/core/internal"

const instrument = (effect, meta) =>
  effect.pipe(
    // 1. 注入元数据到 FiberRef
    LogicContext.withMeta(meta),
    // 2. 原生 Tracing 集成
    Effect.withSpan(`Logix.${meta.name}`, { attributes: meta }),
    // 3. 日志注解
    Effect.annotateLogs({ logic_op: meta.name })
  )
```

- 重命名 `Logic.secure` → `Logic.instrument`
- 剥离错误处理，移入 `Logic.catch` 或 Flow 定义

#### 阶段 2: FiberRef 上下文 (v3.2)

```typescript
export const CurrentLogicMeta = FiberRef.unsafeMake<LogicMeta | null>(null)

const runFlow = (flow, meta) =>
  flow.pipe(
    Effect.locally(CurrentLogicMeta, meta),
    Effect.catchAllCause(cause => handleLogicError(cause, meta)),
    Effect.fork
  )
```

- 创建 `LogicContext` 服务/FiberRef
- 验证并发算子下的 Context 传播（Snapshot 机制）

#### 阶段 3: Supervisor 实现 (v4.0)

```typescript
const LogixSupervisorLive = Layer.succeed(
  Supervisor.Tag,
  new LogixSupervisor({
    onStart: (context, fiber) => telemetry.trackStart(context),
    onEnd: (value, fiber) => telemetry.trackEnd(value)
  })
)

const runtimeLayer = Layer.mergeAll(
  LogixSupervisorLive,
  LogicContextLive,
  // ...
)
```

- 实现 `LogixSupervisor` 并通过 Layer 注入
- 移除 DSL 中的 `Logic.instrument`
- 自动注入 `LogicBoundaryTag` 和错误边界

### 2.4 风险与缓解

| 风险 | 缓解策略 |
|------|---------|
| **性能开销** | 采样与过滤：仅处理带 `LogicBoundary` 标记的 Fiber；异步处理 Ring Buffer |
| **调试体验** | 配套 DevTools；提供 `Logix.debug(true)` 开关输出 Context 传播日志 |
| **多实例/SSR** | 实例级 Scope：Supervisor 随 `ModuleRuntime` 实例化；环境感知，SSR 仅记录日志 |
| **边界界定** | DSL 层自动注入 `LogicBoundaryTag`；显式错误边界包裹 |
| **迁移成本** | v3.x 双模共存；提供 Codemod 工具 |

---

## 三、规范边界优化：硬约束 vs 软建议

### 3.1 ModuleRuntime.make 职责调整

#### 现状问题

- 规范将 `ModuleRuntime.make` 定义为接收多个 Layer 的统一入口
- 对实现方约束过强，扩展空间有限
- 业务代码实际只关心 `Module.live(initial, ...logics)`

#### 调整方向

**区分两层边界**：

1. **硬边界 (Level 1)**: `ModuleRuntime` 接口与语义不变式
   - `getState` / `setState`: 单一一致 State 树
   - `dispatch` / `actions$`: 顺序保证
   - `changes(selector)`: 视图变化流语义
   - `ref()`: SubscriptionRef 视图

2. **软建议 (Level 2)**: 如何基于 Effect Layer 组合得到标准实现
   - 保留伪代码用于解释 Runtime 工作原理
   - 允许多种实现变体，不要求唯一
   - 实际分层可以是：
     - `ModuleRuntime.make(initialState)` 只负责核心
     - `Module.live` 负责绑定 Shape + Logic + Runtime

### 3.2 自定义 Runtime 构造路径

#### 合法路径

- 直接提供 `Layer<Tag, E, R>`，构造任意符合接口的实现
- 通过 Adapter 包装远程 Store / 调试 Runtime
- 测试环境用专用 `TestRuntime`

#### 规范要求

- 保留语义不变式和"合法/不推荐用法"列表
- 将"应该通过 `ModuleRuntime.make` 构造"改为"推荐实现之一"
- 增补"自定义 Runtime 设计指南"
  - 远程 Store 包装
  - 测试 Runtime
  - 只读 Runtime
  - 如何验证不变式

### 3.3 Debug / Inspector 的分级

#### 短期硬约束 (Level 1)

- 核心 Runtime / BoundApi 禁止直接 `console.log`
- 所有调试输出通过 Effect 日志或可插拔 Layer
- 定义简单 Debug 事件流（Action/State 变化）

#### 长期蓝图 (Level 3)

- Inspector / Scope Lock / Replay 保持在 `impl` 或 Topics 草稿
- 标记为"v3.x+ 目标设计"
- 规范聚焦"边界"（不影响业务语义、不破坏性能）

### 3.4 React & Test 规范强度

**引入层级标记**：

- **Level 1**: 必须遵守的行为边界
  - React: 避免 tearing，Runtime 引用稳定
  - Test: 不依赖外部全局状态

- **Level 2**: 推荐 API 形状（允许微调）
  - `useModule` / `useSelector` / `useDispatch`
  - `TestProgram` + `runTest`

- **Level 3**: 长期能力
  - 完整 trace / 可视化集成

---

## 四、Runtime 适配与扩展能力

### 4.1 设计目标

- 为"自定义 ModuleRuntime"提供推荐路径
- 支持远程 Store / 测试 Runtime / 特殊平台持久化
- 提供中间层抽象，避免从零实现完整接口

### 4.2 Adapter 形态

```typescript
interface RuntimeAdapter<S, A> {
  getState: Effect.Effect<S>
  setState?: (s: S) => Effect.Effect<void>
  actions$: Stream.Stream<A>
  changes$?: Stream.Stream<S>
}

namespace ModuleRuntime {
  export function fromAdapter<S, A>(
    adapter: RuntimeAdapter<S, A>,
  ): Logix.ModuleRuntime<S, A> {
    // 实现在 runtime-logix/impl
  }
}
```

**设计意图**：

- 适配作者关注"如何从外部系统读/写状态、监听 action/state 流"
- `fromAdapter` 补齐其余能力：
  - 若只提供 `actions$`，封装 `dispatch`
  - 若只提供 `changes$`，叠加 `distinctUntilChanged`、selector 投影
  - `ref()` 统一基于 `SubscriptionRef` 封装

### 4.3 使用路径

#### 标准本地 Store

```typescript
const MyModule = Logix.Module.make('MyModule', { state, actions })
const MyLogic = MyModule.logic(($) => ...)
const MyLive = MyModule.live(initial, MyLogic)

Logix.app({
  layer: ServiceLayer,
  modules: [Logix.provide(MyModule, MyLive)]
})
```

#### 自定义 Runtime / 远程 Store

```typescript
const adapter: RuntimeAdapter<State, Action> = {
  getState: Effect.gen(function*() {
    const client = yield* RemoteStoreClient
    return yield* client.getState()
  }),
  actions$: remoteActionsStream,
  // ...
}

const customRuntime = ModuleRuntime.fromAdapter(adapter)

Logix.app({
  layer: ServiceLayer,
  modules: [Logix.provide(MyModule, customRuntime)]
})
```

业务 Logic 仍通过 `Module.logic(($) => ...)` 编排，不感知底层差异。

### 4.4 与业务开发者的边界

**引擎/适配层 API（不出现在业务文档）**:
- `ModuleRuntime`
- `RuntimeAdapter`
- `fromAdapter`

**业务开发者只需要**:
- 定义 Module: `Logix.Module`
- 编写 Logic: `Module.logic(($)=>...)`
- 使用运行时: `Module.live` / `Logix.app` / React Adapter
- 特殊 Runtime 由平台/适配团队提供封装（对业务透明）

---

## 五、综合路线图

### 阶段 1: 立即改进 (v3.1)

- [ ] 重命名 `Logic.secure` → `Logic.instrument`
- [ ] 剥离错误处理逻辑
- [ ] 更新规范：区分 `ModuleRuntime` 硬边界与软建议
- [ ] 禁止核心代码直接 `console.log`

### 阶段 2: FiberRef 上下文 (v3.2)

- [ ] 实现 `LogicContext` FiberRef
- [ ] 验证并发算子下的 Context 传播
- [ ] 提供简单 Debug 事件流

### 阶段 3: Adapter 能力 (v3.3)

- [ ] 实现 `ModuleRuntime.fromAdapter`
- [ ] 补充远程 Store / 测试 Runtime 示例
- [ ] 更新文档：自定义 Runtime 设计指南

### 阶段 4: Supervisor 实现 (v4.0)

- [ ] 实现 `LogixSupervisor` 并通过 Layer 注入
- [ ] 移除 DSL 中的显式 `Logic.instrument`
- [ ] 配套 DevTools / 调试模式

### 阶段 5: 长期蓝图 (v4.x+)

- [ ] Inspector / Scope Lock / Replay
- [ ] 完整 OpenTelemetry 集成
- [ ] 可视化 Trace 工具

---

## 六、待决问题

### 观测性方向

- [ ] Supervisor 与 Middleware 的职责边界如何划分？
- [ ] 如何在多实例场景下避免 Trace 混淆？
- [ ] SSR 环境下的观测策略？

### 规范边界

- [ ] React / Test 规范的 Level 1/2/3 如何在文档中清晰标记？
- [ ] 是否需要为"规范偏差"建立专门的 ADR 流程？

### Adapter 扩展

- [ ] Adapter 接口的最小形状是否足够？
- [ ] 是否需要为"只读 Runtime"提供单独标记？
- [ ] `ModuleRuntime.fromAdapter` 应放在哪个包？
  - `@logix/core`
  - `@logix/runtime-ext`
- [ ] 是否需要在 Intent/Universe 视角标记"非标准 Runtime"？

---

## 七、相关文档

- [runtime-logix/core/05-runtime-implementation.md](../../runtime-logix/core/05-runtime-implementation.md)
- [runtime-logix/core/07-react-integration.md](../../runtime-logix/core/07-react-integration.md)
- [runtime-logix/core/09-debugging.md](../../runtime-logix/core/09-debugging.md)

---

**版本历史**:

- v0.2.0 (2025-12-02): 合并三篇 L9 草稿，形成统一演进路线图
- v0.1.0 (2025-11-30): 各单篇草稿独立版本
