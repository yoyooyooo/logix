# 1. Bound API：Context is World

在最终版中，我们确立「**Context is World**」的心智模型：

- 业务作者无需显式感知 ModuleRuntime / Env 拓扑，只需通过一个统一入口 `$` 访问所有能力；
- 领域模块通过 `Logix.Module` 提供「身份 + 契约 + Runtime Tag」，Logic 则通过 `$` 在其上下文中编排行为。

标准 Logic 文件形态示例（概念性代码）：

```ts
// features/counter/module.ts
export const Counter = Logix.Module.make('Counter', {
  state: CounterStateSchema,
  actions: CounterActionSchema,
});

// features/counter/logic.ts
export const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // 1. 本地 State 编排（当前 Module）
    yield* $.onState((s) => s.count)
      .debounce(300)
      .mutate((draft) => {
          draft.status = 'idle';
        });

    // 2. 跨 Module 协作 / Service 调用通过 $.use 完成
    const $User = yield* $.use(UserModule);
    const api = yield* $.use(ApiService);

    // ...
  }),
);

// features/counter/live.ts
export const CounterLive = Counter.live(
  { count: 0, status: 'idle' },
  CounterLogic,
);
```

在这一模式下：

- **业务代码只需要记住 `$` 这一入口符号**：`$.state` / `$.actions` / `$.flow` / `$.use` / `$.on*` / `$.match`；
- Module/Logic/Env/Scope 等运行时细节对业务作者透明，由运行时实现承担复杂度。

## 1.2 `$.use(...)` / `$.self`：协作与自引用

`$.use` 是 Logic 内的统一依赖注入入口：

- `yield* $.use(ServiceTag)`：取环境中的 Service。
- `yield* $.use(module)`：取其他 Module 的只读句柄（等价 `yield* $.use(module.tag)`）。
  - `module` 可以是 `ModuleDef`（`Logix.Module.make(...)` 返回）或 `Module`（wrap module，含 `.impl`）。
  - 默认行为是 **strict**：只从当前模块实例 scope 解析（要求通过 `imports`/RuntimeProvider 提供），缺失即失败（典型错误：`MissingModuleRuntimeError`，提示 `imports: [Child.impl]`）。

`$.self` 用于“自引用当前模块”：

- 仅在 `ModuleDef.logic(($)=>...)` 注入的 `$` 上可用；
- `yield* $.self` 返回当前模块的 `ModuleHandle`（包含 handle-extend 扩展，如 controller），等价于“在不显式传入 module 的情况下拿到自己”。

## 1.3 `$.root.resolve(Tag)`：显式 root 单例读取

`$.use(...)` 默认是 **strict**：只从“当前模块实例 scope”解析依赖（由 `imports` / 当前运行环境提供），缺失即失败。

当你需要**刻意使用 root/global 单例语义**（例如 i18n / auth / analytics / 全局配置），使用：

```ts
const i18n = yield* $.root.resolve(I18nTag)
```

要点：

- `$.root.resolve(Tag)` 固定从“当前 Runtime Tree 根（root provider）”解析 Tag，**忽略**更近的局部 override（例如嵌套 `RuntimeProvider.layer`）；
- 语义等价于在 Effect 边界使用 `Logix.Root.resolve(Tag)`，但它是 Logic 内语法糖，并会携带 entrypoint 诊断字段（用于解释链路/定位调用方）；
- 仅在“必须显式拿 root 单例”的场景使用；若希望允许局部覆写/测试替换，仍应使用 strict 的 `$.use` + `imports` / `RuntimeProvider.layer` 组合。

## 1.1 `$` 作为静态锚点 (Static Anchor)

为了方便平台 Parser 构建 Logic Graph，需要遵守以下约定：

- `$` 必须是 **Logic 文件顶层绑定的常量**（通常来自 `ModuleDef.logic(($) => ...)` 的参数）；
- 不允许对 `$` 重新赋值；
- 不推荐将 `$` 作为普通函数参数层层传递——封装推荐使用 Pattern 或 `(input) => Effect` 形式；
- Parser 只对满足上述条件、且使用 **Fluent Intent API (`$.onState` / `$.onAction` / `$.on` + `.update/.mutate/.run*`)** 的代码做结构化解析，其余写法统一降级为 Gray/Black Box。

在 Bound API 模式下：

- 业务代码主要通过 `$.*` 进行编排；
- Intent 命名空间（`Intent.*`）退居 **IR / 平台协议层** 使用，业务代码不再直接依赖；
- 内核与 Pattern 可以使用 `Logic.RuntimeTag` / `Logix.ModuleTag<Sh>` 等底层设施，但对业务 Logic 隐藏这些细节。

> 心智模型回顾：在 `$` 内部，`$.on*` 承担“感知 (Perception)”，`$.flow.*` 承担“策略 (Strategy，时间轴与并发)”，`$.state / $.actions` 承担“行动 (Actuation)”——三者是一条链路的不同层面，而不是三套彼此独立的概念。

## 1.4 Action Surface（actions / dispatchers / effects）

067 起，Action 的推荐写法围绕 “**定义视图 vs 执行视图**” 分离：

- `$.actions.<K>(payload)`：**只创建 action object（纯数据）**，可序列化/可回放/可用于 Manifest 与事件 join。
- `$.dispatchers.<K>(payload)`：返回可 `yield*` 的 **Effect（真正派发）**，作为 `$.dispatch($.actions.<K>, payload)` 的常用短写（payload 类型来自 action 定义）。
- `$.dispatch(token, payload)` / `$.dispatch(action)`：通用派发入口（支持 token-first 与 action object）。

> IDE 侧的“跳转到定义/找引用/重命名”锚点，仍然是 **ActionToken 本身**：如果你希望 IDE 稳定地跟踪某个 action，请让代码里显式出现 token（例如 `$.dispatch($.actions.<K>, payload)`、`$.onAction($.actions.<K>)`，或在模块定义处把 actions 抽成具名常量再引用）。

监听与副作用：

- `$.onAction(token)`：token-first 精确监听时回调参数为 **payload-first**；predicate/字符串 tag 监听仍回调完整 action object（用于区分 `_tag` / 读取元信息）。
- `$.effect(token, handler)`：副作用注册面（事务外触发、失败隔离、去重键为 `(actionTag, sourceKey)`，并产出结构化诊断）。推荐在 setup 注册；run 阶段动态注册作为高级能力（会提示且只影响未来 action）。
