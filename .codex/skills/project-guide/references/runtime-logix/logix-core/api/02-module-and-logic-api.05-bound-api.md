# 5. Bound API `$`：业务作者的唯一入口

Bound API `$` 的完整说明见 `03-logic-and-flow.md`，这里只做概览。

在 Logic 程序内部，业务作者只需记住一个符号 `$`。当前实现中，`$` 的**唯一正式入口**是 `ModuleDef.logic(($)=>Effect)`：

```ts
export const SomeLogic = SomeModule.logic(($) =>
  Effect.gen(function* () {
    // ...
  }),
);
```

> 说明：文档与示例中若提到“针对某个 Shape/Env 预绑定的 `$`”，均表示在 `Logic.Env<Sh,R>` 上预绑定同一类 `BoundApi<Sh,R>` 的 `$`。请始终通过 `ModuleDef.logic(($)=>...)` 获取 `$`。

从心智模型上，可以把 `$` 理解为一个“宿主对象”，内部再按「感知 / 策略 / 行动 / 协作 / 结构 / 生命周期」六个子域划分：

- 感知（Perception）：`$.onState / $.onAction / $.on` —— Fluent Intent DSL，用于监听当前 Module 的 State / Action 或任意 Stream；
- 策略（Strategy）：`$.flow.*` —— Flow API，包含 `fromAction / fromState / debounce / throttle / filter / run / runLatest / runExhaust` 等算子，用来描述时间轴与并发语义；
- 行动（Actuation）：`$.state` / `$.actions` —— 读写当前 Module 状态（`read / update / mutate / ref`）与派发当前 Module 的 Action（`dispatch / actions$`）；selector 级 Ref 仍需结合 `$.onState` / Flow 或自定义封装；
- 协作（Collaboration）：`$.use` —— 依赖注入入口（`$.use(ModuleOrService)`），用于访问其他 Module 的只读句柄或外部 Service；
- 结构（Structure）：`$.match` —— 结构化分支与模式匹配（`match / matchTag` 等），配合 Effect 原语表达控制结构；
- 生命周期（Lifecycle）：`$.lifecycle` —— 生命周期钩子（`onInitRequired / onStart / onDestroy / onError` 等），与 Module Runtime 的 Scope 绑定。

## 5.1 生命周期 `$.lifecycle`

用于定义 Module 启动与销毁时的钩子逻辑。

- **重要规则（setup-only）**：`$.lifecycle.*` 是 **声明/注册** API，必须在 Logic 的 setup 阶段调用（builder 的同步部分，`return` 之前）。run 阶段调用必须被拒绝并产出可行动诊断，但不得改变既有注册结果，也不得因“误用”终止实例。
- **`onInitRequired` (Blocking)**：必需初始化（决定可用性）。Runtime 会在启动 run fibers 前按注册顺序串行执行所有必需初始化任务，全部成功后实例才会进入 `ready`。
  - 兼容口径：`onInit` 视为 `onInitRequired` 的别名（语义相同），推荐新代码使用 `onInitRequired` 以区分 “必需初始化 vs 启动任务”。
- **`onStart` (Non-blocking)**：启动任务（不阻塞可用性）。实例进入 `ready` 后启动执行，失败必须被上报（默认不影响实例可用性，除非平台/运行时策略显式选择 fatal）。
- **`onDestroy` (LIFO + best-effort)**：终止清理任务。实例终止时执行一次且仅一次，按 **后注册先执行（LIFO）** 顺序运行；单个任务失败不应阻塞后续清理，但必须记录失败。
- **`onError` (Last-breath reporting)**：模块内任意未处理失败触发时执行。
  - **时机**：错误传播到 Module Scope 时，在 Scope 关闭前触发。
  - **用途**：仅用于**最后的错误上报与日志记录**（Last-breath reporting），不用于错误恢复（恢复应在 Logic 内部处理）。
  - **注意**：`interrupt/cancel` 不应当被当作错误上报（默认应过滤）；触发 `onError` 也不意味着“一定会崩溃”，具体是否终止由生命周期策略决定（必需初始化失败通常会使本次初始化失败并进入 `failed`）。

```ts
// 示例：灵活组合多个生命周期与后台任务
const MyLogic = MyModule.logic(($) => {
  // setup-only：同步注册生命周期钩子（注册 ≠ 执行）
  $.lifecycle.onInitRequired(Effect.log("Init Step 1: Config"))
  $.lifecycle.onInitRequired(Effect.log("Init Step 2: DB"))

  return Effect.gen(function* () {
    // run：挂载后台任务（在 init 完成后启动）
    yield* Effect.fork(
      Stream.tick("1 second").pipe(
        Stream.tap(() => Effect.log("Heartbeat 1")),
        Stream.runDrain
      )
    )

    yield* Effect.fork(
      Stream.make(1, 2, 3).pipe(
        Stream.runForEach(n => Effect.log(`Processing ${n}`))
      )
    )
  })
})
```

> **机制说明**：
>
> - `$.lifecycle.*` 只是**注册**生命周期任务（注册 ≠ 执行）。
> - 运行时会收集所有注册的 `onInitRequired/onInit`，并在 Module 启动时按**注册顺序**依次执行（串行、blocking）。
> - 运行时会在实例进入 `ready` 后启动 `onStart`（non-blocking）。
> - 运行时会在实例终止时以 **LIFO + best-effort** 语义执行 `onDestroy`。
> - `Effect.fork` 的后台任务应放在 run 段：会在 init 完成后启动，不影响 init 的串行与门禁。

## 5.2 平台级生命周期钩子（Platform Lifecycle）

以下钩子通过 `Logic.Platform` 提供统一接口，具体由各平台实现（例如 React 侧的 `ReactPlatformLayer`）按需驱动：

- **`onSuspend` / `onResume`**:
  - 面向 React `<Offscreen>` / KeepAlive 或移动端后台场景；
  - 用于在 UI 不可见时暂停高频任务（如 Polling），而不销毁状态；
  - 语义属于“平台级行为状态”，与 Module 的存在与否、ModuleCache 的内存保活策略解耦。
- **`onReset`**:
  - 面向业务逻辑的“软重置”（Soft Reset）；
  - 标准化 `Logout` / `Clear` 行为，重置状态但不销毁实例。

## 5.3 Module Lifecycle 与 Session（概念视图）

在当前实现与实现草图中（参见 `impl/03-module-lifecycle-and-scope.md`），我们将 Module 生命周期与 Session/ModuleCache 统一抽象为四个互相配合的维度：

- **数据 Scope（ModuleRuntime Scope）**：由 `ModuleRuntime` 的内部 Scope 承载，`$.lifecycle.onInit / onDestroy / onError` 与之绑定，决定“这棵 ModuleRuntime 是否存在，以及何时彻底关闭”；
- **资源 Scope（ModuleCache Entry）**：由 React 侧的 `ModuleCache` 管理，决定“某个 ModuleRuntime 实例在内存中存活多久”（`Acquire → Retain → Release → GC`）；
- **会话语义（Session Pattern）**：由调用方在 `useModule(Impl, { key, gcTime })` 中选择 `key + gcTime` 决定，是暴露给 React/业务开发者的“组件级 / 区域级 / 会话级”状态保持接口；
- **行为状态（Platform Lifecycle）**：由 `$.lifecycle.onSuspend/onResume/onReset` + `Logic.Platform` 驱动，决定“在存在期间何时暂停/恢复/软重置行为”，不直接关闭 Scope。

抽象时间轴上，单个 Module 实例通常经历四个阶段：

1. **Construct（构建）**
   - 触发：首次通过 ModuleImpl.layer 或 ModuleCache 创建某个 `ModuleRuntime`；
   - 数据 Scope：打开根 Scope，注册所有 Logic，并串行执行已登记的 `onInit`；
   - 资源 Scope：ModuleCache 中创建 Entry，`status = pending/success`；
   - Session：若调用方传入显式 `key`，在该 Runtime 内认领一份“会话身份”，否则视为组件私有 Session。

2. **Active（活跃）**
   - 数据 Scope：Scope 打开，Logic watcher 与进程运行中，可以持续读写 State / 派发 Action；
   - 资源 Scope：Entry `refCount > 0`，至少有一个 UI 持有该实例；
   - Session：业务视角下，可理解为“某个页面 / Tab / Widget 的会话正在进行”；
   - Platform：可选择性注册 `onSuspend/onResume`，响应页面可见性 / 路由切换等行为事件。

3. **Idle（空闲/保活）**
   - 数据 Scope：仍然打开，状态留在内存中，但暂时没有 UI 订阅者；
   - 资源 Scope：`refCount` 回到 0，ModuleCache 启动基于 `gcTime` 的 Idle 计时；在计时窗口内如果有新组件重新 `retain`，视为“会话恢复”，取消 GC；
   - Session：业务视角可理解为“会话被暂存”，例如 Tab 被关闭但允许短时间内恢复；
   - Platform：可以通过 `onSuspend` 暂停高频行为（轮询等），但不销毁会话本身。

4. **Terminate（结束）**
   - 数据 Scope：Idle 计时结束且 `refCount` 仍为 0 时，ModuleCache 触发 Scope 关闭，按 **LIFO + best-effort** 执行所有 `onDestroy`，随后删除 Entry；
   - 资源 Scope：该实例彻底从缓存中移除，所有 watcher / 长逻辑停止；
   - Session：会话结束，之后只能创建新的实例；
   - Platform：若有需要，可通过 `onReset` 或显式清理逻辑在到期前主动结束会话。

在具体 API 层面的对应关系是：

- **Module 定义/Logic 层**：只关心 `$.lifecycle` 与 Platform lifecycle，以“模块是否存在、何时暂停/恢复/重置”的语义思考；
- **React Adapter 层**：通过统一的 Resource Cache（`ModuleCache`）+ `useModule(Impl, { key, gcTime, suspend })` 将「Scope + Session + React 组件」绑定在一起；
- **宿主应用/平台**：按需为 Runtime 提供 `Logic.Platform` 实现（例如 `ReactPlatformLayer`），并在合适的事件源（路由 / Page Visibility / App 前后台）上驱动 `onSuspend/onResume/onReset`。

> 心智模型可简化记忆为：**Session = ModuleRuntime 实例 + 稳定的 `key` + 一段 `gcTime` + 一套 Platform 行为策略**。  
> 文档层面将继续以此视图约束 React Adapter 与未来多端平台的实现。

Bound API 设计目标：

- 对业务代码：只需要记住 `$`，不直接接触 Module / Context / Layer；
- 对平台 Parser：`$` 是静态锚点，`$.on*().update/mutate/run*` 链是 IntentRule 的 IR 形态；
- 对运行时：`$` 只是 Env 的一层类型/语法封装，所有语义都可机械地翻译为 `Flow.Api`（时间/并发）+ Effect 原生结构算子（分支/错误/并发）。

---
