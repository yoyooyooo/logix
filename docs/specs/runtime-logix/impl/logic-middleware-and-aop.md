# Logic Middleware & AOP 实现草图

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: Logic Middleware（日志/鉴权/埋点等横切关注）在 v3 中的推荐实现方式与限制。

本说明文档从运行时实现视角，整理 v3 版本下 Logic Middleware / AOP 的落地方式。  
核心取向：

- 保持 **Effect‑Native**：中间件本质是 `(Effect) => Effect` 的组合，不引入 Decorator 或运行时反射；
- 区分 **设计时（Design‑time）** 与 **运行时（Runtime）** 的职责：  
  - v3 更倾向于通过平台/生成器在代码中显式插入 Middleware 调用；  
  - Runtime 核心不做复杂的“自动注入”，避免隐式耦合；
- 为 v4 可能的“运行时 Middleware Registry”留出思考空间，但不在 v3 实现。

## 1. 类型回顾：LogicMeta / Middleware

在 core 规范中，我们定义了：

```ts
export interface LogicMeta {
  readonly name: string      // 逻辑名称 (e.g. "submitOrder")
  readonly storeId?: string  // 所属 Store ID
  readonly action?: unknown  // 触发该逻辑的 Action (如有)
  readonly tags?: string[]   // 自定义标签 (e.g. ["audit", "auth"])
}

// 简化示意版本
export type Middleware<R = never> = (
  effect: Effect.Effect<any, any, any>,
  meta: LogicMeta
) => Effect.Effect<any, any, any>;
```

> 实现备注  
> - 正式实现中，Middleware 更推荐使用 `Logic.Fx<Sh, R, A, E>` 等别名，以保留原始 A/E/R 类型信息；  
> - 核心语义不变：Middleware 是围绕 Logic Effect 的高阶组合器。

## 2. v3 推荐使用模式

### 2.1 Logic 内部显式组合

这是 v3 的“黄金范式”，不依赖 runtime 自动注入：

```ts
const Logging: Middleware<Env> = (next, meta) =>
  next.pipe(
    Effect.tap(() => Logger.info(`[${meta.storeId}] ${meta.name} start`)),
    Effect.tapError((e) => Logger.error(`[${meta.storeId}] ${meta.name} fail`, e)),
  )

const AuthGuard: Middleware<Env> = (next, meta) =>
  Effect.gen(function* () {
    const user = yield* UserService
    if (!user.isAdmin) {
      return yield* Effect.fail<never, AuthError>({
        _tag: 'AuthError',
        reason: 'AdminOnly',
        meta,
      })
    }
    return yield* next
  })

const $User = Logic.forShape<UserShape, Env>()

export const AdminLogic = Logic.make<UserShape, Env>(
  Effect.gen(function* () {
    const delete$ = $User.flow.fromAction(
      (a): a is { _tag: 'user/delete'; id: string } => a._tag === 'user/delete',
    )

    const deleteEffect = Effect.gen(function* () {
      const svc = yield* UserService
      // ...
    })

    const secure = Logic.compose(Logging, AuthGuard)

    yield* delete$.pipe(
      $User.flow.run(
        secure(deleteEffect, {
          name: 'deleteUser',
          storeId: 'UserStore',
          tags: ['audit', 'auth'],
        }),
      ),
    )
  }),
)
```

特点：

- **显式性**：中间件链清晰可见，便于审查与调试；  
- **可解析性**：平台可以识别 `Logic.compose(...)` + `secure(effect, meta)` 这类固定 pattern，将其还原为节点上的“开启日志/开启鉴权”开关；  
- **无运行时魔法**：Runtime 不需要知道 ModuleDef.middlewares 的存在，也不需要动态拼接中间件。

### 2.2 ModuleDef.middlewares 的角色

在 v3 设计中，`ModuleDef<R>.middlewares` **主要服务于平台与代码生成**，Runtime 不自动使用它：

```ts
export interface ModuleDef<R> {
  // ...
  readonly middlewares?: ReadonlyArray<Logic.Middleware<R>>;
}
```

使用方式（设计时）：

- 平台 UI / 配置文件中可以为某个模块勾选“启用日志 / 启用鉴权”；  
- 出码器读取 `middlewares` 列表，在生成 Logic 代码时：  
  - 自动插入 `const secure = Logic.compose(Logging, AuthGuard)`；  
  - 自动用 `secure(effect, meta)` 包裹实际业务 Effect。

Runtime 不做：

- 不会在 `Logic.make` 内自动读取 ModuleDef.middlewares；  
- 不会有全局 Middleware Registry 自动分发中间件。

选择原因：

- 把复杂度留在 **生成阶段**，便于观测与调试；  
- 避免在 Runtime 执行路径内引入隐式依赖（难以测试和静态分析）。

## 3. Logic.compose 与类型保持

`Logic.compose` 的实现可以是一个简单的函数组合器：

```ts
export namespace Logic {
  export function compose<R>(
    ...middlewares: ReadonlyArray<Middleware<R>>
  ): Middleware<R> {
    return (eff, meta) =>
      middlewares.reduceRight(
        (acc, mw) => mw(acc, meta),
        eff,
      )
  }
}
```

类型细化（推荐实现时参考）：

```ts
export type Fx<Sh extends Store.Shape<any, any>, R, A, E> =
  Effect.Effect<A, E, Logic.Env<Sh, R>>

export type FxMiddleware<
  Sh extends Store.Shape<any, any>,
  R = never,
  A = any,
  E = any,
> = (eff: Fx<Sh, R, A, E>, meta: LogicMeta) => Fx<Sh, R, A, E>
```

Runtime 实现可以同时保留：

- 一个通用的 `Middleware<R>`（以 `Effect.Effect<any, any, any>` 为核心），方便组合不同 Store 的简单中间件；  
- 一个泛型化的 `FxMiddleware<Sh, R, A, E>`，用于需要精确控制类型的场景。

## 4. 潜在的 Runtime 自动注入方案（v4 备忘）

若未来希望 Runtime 自动根据 ModuleDef.middlewares 注入中间件，可考虑以下设计（**v3 不实现，仅备忘**）：

### 4.1 MiddlewareRegistry Service

定义一个 `MiddlewareRegistry` Service，将 ModuleDef.middlewares 抽象为运行时可查询的结构：

```ts
interface MiddlewareRegistry {
  // 按 storeId 或 groupId 查询中间件列表
  getMiddlewares: (ctx: { storeId?: string; groupId?: string }) =>
    ReadonlyArray<Middleware<any>>;
}

class MiddlewareRegistryTag extends Context.Tag(
  'MiddlewareRegistry',
)<MiddlewareRegistryTag, MiddlewareRegistry>() {}
```

`buildModule` 在构建 Layer 时：

- 根据 ModuleDef.id / Store 标识，构造 Registry 实例；  
- 通过 `Layer.succeed(MiddlewareRegistryTag, registry)` 注入 Env。

### 4.2 Logic.make 中自动套用中间件

在 `Logic.make` 实现中（runtime 层），增加一个 hook：

```ts
export function make<Sh extends Store.Shape<any, any>, R, A, E>(
  eff: Fx<Sh, R, A, E>,
  meta: LogicMeta,
): Fx<Sh, R, A, E> {
  return Effect.gen(function* () {
    const registry = yield* MiddlewareRegistryTag
    const mws = registry.getMiddlewares({ storeId: meta.storeId })
    const composed = mws.reduceRight(
      (acc, mw) => mw(acc, meta),
      eff,
    )
    return yield* composed
  })
}
```

> 风险提示  
> - 会把 ModuleDef 与 Logic 执行链隐式耦合在一起，增加调试与测试成本；  
> - 对平台/出码器来说，必须保证 `meta.storeId` 等信息在 Logic.make 时始终准确可用。

鉴于这些复杂性，v3 决定不实现自动注入，仅在生成阶段显式插入 Middleware 调用。

## 5. 平台与 Runtime 的职责边界

总结 v3 对 Middleware/AOP 的分工：

- **Runtime**：
  - 提供 `Logic.Meta`、`Middleware`、`Logic.compose` 等基础拼装工具；  
  - 不主动解析 ModuleDef.middlewares，不自动注入。

- **平台 / 生成器**：
  - 负责读取 ModuleDef.middlewares 与代码中的 Middleware 定义；  
  - 在生成 Logic 代码时插入 `Logic.compose(...)` 与 `secure(effect, meta)` 等显式调用；  
  - 在可视化层（Galaxy / Logic 图）展示哪些 Logic 受哪些中间件影响。

这种分工既保留了 Effect‑Native 的运行时简单性，又保证了平台层足够的表达力与配置化空间。

## 6. 设计权衡补充说明

### 6.1 Codegen 负担 vs. 运行时魔法

由于 v3 决定“不在 Runtime 自动注入中间件”，所有 AOP 生效都必须体现在 TS 代码中：

- 平台或脚手架需要承担较多的 Codegen 工作：  
  - 当在 UI 上勾选/取消“启用日志/鉴权”等能力时，需要修改/生成对应 Logic 文件中的 `Logic.compose(...)` 与 `secure(...)` 调用；  
  - 这使得“代码生成器”从初始化工具变成高频使用的日常工具。

这一点是刻意选择的：

- 优先保证“代码即事实”：任何运行时行为都能在源码中被看到与 gre p 到；  
- 避免出现“配置改了，但代码看不出来”的黑盒行为（典型 NestJS 痛点）。

### 6.2 调试友好性与 StackTrace

显式调用 `Logic.compose` / `secure(effect, meta)` 的另一个好处是：

- 出错时，StackTrace 会明确包含 Middleware 包裹层（例如 Logging/AuthGuard 函数名），方便定位；  
- 开发者可以在 Debugger 中直接在 Middleware 内打断点、查看 `meta` 与 Env，而不需要学习额外的运行时注入机制。

从整体 DX 视角看，这也是选择“显式 AOP 而非自动注入”的重要理由之一。***
