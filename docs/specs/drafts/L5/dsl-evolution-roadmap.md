---
title: Logix DSL 与语法糖演进路线（合并草稿）
status: draft
version: 0.2.0
supersedes:
  - ../L9/logix-sugar-possibilities.md
  - ../L9/logic-for-shape-env-first-roadmap.md
related: []
---

# Logix DSL 与语法糖演进路线

**目标**: 整合 Sugar 可能性愿景与 Env-First API 设计，形成统一的 DSL 演进方向。

---

## 一、背景与动机

### 1.1 两个演进方向

1. **元编程与语法糖** (`logix-sugar-possibilities`)
   - 基于 Schema Metadata + Runtime Capabilities 的元编程模式
   - 覆盖持久化、校验、权限、埋点等横切关注点
   - 目标：极致 DX，零样板代码

2. **Env-First API 形态** (`Logic.forShape`)
   - 从 Runtime-First 演进到 Env-First
   - `Module.logic(($)=>...)` vs `Logic.forShape<Sh,R>()`
   - 目标：更好的模块化与依赖注入

### 1.2 共同愿景

**在保持 Logix 核心简单纯粹的同时，为常见模式提供优雅的语法糖和抽象。**

---

## 二、元编程模式与 Sugar Roadmap

### 2.1 设计理念

基于 **"Schema Metadata (蓝图) + Runtime Capabilities (执行力)"** 的元编程模式：

- **Data**: Schema Annotations (定义数据的形状与能力)
- **Behavior**: Action Decorators (定义行为的策略)
- **Flow**: Logic Enhancers (定义流程的生命周期与上下文)

### 2.2 Schema 层语法糖

#### 持久化与同步

```typescript
// LocalStorage 同步
theme: Schema.String.pipe(Schema.LocalStorage('app-theme'))
// 蓝图：标记字段需要同步到 LocalStorage
// 运行时：Init 从 LS 读取初始值；Watch 监听变化 → Debounce → 写入 LS

// URL Sync
search: Schema.String.pipe(Schema.UrlSync('q'))
// 蓝图：字段与 URL Query Param 双向绑定
// 运行时：Init 解析 URL；Watch 字段变化 → replaceState；Listen popstate → 更新字段
```

#### 历史记录

```typescript
canvas: CanvasSchema.pipe(Schema.TrackHistory)
// 蓝图：标记该字段支持撤销重做
// 运行时：自动维护 HistoryStack (Past/Future)，暴露 undo()/redo() Action
```

#### 网络交互

```typescript
// 乐观更新
likeCount: Schema.Number.pipe(Schema.Optimistic(api.like))
// 蓝图：标记为"乐观的"
// 运行时：1. 立即应用变更到 UI；2. 后台执行 MutationFn；3. 失败自动回滚

// 轮询
status: Schema.Loadable.pipe(Schema.Polling(5000))
// 蓝图：标记需要轮询
// 运行时：自动挂载定时器，定期触发 reload
```

#### 验证与约束

```typescript
// 异步校验
username: Schema.String.pipe(
  Schema.AsyncValidate(async (val) => checkUniqueness(val))
)
// 蓝图：标记字段需要异步校验
// 运行时：监听输入 → Debounce → 执行校验 → 写入 field.error

// 跨字段约束
confirmPassword: Schema.String.pipe(
  Schema.CrossValidate('password', (confirm, pwd) => confirm === pwd)
)
// 蓝图：定义跨字段约束
// 运行时：监听两个字段变化，自动触发校验
```

#### 埋点与分析

```typescript
tabIndex: Schema.Number.pipe(Schema.TrackChange('tab_switch'))
// 蓝图：标记字段变化时上报埋点
// 运行时：监听变化 → 过滤(去重/采样) → 调用 Analytics Service
```

#### 权限控制

```typescript
salary: Schema.Number.pipe(Schema.Guard('admin'))
// 蓝图：标记该字段需要特定权限
// 运行时：Action 拦截 dispatch；State 读取时脱敏或返回空
```

### 2.3 Action 层语法糖

```typescript
// 防抖
searchAction: Action.Debounce(300)
// 蓝图：标记该 Action 需要防抖
// 运行时：自动拦截 dispatch，应用防抖策略

// 重试
fetchAction: Action.Retry(3)
// 蓝图：标记失败后自动重试

// 日志
submitAction: Action.Log({ format: 'verbose' })
// 蓝图：自动打印日志
```

### 2.4 Logic 层语法糖

```typescript
// 单次执行
InitLogic: Logic.RunOnce
// 蓝图：标记该 Logic 在 Module 生命周期内只运行一次

// 后台执行
HeavyComputeLogic: Logic.OnBackground
// 蓝图：标记该 Logic 在 Web Worker 或后台线程运行
```

### 2.5 Module 层语法糖

```typescript
Logix.Module.make('User', {
  meta: { persist: true, role: 'admin' },
  state: ...
})
// 或
Logix.Module.make('User', { ... }).pipe(
  Module.annotate({ author: 'Yoyo' })
)

Logic 也支持 Annotation：
UserModule.logic(($) => ...).pipe(
  Logic.annotate({
    runOnce: true,
    debounce: 300
  })
)
```

### 2.6 实现机制：Annotatable 接口

将 `Module` 和 `Logic` 设计为实现了 `Annotatable` 接口的对象（类似 Effect）。
Runtime 在加载 Module/Logic 时读取 Metadata，据此调整执行策略。

### 2.7 原则与边界

**防止滥用的三大原则**：

1. **适用范围 (Scope)**
   - ✅ 适合：持久化、日志、权限、防抖、重试、Undo/Redo（横切关注点）
   - ❌ 不适合：具体业务逻辑（如"订单金额大于 100 则打折"）

2. **显式优于隐式 (Explicit over Implicit)**
   - ✅ Good: `Schema.Loadable` (明确声明异步容器)
   - ❌ Bad: `Schema.String.pipe(Schema.AutoFetch('/api/user'))` (隐藏网络请求)

3. **可逃逸原则 (Escape Hatch)**
   - 语法糖永远只是"捷径"，不是"唯一路径"
   - 任何 Annotation 实现的功能都可通过手写 Logic 实现
   - 复杂需求可平滑退回显式编程模式

### 2.8 工程化维度：本地 Codegen / Typegen

在上述元编程与语法糖之上，v3 需要承认第三个现实维度：**工程化工具链**。  
核心共识：

- **元信息只存在于 Schema / Metadata**（包含 CapabilityMeta、字段级 annotations 等）；  
- 真正“把蓝图变成代码/行为”的过程，可以发生在两处：
  - Runtime：`Module.live` / Runtime Core 扫描元数据并调用 Helper Factory（Query / Reactive / Link / Capability Plugin 等）；  
  - Build-Time：本地 generator（CLI / Vite 插件）扫描同一份元数据，生成普通 TS 代码和 `.d.ts`（例如 `L9/logix-state-first-module-codegen.md` 提出的 State-First Module Codegen）。

这意味着：DSL 与语法糖在设计时应尽量统一到「Schema Metadata + Helper」模型上，**工程化辅助只是一种额外的编译路径**，而不是另一套魔法 API。所有 Sugar 最终都应可用“Runtime 编译”或“Build-Time 编译”二选一地落地，而不会引入第三种语义。

---

## 三、Env-First API 演进

### 3.1 当前共识 (v3 PoC)

**业务代码**：
- 统一入口：`SomeModule.logic(($)=>Effect.gen(...))`
- `$` 语义由 `BoundApi` 定义（state/actions/flow/match/use/lifecycle/on*）
- `Logic.forShape` 记号仅作为"针对某个 Shape/Env 的 `$` 缩写"，不对应实际实现

**Pattern / 库作者**：
- 推荐形态：`( $: Logix.BoundApi<Sh,R> ) => Logic.Of<Sh,R,...>`
- 调用方通过 `Module.logic(($)=>pattern($))` 负责绑定 Module 与 Env
- Pattern 不直接依赖 `Logic.RuntimeTag` / `ModuleRuntime`

**平台 / 图谱 / LLM**：
- 以 `Module.logic(($)=>...)` 作为静态锚点，利于构建 Logic Graph
- `Logic.forShape` 只作为概念性语法糖，不增加新图谱节点类型

### 3.2 Env-First 潜在形态（设想）

若未来需要真正实现 `Logic.forShape`：

#### 1. Env 语义收紧

```typescript
Logic.Env<Sh,R> = Logix.ModuleTag<Sh> | Logic.Platform | R

// Module.live 内部通过 Effect.provideService(Logic.RuntimeTag, runtime)
// 将当前模块 Runtime 注入 Env
```

#### 2. BoundApi/Flow Env-First 变体

```typescript
// 基于 Logic.RuntimeTag 取 Runtime 版本
BoundApi.forShape<Sh,R>()
Flow.forShape<Sh,R>()

// 实现上从 Logic.Env<Sh,R> 中解析 ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
```

#### 3. Logic.forShape 作为工厂

```typescript
Logic.forShape<Sh,R>(): BoundApi<Sh,R>

// 要求调用点运行在 Logic.Env<Sh,R> 上，否则运行时 fail/die
// 文档中现有示例可以从"概念缩写"升级为可运行写法
```

#### 4. 与 Module.logic 的关系

- 业务层继续推荐使用 `Module.logic(($)=>...)`
- `Logic.forShape` 服务于：
  - Pattern / Namespace 内部提前"绑形状，不绑具体 Module"
  - 极端拆分场景下，多个文件共享相同 Shape 的 `$` 约束

### 3.3 边界关系（开放问题）

- [ ] Env-First 与 Runtime-First 两条路径是否需要在实现上合并？
  - 可能：`Module.logic(($)=>...)` 内部本身就运行在 `Logic.Env<Sh,R>` 上
- [ ] Pattern 是否仍然首选 `( $: BoundApi<Sh,R> ) => Logic.Of<Sh,R,...>` 形态？
  - 倾向保持不变：Pattern 持续依赖 `$`，而不是直接依赖 `Logic.forShape`
- [ ] 是否存在"**只有 Env-First forShape 才能优雅解决**"的真实场景?
  - 需要从现有 PoC (Form / Matrix / Flow Orchestration) 中反向挖掘

### 3.4 命名探索

比 `forShape` 更直观的可能命名：
- `Logic.env<Sh,R>()`
- `Logic.$<Sh,R>()`
- `Logic.bound<Sh,R>()`

---

## 四、Sugar 与 Env-First 的结合点

### 4.1 Annotation + Env-First

元编程的 Annotation 机制与 Env-First API 是正交的：

```typescript
// Env-First + Annotation
const $ = Logic.forShape<Shape, Env>()

const MyLogic = Effect.gen(function*() {
  yield* $.flow.fromState(...)
}).pipe(
  Logic.annotate({ debounce: 300, runOnce: true })
)
```

### 4.2 Schema Sugar + Env-First Runtime

Schema 层的 Sugar (如 `Schema.LocalStorage`) 本质上是生成 ModuleLogic：

```typescript
// Schema 定义
state: Schema.Struct({
  theme: Schema.String.pipe(Schema.LocalStorage('app-theme'))
})

// Module.live 装配时：
// 1. 扫描 Schema, 识别 LocalStorage Annotation
// 2. 自动生成一段 ModuleLogic: 监听 theme 变化 → 写入 LS
// 3. Env-First 或 Runtime-First 都可以支持这个 Logic
```

### 4.3 统一愿景

**Sugar 是 API 表层，Env-First 是底层架构。两者相辅相成：**

- Sugar 让常见模式更简洁
- Env-First 让架构更灵活、可测试
- 最终都收敛到 `ModuleLogic` / `BoundApi`

---

## 五、综合路线图

### 阶段 1: 核心 API 稳定 (v3.x Current)

- [x] 保持 `Module.logic(($)=>...)` 作为主入口
- [x] `Logic.forShape` 仅作为文档中的概念缩写
- [x] 增强 IntentBuilder handler 上下文：引入 `IntentContext<Sh, Payload>` 与 `runWithContext` 作为核心 DSL 能力（`withContext().run` 视为可选语法糖）
- [ ] 补充 Pattern 形态的最佳实践文档

### 阶段 2: 基础 Sugar 实现 (v3.x+)

- [ ] 实现 `Schema.LocalStorage` / `Schema.UrlSync`
- [ ] 实现 `Schema.Loadable` + `Query.field` (见 query-integration topic)
- [ ] 补充 Annotation 机制的基础设施

### 阶段 3: Env-First 探索 (v4.0)

- [ ] 从真实 PoC 场景中挖掘 Env-First 必要性
- [ ] 若有必要，实现 `Logic.forShape` 工厂
- [ ] 与 Module.logic 双轨共存，观察使用偏好

### 阶段 4: 高级 Sugar 扩展 (v4.x+)

- [ ] Action Decorators: Debounce / Retry / Log
- [ ] Logic Enhancers: RunOnce / OnBackground
- [ ] Module Meta: 整模块持久化 / 权限

### 阶段 5: 元编程成熟 (v5.0+)

- [ ] 完整 Annotatable 接口
- [ ] Runtime 自动识别 Metadata 并调整执行策略
- [ ] 配套 DevTools 可视化 Annotations

---

## 六、原则与约束

### 设计原则

1. **业务层 API 优先稳定**: `Module.logic` 作为锚点不轻易变更
2. **Sugar 是可选层**: 所有 Sugar 都可平滑退回手写 Logic
3. **Env-First 是架构选项**: 对业务透明，由 Pattern 作者决定是否使用
4. **显式优于隐式**: 副作用必须可见，避免黑魔法

### 技术约束

1. **类型安全**: 所有 Sugar 必须保持强类型推导
2. **性能无损**: Annotation 在未启用时零开销
3. **可测试性**: Env-First 和 Sugar 都必须易于测试
4. **平台可解析**: Sugar 生成的 Logic 必须能被平台静态分析

---

## 七、待决问题

### Sugar 方向

- [ ] 哪些 Sugar 属于 Level 1 (必须实现) / Level 2 (推荐) / Level 3 (蓝图)？
- [ ] Schema Sugar 与 Reactive Module (见 query-integration) 如何融合？
- [ ] Annotation 机制是否需要完整的 Type-Level Metadata？

### Env-First 方向

- [ ] 是否真的存在"非 Env-First 不可"的场景？
- [ ] `Logic.forShape` 的命名与学习曲线如何优化？
- [ ] 与平台静态分析的兼容性如何保证？

### 整合方向

- [ ] Sugar + Env-First 的组合是否会导致复杂度爆炸？
- [ ] 如何在文档中清晰区分"基础 API" / "Sugar" / "高级架构"层次？

---

## 八、相关文档

- [runtime-logix/core/02-module-and-logic-api.md](../../runtime-logix/core/02-module-and-logic-api.md)
- [runtime-logix/core/03-logic-and-flow.md](../../runtime-logix/core/03-logic-and-flow.md)
- [topics/query-integration/](../topics/query-integration/) (Query.field 与 Reactive Schema)

---

**版本历史**:

- v0.2.0 (2025-12-02): 合并 Sugar 可能性与 Env-First 路线，形成统一 DSL 演进图
- v0.1.0 (2025-11-30): 各单篇草稿独立版本
