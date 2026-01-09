# Quickstart: Program Runner（根模块运行入口）

**Date**: 2025-12-23
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/024-root-runtime-runner/spec.md`

## 1) 你将获得什么

- 一个用于脚本/demo/命令行的标准入口：自动完成 root runtime（以 program module 作为 root 装配）的启动与资源释放。
- 一个统一的“脚本上下文”：在脚本里也能像 Logic 一样用 `$` 访问模块（`$.use(module)`）并获得 controller 等扩展。
- 与 `@logixjs/test` 对齐的生命周期语义：测试在同一语义之上叠加 trace/断言/可控时钟。

## 2) 心智模型（≤5 关键词）

启动 / 退出 / 释放 / 显式条件 / 作用域

> runner 不会自动推断何时退出：常驻逻辑与后台流程通常不会自然结束。你必须在主流程中显式表达退出条件（等待某个状态/事件/外部信号/超时等）。

## 3) API 设计（草案）

> 以 `contracts/api.md` 为契约基线；此处给出推荐 API 形态与使用方式（用于 demo/脚本/命令行 + 测试对齐）。

### 3.1 `Logix.Runtime.runProgram(module, main, options?)`

一次性入口：封装“启动 → 执行主流程 → 释放”。

- 自动 boot：在进入 `main` 前触碰 program module 的 tag 一次，确保实例化与 logics/processes 已启动。
- 自动释放：无论 `main` 成功或失败，最终都会释放资源（不会遗留后台 fiber 导致脚本悬挂）。
- 释放收束：支持 `closeScopeTimeout`（毫秒，默认 1000）。当 finalizer 卡住导致关闭 scope 超时，`runProgram` 会以 DisposeTimeout 失败并通过 `onError` 告警，避免“无解释悬挂”。
- CLI 友好（Node-only）：默认启用 `handleSignals` 捕获 SIGINT/SIGTERM，触发 graceful shutdown（关闭 `ctx.scope`），而不是 `process.exit` 暴毙；并支持为 `main` 注入结构化 `args`（避免直接读 `process.argv`）。
- 错误输出（CLI mode）：可选 `reportError` 控制是否由 runner 做默认错误输出；也可通过 `onError` 接入日志/监控（不改变退出策略）。

主流程回调 `main(ctx, args)` 会收到：

- `ctx.scope`：本次运行的根作用域（CloseableScope）；runner 会在主流程结束后关闭该 scope。
- `ctx.runtime`：ManagedRuntime（可执行 Effect）
- `ctx.module`：program module 的 ModuleRuntime（实例能力：getState/dispatch/changes…）
- `ctx.$`：module shape 的 Bound API（脚本侧统一入口；可 `$.use(module)` 获得 ModuleHandle，且合并 handle-extend）

简单区分：`module` 偏“领域能力”（读状态/派发 action/订阅变化），`runtime` 偏“执行能力”（运行 Effect / fork fibers）。

### 3.2 `Logix.Runtime.openProgram(module, options?)`

资源化入口：返回一个 scope-bound 的 `ProgramRunContext`，适用于交互式 runner 或多段脚本复用同一棵 runtime。

- 关闭 Scope 时自动释放资源。
- 允许调用方在同一上下文内多次运行 program。

### 3.3 TypeScript 签名（示意）

```ts
import type * as Logix from '@logixjs/core'
import type { Effect, ManagedRuntime, Scope } from 'effect'

export interface ProgramRunContext<Sh extends Logix.AnyModuleShape> {
  readonly scope: Scope.CloseableScope
  readonly runtime: ManagedRuntime.ManagedRuntime<any, never>
  readonly module: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  readonly $: Logix.BoundApi<Sh, never>
}

export declare const runProgram: <Sh extends Logix.AnyModuleShape, Args, A, E, R>(
  module: Logix.AnyModule | Logix.ModuleImpl<any, Sh, any>,
  main: (ctx: ProgramRunContext<Sh>, args: Args) => Effect.Effect<A, E, R>,
  options?: Logix.Runtime.RuntimeOptions & {
    readonly closeScopeTimeout?: number
    readonly handleSignals?: boolean
    readonly args?: Args
    readonly exitCode?: boolean
    readonly reportError?: boolean
  },
) => Promise<A>

export declare const openProgram: <Sh extends Logix.AnyModuleShape>(
  module: Logix.AnyModule | Logix.ModuleImpl<any, Sh, any>,
  options?: Logix.Runtime.RuntimeOptions,
) => Effect.Effect<ProgramRunContext<Sh>, never, Scope.Scope>
```

> 注意：`BoundApi<Sh, R>` 的第二个泛型参数是 Env `R`（不是错误通道）。脚本入口里通常写 `never`，因为依赖通过 `options.layer` 注入并由 runtime 提供。
>
> `RuntimeOptions.onError` 可用于把未捕获的 defect 上报到日志/监控（不影响退出策略本身）。

```ts
await Logix.Runtime.runProgram(AppRoot, main, {
  onError: (cause) => Effect.sync(() => console.error(cause)),
})
```

## 4) 使用示例

> 示例以 TypeScript 表达语义；最终以实现落地后的类型为准。

### 4.1 demo/脚本：运行 program module（显式退出条件）

1. 准备一个 program module（可包含 imports/processes/logics）。
2. 调用 program runner 执行主流程：
   - runner 会负责 boot（触碰 module tag）与 dispose
   - 你的主流程负责“何时结束”

主流程中推荐使用 `ctx.$`：

- `yield* ctx.$.use(SomeModule)`：拿到 `ModuleHandle`（含 handle-extend 的 controller/services）
- 需要直接访问 module runtime：使用 `ctx.module`

```ts
import * as Logix from "@logixjs/core"
import { Effect, Stream } from "effect"

// AppRoot：你的 program module（Module 或 ModuleImpl）
// OrdersCrud：你希望通过 $.use(...) 访问的领域模块（Module/ModuleDef/ModuleTag）
const AppRoot = /* ... */
const OrdersCrud = /* ... */

await Logix.Runtime.runProgram(AppRoot, ({ $ }) =>
  Effect.gen(function* () {
    // 关键：用 $.use(...) 拿 handle（可合并 controller/services 等扩展）
    const orders = yield* $.use(OrdersCrud)

    yield* orders.controller.list({ pageSize: 10 })

    // 显式退出条件：等到 items 非空后结束主流程（runner 随后负责释放资源）
    yield* orders
      .changes((s) => s.items.length)
      .pipe(Stream.filter((n) => n > 0), Stream.take(1), Stream.runDrain)
  }),
)
```

### 4.2 资源化：复用同一棵 runtime（多段 program）

```ts
import * as Logix from "@logixjs/core"
import { Effect } from "effect"

const AppRoot = /* ... */

const program = Effect.scoped(
  Logix.Runtime.openProgram(AppRoot).pipe(
    Effect.flatMap(({ runtime }) =>
      // 在同一个 runtime 上运行多个 program（示意）
      Effect.gen(function* () {
        yield* Effect.promise(() => runtime.runPromise(Effect.void))
        yield* Effect.promise(() => runtime.runPromise(Effect.void))
      }),
    ),
  ),
)

await Effect.runPromise(program)
```

### 4.3 资源化：主进程主动关闭 Scope（SIGINT / shutdown）

当 program module 内存在常驻逻辑（例如 `onAction` 监听）时，主进程不需要“等它自然结束”，而是用显式退出策略决定何时关闭 Scope；关闭 Scope 会统一 interrupt 后台监听并释放资源。

```ts
import * as Logix from "@logixjs/core"
import { Effect, Exit, Scope } from "effect"

const AppRoot = /* ... */

const scope = Effect.runSync(Scope.make()) as Scope.CloseableScope
const ctx = await Effect.runPromise(Logix.Runtime.openProgram(AppRoot).pipe(Scope.extend(scope)))

const shutdown = () => Effect.runPromise(Scope.close(ctx.scope, Exit.void))
process.once("SIGINT", () => void shutdown())
process.once("SIGTERM", () => void shutdown())

ctx.runtime.runFork(Effect.never) // 代表你的常驻主循环；Ctrl+C 会触发 shutdown 并释放资源
```

## 5) 常见退出策略（非侵入）

你可以在脚本主流程里使用以下方式表达退出条件（都不需要改业务模块定义）：

- 等待某个 state 条件达成（订阅/轮询）
- 等待某个 action 发生（订阅 actions$）
- 等待外部信号（例如脚本级 Deferred / OS signal / 计时器）
- 组合超时（避免脚本悬挂）

## 6) 测试：与 program runner 对齐

`@logixjs/test` 的职责是提供测试专用能力（trace/断言/可控时钟），但其启动/退出/释放语义应与 program runner 一致：

- 测试用例应能用同一个 program module 在“demo runner”与“test runner”下得到一致的可观测行为（状态变化/事件顺序）
- 测试 runner 提供的额外能力不得隐式改变行为（除非用例显式使用）

## 7) 下一步

进入 `$speckit tasks`：把 `@logixjs/core` 的 program runner API、`@logixjs/test` 对齐、最小回归测试与文档同步拆成可执行任务。

## 8) 与 025 的对齐（inspect pipeline，推荐）

025 的首个载体建议就是你传给 `runProgram/openProgram` 的 **program module**（例如 `AppRoot`）。在 CI/平台侧可以先跑一次 inspect，产出可 diff 的 IR 工件：

- `ModuleManifest`：结构摘要（含可选 `StaticIR`）
- `TrialRunReport`：受控试跑证据（含 Environment IR + 控制面证据）

这样 demo/脚本就能同时具备：

- 024：正确的启动/退出/释放语义（Scope-bound）
- 025：可序列化、可对比、可解释的 IR/证据（用于 CI 防腐与平台消费）
