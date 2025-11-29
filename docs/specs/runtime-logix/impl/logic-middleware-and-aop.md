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

// 基础 Middleware 定义
export type Middleware<R = never> = (
  effect: Effect.Effect<any, any, any>,
  meta: LogicMeta
) => Effect.Effect<any, any, any>;
```

> 实现备注
> - 正式实现中，Middleware 更推荐使用 `Logic.Of<Sh, R, A, E>` 等别名，以保留原始 A/E/R 类型信息；
> - 核心语义不变：Middleware 是围绕 Logic Effect 的高阶组合器。

## 2. v3 推荐使用模式：Explicit Composition (Hard Constraint)

为了防止开发者忘记包裹必要的中间件（如鉴权），v3 引入 **Branded Type + Lint** 双重保险机制。

### 2.1 品牌类型与安全入口

在 Runtime 类型定义中引入 `Logic.Secured`：

```ts
declare const Secured: unique symbol

// 只有经过 Logic.secure 处理的 Effect 才有此标记
export type Secured<Sh, R, A, E> =
  Of<Sh, R, A, E> & { readonly [Secured]: true }

export namespace Logic {
  // 唯一合法的“加固”入口
  export function secure<Sh, R, A, E>(
    eff: Of<Sh, R, A, E>,
    meta: LogicMeta,
    ...middlewares: ReadonlyArray<Middleware<Sh, R, A, E>>
  ): Secured<Sh, R, A, E> {
    const composed = compose(...middlewares)(eff, meta)
    return composed as Secured<Sh, R, A, E>
  }
}
```

修改 `$Module.flow.run` 签名，强制要求 `Logic.Secured`：

```ts
interface FlowApi<Sh, R> {
  // 只接受 Logic.Secured，裸 Effect 会报错
  run<A, E>(eff: Logic.Secured<Sh, R, A, E>): Of<Sh, R, void, never>
}
```

### 2.2 ESLint 规则兜底

即使类型系统被 `as any` 绕过，CI/CD 必须包含一条 ESLint 规则（如 `runtime-logix/require-secure-middleware`）：

- **规则逻辑**：扫描所有 `$X.flow.run(...)` 调用；
- **要求**：参数必须是 `Logic.secure(...)` 调用表达式；
- **例外**：仅允许带有 `// logic:allow-raw` 注释的代码（用于 PoC 或特殊底层逻辑）。

### 2.3 示例代码

```ts
const Logging: Logic.Middleware<Env> = /* ... */
const AuthGuard: Logic.Middleware<Env> = /* ... */

export const AdminLogic: Logic.Of<UserShape, Env> = Effect.gen(function* () {
  // ...
  const deleteEffect = /* ... */

  yield* delete$.pipe(
    $User.flow.run(
      // 必须使用 Logic.secure 包裹，否则编译报错 + Lint 报错
      Logic.secure(deleteEffect, {
          name: 'deleteUser',
          storeId: 'UserStore',
          tags: ['audit', 'auth'],
        },
        Logging,
        AuthGuard
      ),
    ),
  )
})
```

## 3. Logic.compose 与类型保持

为了保证中间件不破坏业务逻辑的类型契约（R/E），`Logic.compose` 必须严格类型化。

### 3.1 FxMiddleware 定义

只允许对同一个 `Fx<Sh, R, A, E>` 做自同态转换（Endomorphism）：

```ts
export type FxMiddleware<Sh, R, A, E> =
  (eff: Fx<Sh, R, A, E>, meta: LogicMeta) => Fx<Sh, R, A, E>
```

### 3.2 严格组合器

```ts
export namespace Logic {
  export function compose<Sh, R, A, E>(
    ...mws: ReadonlyArray<FxMiddleware<Sh, R, A, E>>
  ): FxMiddleware<Sh, R, A, E> {
    return (eff, meta) =>
      mws.reduceRight((acc, mw) => mw(acc, meta), eff)
  }
}
```

**防呆效果**：
- 如果某个中间件试图引入额外的 Env 依赖（不在 R 中），或者抛出未声明的 Error（不在 E 中），TS 编译器会直接报错；
- 确实需要改变 R/E 的“边界中间件”（如错误转换层），必须使用另一套 `AdvancedMiddleware` 接口，且只能在 Runtime 边界使用，不能混入普通业务链。

## 4. ModuleDef.middlewares 的角色

在 v3 设计中，`ModuleDef.middlewares` **主要服务于平台与代码生成器**，Runtime 不自动使用它。

使用方式（设计时）：

- 平台 UI / 配置文件中可以为某个模块勾选“启用日志 / 启用鉴权”；
- 出码器读取 `middlewares` 列表，在生成 Logic 代码时自动插入 `Logic.secure(..., [Logging, AuthGuard])`。

Runtime 不做：

- 不会在 Logic 构造过程中自动读取 ModuleDef.middlewares；
- 不会有全局 Middleware Registry 自动分发中间件。

## 5. Codegen vs Runtime：失同步风险与防护

由于 v3 依赖 Codegen 显式插入中间件，最大的风险是 **Codegen 结果与 ModuleDef 配置不一致**。

### 5.1 风险场景
- 开发者修改了 `ModuleDef.middlewares`（如加了 Auth），但忘记运行 Codegen，导致生成的 Logic 代码里没有 AuthGuard；
- 开发者手动修改了 Logic 代码，删掉了 `Logic.secure` 里的 AuthGuard。

### 5.2 防护策略 (Foolproof)

1. **CI 强制检查**：
   - CI 流程中必须包含 `pnpm codegen --check` 步骤；
   - 该步骤会根据当前的 ModuleDef 重新生成内存中的代码，并与磁盘上的文件比对；
   - 若有差异（说明配置改了没生成，或手改了生成代码），CI 直接失败。

2. **平台侧提示**：
   - 平台 UI 在保存 ModuleDef 时，应自动触发本地 Codegen；
   - 若检测到本地有未提交的 Codegen 变更，UI 应高亮提示“代码与配置不同步”。

3. **Runtime 辅助检查 (Optional)**：
   - 在开发模式下，Runtime 可以读取 `ModuleDef.middlewares`，并尝试检查 LogicMeta 中的 tags 是否包含了预期的中间件标记（如果中间件会在 meta 上打标的话）；
   - 若发现不一致，打印 Warning。

## 6. 平台与 Runtime 的职责边界

总结 v3 对 Middleware/AOP 的分工：

- **Runtime**：
  - 提供 `Logic.Meta`、`Middleware`、`Logic.secure` 等基础拼装工具；
  - **不**主动解析 ModuleDef.middlewares，**不**自动注入。

- **平台 / 生成器**：
  - 负责读取 ModuleDef.middlewares 与代码中的 Middleware 定义；
  - 在生成 Logic 代码时插入 `Logic.secure(...)` 显式调用；
  - 负责 CI/CD 阶段的一致性检查。

这种分工既保留了 Effect‑Native 的运行时简单性，又保证了平台层足够的表达力与配置化空间，同时通过 Branded Type 和 CI Check 封堵了人为疏漏的风险。
