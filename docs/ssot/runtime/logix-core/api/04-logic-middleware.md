# Logic Middleware & EffectOp 中间件总线

> **Status**: Definitive (Core Spec)
> **Scope**: Logic Middleware 的核心定义，以及基于 EffectOp 的中间件总线安全模型。

本篇定义了当前运行时中用于处理横切关注点（Cross-Cutting Concerns，如 鉴权、日志、埋点）的标准机制。

核心设计原则：**Explicit Composition (显式组合)** —— 安全不是“自动发生”的魔法，而是通过统一的 EffectOp 总线与中间件栈显式声明出来。

---

## 1. 核心类型定义

### 1.1 `LogicMeta`

描述一段 Logic 程序的元数据，供中间件消费。

```ts
export interface LogicMeta {
  readonly name: string      // 逻辑名称 (e.g. "submitOrder")
  readonly storeId?: string  // 所属 Store ID
  readonly action?: unknown  // 触发该逻辑的 Action (如有)
  readonly tags?: string[]   // 自定义标签 (e.g. ["audit", "auth"])
  readonly [key: string]: unknown // 允许扩展
}
```

### 1.2 `Logic.Middleware`

中间件本质上是一个 **Endomorphism (自同态)**：它接收一个 Effect，返回一个相同类型签名的 Effect。
这意味着中间件**不应改变**业务逻辑的成功值 (A) 或错误类型 (E)，也不应引入业务层未知的环境依赖 (R)。

```ts
import { Effect } from "effect"

export type Middleware<Sh, R, A, E> = (
  effect: Effect.Effect<A, E, Logic.Env<Sh, R>>,
  meta: LogicMeta
) => Effect.Effect<A, E, Logic.Env<Sh, R>>
```

> **注意**：如果中间件需要注入额外的服务（如 `AuditService`），该服务必须包含在 Logic 的环境 `R` 中，或者由中间件自行 `provide`。

---

## 2. 安全模型：EffectOp 中间件总线

为了防止业务逻辑“裸奔”（即忘记挂载必要的鉴权或审计中间件），运行时通过统一的 EffectOp 总线与 MiddlewareStack 收口所有“边界操作”：

- 每次 Logic/Flow/Action/State/Trait/Devtools 等边界执行，都会在内部被提升为一条 `EffectOp`；
- 所有 EffectOp 都在运行前通过同一条 `MiddlewareStack` 执行（空栈时直通），包括守卫（Guard）与观测（Observer）；
- 运行时在 EffectOp.meta 中补齐 `moduleId/instanceId/txnId/linkId` 等上下文信息，便于中间件做决策与调试。

整体语义：

- 安全约束作用在“每一次边界执行”上，任何入口都不可绕过总线；
- 守卫拒绝（Guard Reject）以 Error 通道表现；推荐返回标准化的 `OperationRejected`（见 `@logixjs/core/EffectOp`），且在用户 Effect 运行前生效，确保“显式失败 + 无副作用”；
- 纯观测类能力（如 DebugObserver）可通过局部策略 `meta.policy.disableObservers` 关闭，但守卫不可被局部关闭。

---

## 3. 使用示例（基于 EffectOp）

```ts
// 1. 定义中间件
const WithLogging: Logic.Middleware<any, any, any, any> = (next, meta) =>
  Effect.log(`[${meta.name}] Start`).pipe(
    Effect.zipRight(next),
    Effect.zipLeft(Effect.log(`[${meta.name}] End`))
  )

const WithAuth: Logic.Middleware<any, any, any, any> = (next, meta) =>
  // 假设 AuthService 在环境 R 中
  AuthService.check(meta.tags).pipe(
    Effect.zipRight(next)
  )

// 2. 业务逻辑
const deleteUser = Effect.gen(function*() {
  // ... 核心业务 ...
})

// 3. 安全组装（通过中间件组合 + EffectOp 总线）：
yield* $.flow.fromAction("delete").pipe(
  $.flow.run((userId) =>
    Effect.gen(function* () {
      const meta: Logic.LogicMeta = {
        name: "deleteUser",
        tags: ["admin"],
      }

      // 先鉴权，再日志，最终执行核心删除逻辑。
      const secured = WithLogging(
        WithAuth(
          deleteUser(userId),
          meta,
        ),
        meta,
      )

      // Runtime 会将本次执行提升为 EffectOp 并交给 MiddlewareStack 处理。
      yield* secured
    }),
  ),
)
```

## 4. 为什么不自动注入？

当前主线选择 **Explicit Composition** 而非自动注入（如 AOP 框架常见的 `Module.use(Middleware)`），原因如下：

1.  **类型安全**：自动注入往往依赖 `any` 或复杂的类型体操，难以推导中间件对 R/E 的影响。
2.  **可读性**：在代码 review 时，能明确看到一段逻辑经过了哪些处理。
3.  **粒度控制**：不同的 Logic 可能需要不同的中间件组合（例如 `login` 不需要 `AuthGuard`，但 `deleteUser` 需要）。
4.  **Codegen 友好**：平台可以通过静态分析生成中间件组合代码，既保留了灵活性，又可以通过工具保证规范性。

---

## 5. 与 EffectOp Middleware 总线的关系（补充说明）

> 本节只做职责边界的补充，EffectOp 总线的实现细节见：
>
> - `../runtime/05-runtime-implementation.md#14-effectop-middlewareenv-与统一中间件总线（补充）`
> - `specs/001-module-traits-runtime/references/effectop-and-middleware.md`

- Logic 层中间件工作在**单段 Logic/Flow** 层面：
  - 入口是某个具体 Effect（如一个提交订单的流程）；
  - 关注的是“这段业务逻辑是否经过鉴权/审计/日志包装”，通常紧贴业务含义（`name/tags` 等）。

- EffectOp MiddlewareStack 工作在**引擎事件**层面：
  - 入口是统一的 `EffectOp` 结构（`kind = "action" | "flow" | "state" | "service" | "lifecycle"` 等）；
  - 关注的是整个 Runtime 的横切策略：日志、监控、限流、Resource/Query 调度、DebugObserver 等；
  - 配置入口在 `RuntimeOptions["middleware"]`，由 `Logix.Runtime.make` 统一注入。

两者可以叠加使用：

- 在 Logic 编写处，通过组合 Logic Middleware 保证“关键链路”显式挂上所需守卫（鉴权、审计、行为级埋点等）；
- 在 Runtime 层，通过 EffectOp MiddlewareStack 确保所有 Action/Flow/State/Service/Lifecycle 事件都在同一条总线上可观测、可调优。

**通俗记忆**：

- 想约束“这段逻辑必须经过哪些保护” → 用 Logic 层中间件组合；
- 想统一“整个应用里所有边界事件如何被观测/调度” → 用 Runtime 级 `middleware`（EffectOp 总线）。
