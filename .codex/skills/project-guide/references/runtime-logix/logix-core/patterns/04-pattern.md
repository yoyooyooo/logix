# Pattern (Pattern-Style Logic & Assets)

> **Status**: Definitive
> **Date**: 2025-11-26
> **Scope**: Logix Asset System (Platform View)
> **Audience**: 库作者 / Pattern 作者 / 平台解析器实现者；普通业务开发者通常只“使用”已经发布的 Pattern。

本节从“平台资产”的视角描述 Pattern 的角色。
在当前实现中，Logix 内核以 **Store / Logic / Flow** 为显式原语，并以结构化控制流（Effect.\* + `$.match`）表达分支/错误/并行结构，
Pattern 是围绕这些原语构建的可复用长逻辑封装 + 资产包装约定。

## 1. 形态与定义（Runtime 视角）

当前主线将 Pattern 严格区分为两种形态：

| 形态       | 定义方式          | 依赖注入                    | 适用场景                         |
| :--------- | :---------------- | :-------------------------- | :------------------------------- |
| Functional | `runXxx(input)`   | 显式参数 + `Effect.service` | 工具型：纯计算、HTTP 请求等      |
| Namespace  | `Xxx.run(config)` | 隐式环境（`Logic.Env`）     | 寄生型：依赖 Store 状态/生命周期 |

### 1.1 Functional Pattern

Functional Pattern 是完全与 Store 解耦的 `(input) => Effect` 函数，
通常通过 Service / Config 获取依赖，用于跨场景复用：

```ts
export interface BulkOperationConfig {
  operation: string
  emptyMessage?: string
}

export const runBulkOperation = (config: BulkOperationConfig) =>
  Effect.gen(function* (_) {
    const selection = yield* SelectionService
    const bulk = yield* BulkOperationService
    const notification = yield* NotificationService

    const ids = yield* selection.getSelectedIds()

    if (ids.length === 0) {
      yield* notification.info(config.emptyMessage ?? '请先选择记录')
      return 0
    }

    yield* bulk.applyToMany({ ids, operation: config.operation })
    return ids.length
  })
```

特点：

- 入口类型统一为 `(config: C) => Effect<A, E, R>`；
- 不依赖具体 Store 形状，可以在多个 Store / Runtime 中复用；
- 常用于抽象 HTTP 调用、通知逻辑、批量操作等“工具型”模式。

### 1.2 BoundApi Pattern（推荐范式）

BoundApi Pattern 用于表达依赖 Store 状态或生命周期的"寄生型"逻辑。
它通过显式接收 `$: BoundApi` 参数获取模块能力，返回一个 Effect：

```ts
/**
 * @pattern Cascade (级联加载)
 * @description 封装"字段联动"流程：监听上游 → 重置下游 → 加载数据 → 更新结果
 */
export const runCascadePattern = <Sh extends Logix.AnyModuleShape, R, T, Data>(
  $: Logix.BoundApi<Sh, R>,
  config: {
    source: (s: Logix.StateOf<Sh>) => T | undefined | null
    loader: (val: T) => Logix.Logic.Of<Sh, R, Data, never>
    onReset: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>
    onSuccess: (prev: Logix.StateOf<Sh>, data: Data) => Logix.StateOf<Sh>
    onLoading?: (prev: Logix.StateOf<Sh>, isLoading: boolean) => Logix.StateOf<Sh>
  },
) => {
  return $.onState(config.source).runLatest((val) =>
    Effect.gen(function* () {
      yield* $.state.update(config.onReset)
      if (val == null) return

      if (config.onLoading) {
        yield* $.state.update((s) => config.onLoading!(s, true))
      }

      const data = yield* config.loader(val)
      yield* $.state.update((s) => {
        let next = config.onSuccess(s, data)
        if (config.onLoading) next = config.onLoading(next, false)
        return next
      })
    }),
  )
}
```

特点：

- 入口为 `runXxxPattern($, config)`，显式接收 `BoundApi` 参数；
- 通过 `$` 使用模块能力（`$.onState / $.state.update / $.use` 等）；
- 适合表达级联加载、乐观更新、批量操作等"状态感知型 Pattern"。

> 约定
>
> - BoundApi Pattern 的第一个参数为 `$: Logix.BoundApi<Sh, R>`；
> - 业务 Logic 通过 `yield* runCascadePattern($, { ... })` 使用 Pattern。

> 参见：`examples/logix/src/patterns/` 目录下有更多实际示例（cascade、bulk-operations、optimistic-toggle 等）。

## 2. 平台解析契约（Parser Contract）

在全双工引擎中，Pattern 被视为 **Gray Box（灰盒）** 资产：

- **调用层（White Box）**：
  - Parser 识别 `yield* AutoSave.run(config)` / `runBulkOperation(config)` 这类调用；
  - 提取 `config` 参数（或其 Schema），在画布上渲染为一个命名的 Effect Block 节点。

- **实现层（Gray Box）**：
  - Parser 不深入解析 Pattern 内部的 `Effect.gen` 实现；
  - Pattern 内部可以自由使用任意 `Effect` / `Stream` 组合与 Service 调用。

这一契约保证：

- Pattern 开发者拥有足够的实现自由度；
- 平台仍然可以在 Logic 图上以“命名积木”的方式呈现 Pattern 使用情况。

## 3. 状态借用（State Borrowing）

按当前约定，Pattern 不直接持有状态，而是通过以下两种方式“借用”：

- **Namespace Pattern**：通过 `Logic.RuntimeTag` 获取当前模块的运行时实例，再使用 `changes$ / ref / getState` 等能力；
- **Functional Pattern**：通过显式注入的 `SubscriptionRef` / 值参数操作状态。

示例：

```ts
// Namespace Pattern 中借用当前 Store 的变化流
const runtime = yield * Logic.RuntimeTag
const changes$ = runtime.changes$(config.selector)

// Functional Pattern 中通过 Ref 借用局部状态
export interface PaginationInput {
  pageRef: SubscriptionRef.SubscriptionRef<number>
}

export const runPaginationEffect = (input: PaginationInput) =>
  Effect.gen(function* (_) {
    yield* SubscriptionRef.update(input.pageRef, (p) => p + 1)
  })
```

平台在资产层只关心 Pattern 的 **配置契约（Config / 输入参数）**，
而运行时只关心 Pattern 的返回 Effect 如何执行。

## 4. Pattern 在图码中的角色

在图码同步视角下：

- Functional / Namespace Pattern 对应 `effect-block` 节点（参见 `docs/specs/sdd-platform/ssot/assets/00-assets-and-schemas.md` 的 `LogicNode`）；
- `$.flow.run*` / `Effect.catch*` 等调用对应骨架节点；
- 平台可以根据 Pattern 资产的 `id` / `configSchema` 将某些 Effect Block 渲染为“命名积木”（palette 中的 Pattern），但这不改变运行时行为。

## 5. 命名与最佳实践

### 5.1 命名规范

| 形态       | 命名约定                   | 示例                           |
| ---------- | -------------------------- | ------------------------------ |
| Functional | `runXxx(config)`           | `runBulkOperation(config)`     |
| BoundApi   | `runXxxPattern($, config)` | `runCascadePattern($, config)` |

### 5.2 错误处理约定

- Pattern 内部可以处理可恢复错误，或通过 `Effect.catchTag` 转换为状态更新；
- 不可恢复错误应冒泡给调用方，由 Logic 层统一处理。

### 5.3 测试策略

```ts
import { it } from '@effect/vitest'

it.scoped('runCascadePattern should reset and load', () =>
  Effect.gen(function* () {
    // 构造 mock $ 和 config，验证 Pattern 行为
  }),
)
```

---

## 总结

- 运行时核心只知道 `Effect` 与 `Store / Logic / Flow`（结构化控制流直接使用 Effect.\* + `$.match`）；
- Pattern 是围绕这些 Effect 函数的写法惯例与资产包装协议；
- 平台可选择性地将某些 Pattern 注册为资产，用于可视化、复用与配置化，而无需 runtime 提供特殊支持；
- 实际示例见 `examples/logix/src/patterns/`。
