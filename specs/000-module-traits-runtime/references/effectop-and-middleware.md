# Reference: EffectOp 总线与 Middleware 集成

> 作用：细化 EffectOp 类型与 Middleware 总线设计，以及 StateTrait.install 与总线之间的接缝。  
> 对应 spec：FR-007~FR-010、US4~US7。

---

## 1. EffectOp 基本模型

### 1.1 类型草图

```ts
interface EffectOp<Out = unknown, Err = unknown, Env = unknown> {
  readonly id: string
  readonly kind:
    | "action"
    | "flow"
    | "state"
    | "service"
    | "lifecycle"
    | "trait-computed"
    | "trait-link"
    | "trait-source"
    | "devtools"
  readonly name: string         // 例如 Action 类型名、Flow 名称、resourceId 等
  readonly payload?: unknown    // 输入参数或上下文
  readonly meta?: {
    moduleId?: string
    fieldPath?: string
    deps?: string[]
    from?: string
    to?: string
    traitNodeId?: string
    stepId?: string
    resourceId?: string
    key?: unknown
    trace?: string[]
    [k: string]: unknown
  }
  readonly effect: Effect.Effect<Out, Err, Env>
}
```

### 1.2 Middleware 组合模型

```ts
type Middleware = <A, E, R>(
  op: EffectOp<A, E, R>,
) => Effect.Effect<A, E, R>

type MiddlewareStack = ReadonlyArray<Middleware>

function composeMiddleware(stack: MiddlewareStack): Middleware {
  return (op) =>
    stack.reduceRight(
      (eff, mw) => mw({ ...op, effect: eff }),
      op.effect,
    )
}

// Runtime 级别通过 Env Service 暴露当前使用的 MiddlewareStack
interface EffectOpMiddlewareEnv {
  readonly stack: MiddlewareStack
}

const EffectOpMiddlewareTag = Context.Tag<
  EffectOpMiddlewareEnv
>("Logix/EffectOpMiddleware")
```

Runtime 在每个边界（Action / Flow / State / Service / Lifecycle）构造相应的 EffectOp，并将其交给当前 Env 中配置好的 `MiddlewareStack` 执行。

---

## 2. StateTrait.install 与 EffectOp 的接缝

### 2.1 从 Plan 到 EffectOp

StateTraitPlanStep → EffectOp 映射原则：

- `kind = "computed-update"`：
  - 当 sourceFieldPaths 中任一字段发生变化时，生成：

    ```ts
    const op: EffectOp = {
      id,
      kind: "state",
      name: "computed:update",
      meta: { moduleId, fieldPath: targetFieldPath, deps: sourceFieldPaths },
      effect: recomputeAndSet(targetFieldPath, derive),
    }
    ```

- `kind = "link-propagate"`：

  ```ts
  const op: EffectOp = {
    id,
    kind: "state",
    name: "link:propagate",
    meta: { moduleId, from: sourceFieldPath, to: targetFieldPath },
    effect: propagateValue(sourceFieldPath, targetFieldPath),
  }
  ```

- `kind = "source-refresh"`：

  ```ts
  const op: EffectOp = {
    id,
    kind: "service",
    name: resourceId,
    meta: { moduleId, fieldPath: targetFieldPath, resourceId, key },
    effect: makeSourceRefreshEffect(resourceId, key),
  }
  ```

StateTrait.install 的职责是：
- 根据 Plan 注册必要的监听（例如基于 `$` 的 onState / onAction 等能力）；  
- 在触发条件满足时构造 EffectOp，并交给 MiddlewareStack 执行。

### 2.2 Middleware 责任划分

- State 层通用中间件：
  - 日志记录（记录 Action/Flow/State/Service 事件）；  
  - Debug Observer（转发到 Devtools）；  
  - 性能测量。

- Service 层中间件：
  - 超时 / 重试 / 断路器；  
  - Query 集成（判断某些 resourceId + key 是否走 queryClient）；  
  - 审计 / 安全策略。

StateTrait 中不直接依赖具体中间件，只承诺：
- 所有字段能力行为以 EffectOp 形式输出；  
- meta 中包含足够的信息供中间件与 Devtools 决策。

---

## 3. 总线在 Runtime 中的位置

- EffectOp 内核与总线入口位于 `internal/runtime/EffectOpCore.ts`（或等价的 core 文件），具体 Middleware 组合与默认 preset 可拆分在 `internal/runtime/core/**` 下的若干实现文件中；
- `Logix.Runtime.make(root, { layer, middleware })` 在构建 Runtime 时接受一个 `MiddlewareStack` 配置（`root` 可为 program module 或其 `.impl`）：
  - 该 stack 会被封装为 `EffectOpMiddlewareEnv`，通过 `EffectOpMiddlewareTag` 注入到 Effect Env 中；
  - 若未提供 `middleware`，则视为空 stack（所有 EffectOp 直接运行其内部 effect）。
- StateTrait.install / Debug / Resource / Query 等运行时代码，通过 Env 中的 `EffectOpMiddlewareTag` 获取当前总线配置：
  - 典型用法：
    ```ts
    const stack = yield* Effect.serviceOption(EffectOpMiddlewareTag).pipe(
      Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
    )

    const op = EffectOp.make({ kind, name, effect, meta })
    const run = EffectOp.run(op, stack)
    ```
  - 这样可以保证「总线配置」只在 Runtime.make 入口注入一次，其余运行时代码都通过 Env 读取同一事实源。

---

## 4. 与 Debug / Devtools 的联动

详见 `devtools-and-debug.md`，这里只强调：

- DebugObserver 作为一种 Middleware/Observer：
  - 订阅所有 EffectOp；
  - 将结构化事件推送到 Devtools 面板；
  - 将 StateTraitGraph 信息带入事件上下文（通过 meta 中的节点/边 ID）。

- StateTraitGraph / Plan 中的 debugInfo 字段应至少包含：
  - 对应 Module ID；
  - 对应字段路径；
  - 源代码位置（文件/行号的粗粒度信息）；
  - 对应 PlanStep / EffectOp ID。

这样 Runtime → Devtools → Studio 的三者之间就有统一的结构化锚点。
