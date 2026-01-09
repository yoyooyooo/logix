# Quickstart: Lifecycle 全面升级

**Feature**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Created**: 2025-12-16  

本快速指南用于帮助模块作者与平台/适配层作者理解升级后的生命周期语义，并提供迁移落点。

> 说明：本页关键语义有可运行对照场景：`examples/logix/src/scenarios/lifecycle-gate.ts`。
> 若你发现文档与实现不一致，以本特性 `tasks.md` 中的测试为准，并在本特性目录内记录差异与修复点。

快速运行：

```bash
pnpm -C examples/logix exec tsx src/scenarios/lifecycle-gate.ts
```

## 1. 你将得到什么

- **声明式生命周期**：在模块内部声明初始化/销毁/错误兜底/平台信号处理，不依赖 UI hooks。
- **初始化门禁一致**：必需初始化完成前，实例不会对外呈现为可用；支持“可等待获取”。
- **销毁顺序直觉**：销毁任务按“后声明先执行”（LIFO），更符合资源释放习惯。
- **可诊断、可解释**：生命周期阶段与错误上下文具备稳定锚点与可序列化事件。
- **稳定标识**：实例/事务/操作采用稳定序列，避免随机/时间默认 id。

## 2. 模块作者：如何声明生命周期

> 关键规则：`$.lifecycle.*` 只能在 setup 阶段做“声明/注册”。推荐写法是在 `Module.logic(($) => { ... })` 的同步部分直接调用（不要 `yield*`）；需要依赖 Env 的初始化逻辑，放到注册进去的 Effect 里即可。

### 2.1 先声明错误兜底（强烈建议）

在模块逻辑中尽早声明统一的错误兜底，以保证初始化/后台/销毁/平台信号的失败都能被收敛并上报。

```ts
import * as Logix from "@logixjs/core"
import { Effect, Schema } from "effect"

export const Demo = Logix.Module.make("Demo", {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {
    boot: Schema.Void,
  },
})

export const DemoLogic = Demo.logic(($) => {
  // 模块级：最后上报（不用于恢复业务流程）
  $.lifecycle.onError((cause, ctx) =>
    Effect.logError("[Demo] lifecycle error", { cause, ctx })
  )

  // 必需初始化（可选）：决定实例可用性
  $.lifecycle.onInitRequired(Effect.log("[Demo] initRequired"))

  // 启动任务（可选）：不阻塞可用性（例如轮询/订阅）
  $.lifecycle.onStart(Effect.log("[Demo] start"))

  // 销毁：释放资源（LIFO）
  $.lifecycle.onDestroy(Effect.log("[Demo] destroy"))

  // ...其余逻辑（watcher / flow / task 等）
  return Effect.gen(function* () {
    yield* $.onAction("boot").run(
      $.state.update((s) => ({ ...s, ready: true })),
    )
  })
})

export const DemoImpl = Demo.implement({
  initial: { ready: false },
  logics: [DemoLogic],
})
```

分层速记（本特性的目标语义）：

- **局部（单个流程/任务）**：用 `Effect.catchAll / catchAllCause` 把“预期错误”转成状态/返回值，不进入未处理错误链路。
- **模块（单个实例）**：用 `$.lifecycle.onError` 兜底未处理失败（初始化/后台/销毁/平台信号），用于最后上报，不用于恢复业务流程。
- **全局（整棵 Runtime）**：用 `Runtime.make({ onError })` / React `RuntimeProvider onError` 统一接入监控；仅观测与上报，不改变模块错误语义。
- **取消/中断**：不应当当作错误上报（默认会被过滤）。

### 2.2 声明“必需初始化”（决定实例可用性，`onInitRequired/onInit`）

用于加载配置、准备依赖、或任何“未完成前实例不可用”的工作。

- 必需初始化任务按声明顺序串行执行
- 任一失败将导致该次初始化失败（对消费方可观测）

### 2.3 声明“启动任务”（不阻塞可用性）

用于轮询、订阅、心跳等后台行为；不应阻塞实例进入可用状态，但失败必须被上报（默认不致命，可按策略配置为致命）。

### 2.4 声明销毁任务（LIFO）

用于释放资源、取消订阅等。销毁任务在实例终止时执行一次且仅一次，并按 LIFO 顺序执行。

## 3. 消费方：同步获取 vs 可等待获取

### 3.1 同步获取（默认）

适用于“必需初始化”不包含任何需要等待的工作。若模块声明了需要等待的必需初始化，但仍被同步方式消费，应得到明确的可行动错误提示（提示切换到可等待获取模式或调整初始化策略）。

### 3.2 可等待获取（推荐用于异步必需初始化）

适用于必需初始化包含需要等待的工作。消费方在初始化完成前无法获得可用实例；初始化失败时应得到失败结果与诊断提示。

在 React 中，推荐用 Suspense 模式承接“可等待获取”：

- 同步模式（默认）：`useModule(Impl)`
- Suspense 模式（可等待）：`useModule(Impl, { suspend: true, key })`（需放在 `<Suspense>` 内）

## 4. 平台/适配层：平台信号

平台可选择性广播：

- `suspend`: 将高频行为切换到低频/暂停（不销毁实例）
- `resume`: 恢复行为
- `reset`: 业务软重置（例如登出清理）

未注册处理器时必须安全忽略；平台信号不应隐式等同于销毁/重建。

## 5. 迁移说明（无兼容层）

升级会带来破坏性变更，迁移原则如下：

1. 将生命周期相关逻辑从“调用点立即执行”迁移为“声明式注册”，并让 Runtime 统一调度；
   - 将所有 `yield* $.lifecycle.*(...)` 从 run 段移出，改成 setup 段同步注册（见上方示例）。
2. 将真正需要门禁的初始化移动到“必需初始化”；将后台任务移到“启动任务”；
3. 若模块存在需要等待的必需初始化，消费方必须切换到“可等待获取”模式；
4. 若依赖诊断/Devtools，确保事件载荷保持可序列化并遵守预算上界。

迁移完成的验收标准以本特性的 `spec.md` 用户场景与成功指标为准。

## 6. 场景代码：program 的用法（脚本 / 运行时入口）

### 6.1 脚本中：构造 Runtime，然后运行 program

```ts
import * as Logix from "@logixjs/core"
import { Effect, Layer } from "effect"
import { DemoImpl, Demo } from "./demo-module.js"

const runtime = Logix.Runtime.make(DemoImpl, {
  layer: Layer.mergeAll(
    Logix.Debug.layer(), // 仅示例：可按需替换为自定义 DebugLayer
  ),
  onError: (cause, ctx) =>
    Effect.logError("[App] unhandled", { cause, ctx }),
})

const program = Effect.gen(function* () {
  const demo = yield* Demo
  yield* demo.dispatch({ _tag: "boot", payload: undefined } as any)
  const state = yield* demo.getState
  yield* Effect.log("[Demo] state", state)
})

void runtime.runPromise(program)
```

要点：

- `program` 是一个普通的 `Effect`：通过 `yield* ModuleTag`（例如 `yield* Demo`）拿到 `ModuleRuntime`；
- 你可以把 `program` 放进脚本/后端任务/测试用例里复用（只要它运行在同一棵 Runtime Tree 上）。

### 6.2 应用级长期逻辑：用 `processes` 安装常驻 program

当你需要在应用生命周期内常驻一段逻辑（例如桥接平台事件、跨模块协同），可以把它挂到 RootImpl 的 `processes`：

```ts
import * as Logix from "@logixjs/core"
import { Effect } from "effect"

export const CrossProcess = Effect.gen(function* () {
  const demo = yield* Demo
  // ...订阅外部事件/stream，然后 dispatch 到 demo（需遵守事务边界）
  yield* demo.dispatch({ _tag: "boot", payload: undefined } as any)
})

export const RootImpl = Demo.implement({
  initial: { ready: false },
  logics: [DemoLogic],
  processes: [CrossProcess],
})
```

> 约束：processes 是“全局常驻”，适合桥接/协调；若你需要“多实例隔离”的长效逻辑，更推荐走“实例级安装点”（见 `specs/012-program-api/*` 的 Program 设计）。
