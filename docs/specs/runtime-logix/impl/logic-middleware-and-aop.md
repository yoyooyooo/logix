# Logic Middleware & EffectOp 总线实现备忘

> **Status**: Implementation Notes (v3 Canonical)
> **Scope**: 运行时横切能力的统一挂载点（EffectOp Middleware 总线）与“局部策略标注”的落地约束。

早期草案曾探索过 `Logic.instrument` / `Logic.Secured`（品牌类型 + Lint）来强制业务代码显式包裹中间件。
该路线在当前实现中已废弃，原因很直接：**只要存在任何绕过点，就无法保证全局守卫/审计的正确性**。

当前 v3 的单一完美点是：把所有“会执行的边界操作”统一提升为 `EffectOp`，并强制进入同一条 `MiddlewareStack`。

规范性描述以 `core/04-logic-middleware.md` 为准；本文只记录实现落点与防呆约束。

---

## 1. EffectOp：唯一的边界执行模型

实现侧的关键点：

- `EffectOp` 表示一次“可观测边界”的 Effect 执行：`kind / name / payload / meta / effect`。
- Runtime 在执行前**自动补齐**关键 meta：
  - `moduleId` / `runtimeId` / `runtimeLabel` / `txnId` / `linkId` 等。
- `linkId` 以 FiberRef 承载：
  - 边界起点创建；
  - 嵌套操作复用；
  - 用于把一次用户输入引发的多步边界操作串成链路（Action → State → Trait → Service...）。

代码落点（实现侧事实源）：

- `packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（`runOperation`：统一入口）

---

## 2. MiddlewareStack：统一的横切挂载点

### 2.1 Middleware 类型与组合语义

```ts
type Middleware = <A, E, R>(
  op: EffectOp<A, E, R>,
) => Effect.Effect<A, E | OperationRejected, R>

type MiddlewareStack = ReadonlyArray<Middleware>

// 按「声明顺序从外到内」组合：mw1 -> mw2 -> effect -> mw2 -> mw1
function composeMiddleware(stack: MiddlewareStack): Middleware
```

约束：

- Middleware 不应改变成功值语义（A），但允许作为 Guard 在错误通道返回 `OperationRejected`；
- 纯观测类能力（Observer）不得改变业务结果，只能追加观测副作用。

### 2.2 Runtime 注入点（单一事实源）

Runtime 构造时把 `middleware` 注入 Env（一次性）：

- `Runtime.make(rootImpl, { middleware })` → 注入 `EffectOpMiddlewareTag`
- 所有运行时代码（Flow / Trait / Query / Devtools 等）都通过 Env 读取同一份 `MiddlewareStack`

这样可以保证：

- 应用只在一个地方决定“当前 Runtime 使用哪些中间件”；
- 运行时代码不再自建第二套 ad-hoc 执行入口。

---

## 3. Guard 拒绝：OperationRejected（显式失败 + 无副作用）

实现侧约束：

- Guard 拒绝必须发生在用户 `op.effect` 执行前；
- 拒绝对调用方表现为**显式失败**（Error 通道），且不产生任何业务副作用；
- 拒绝应尽可能携带 `kind/name/linkId` 等信息，便于 Devtools 与日志定位。

公共辅助（便于业务/测试构造一致的拒绝错误）：

- `@logix/core/effectop` 导出：
  - `OperationRejected`
  - `makeOperationRejected(...)`

---

## 4. 局部策略标注：只表达意图，不携带规则逻辑

`EffectOp.meta.policy` 当前仅承载局部意图：

- `disableObservers?: boolean`：允许关闭纯观测类能力（例如 DebugObserver）

硬约束：

- 局部策略不得关闭全局守卫；
- “能不能跑”只能由 Guard middleware 决定，且不允许被局部绕过。

---

## 5. DX 视角：显式组合发生在哪一层？

- 业务侧如果需要“按操作差异化策略”（如 tags / trace / 局部观测开关），只需要写入 `EffectOp.meta`（通过 Flow/Bound/Runtime 提供的 options/meta/policy 入口）。
- 横切能力（日志/鉴权/审计/超时/重试/Query/DebugObserver）统一挂在 Runtime 的 `middleware` 上。

这与早期 `Logic.instrument` 方案的差别是：

- 不再要求业务代码“每次调用都显式包裹”；
- 而是要求引擎层“任何边界执行都不可绕过总线”。
