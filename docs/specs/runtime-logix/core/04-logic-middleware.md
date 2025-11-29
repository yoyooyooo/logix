# Logic Middleware & `Logic.secure`

> **Status**: v3.1 Canonical (Core Spec)
> **Scope**: Logic Middleware 的核心定义、`Logic.secure` API 契约与安全模型。

本篇定义了 v3 运行时中用于处理横切关注点（Cross-Cutting Concerns，如鉴权、日志、埋点）的标准机制。

核心设计原则：**Explicit Composition (显式组合)** —— 安全不是“自动发生”的魔法，而是通过类型系统强制要求的显式契约。

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

## 2. 安全模型：`Logic.secure`

为了防止业务逻辑“裸奔”（即忘记挂载必要的鉴权或审计中间件），v3 引入了 **Branded Type** 机制。

### 2.1 `Logic.Secured` (Branded Type)

`Logic.Secured` 是一个带有特殊标记的 Effect 类型。只有通过 `Logic.secure` 包装过的 Effect 才能获得此标记。

```ts
declare const Secured: unique symbol

export type Secured<Sh, R, A, E> =
  Effect.Effect<A, E, Logic.Env<Sh, R>> & { readonly [Secured]: true }
```

### 2.2 `Logic.secure` API

这是获取 `Logic.Secured` 的**唯一合法入口**。

```ts
export namespace Logic {
  export function secure<Sh, R, A, E>(
    effect: Effect.Effect<A, E, Logic.Env<Sh, R>>,
    meta: LogicMeta,
    ...middlewares: Middleware<Sh, R, A, E>[]
  ): Secured<Sh, R, A, E> {
    // 1. 组合所有中间件 (洋葱模型：middlewares[0] 在最外层)
    const composed = middlewares.reduceRight(
      (acc, mw) => mw(acc, meta),
      effect
    )

    // 2. 标记为 Secured
    return composed as Secured<Sh, R, A, E>
  }
}
```

### 2.3 运行时强制

`$.flow.run` 等运行时 API 的签名被设计为**只接受 `Logic.Secured`**：

```ts
interface FlowApi<Sh, R> {
  // 编译错误：类型 'Effect<...>' 缺少属性 '[Secured]'
  run<A, E>(eff: Logic.Secured<Sh, R, A, E>): Effect.Effect<void, never, Logic.Env<Sh, R>>
}
```

这意味着：**你无法运行一个没有被 `Logic.secure` 显式声明过的 Logic。**

---

## 3. 使用示例

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

// 3. 安全组装
yield* $.flow.fromAction("delete").pipe(
  $.flow.run(
    // 必须调用 Logic.secure，否则编译报错
    Logic.secure(
      deleteUser,
      { name: "deleteUser", tags: ["admin"] },
      WithAuth,    // 先鉴权
      WithLogging  // 后日志
    )
  )
)
```

## 4. 为什么不自动注入？

v3 选择 **Explicit Composition** 而非自动注入（如 AOP 框架常见的 `Module.use(Middleware)`），原因如下：

1.  **类型安全**：自动注入往往依赖 `any` 或复杂的类型体操，难以推导中间件对 R/E 的影响。
2.  **可读性**：在代码 review 时，能明确看到一段逻辑经过了哪些处理。
3.  **粒度控制**：不同的 Logic 可能需要不同的中间件组合（例如 `login` 不需要 `AuthGuard`，但 `deleteUser` 需要）。
4.  **Codegen 友好**：平台可以通过静态分析生成 `Logic.secure` 代码，既保留了灵活性，又可以通过工具保证规范性。
