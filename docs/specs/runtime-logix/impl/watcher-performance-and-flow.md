# Watcher 性能与 Flow 链路说明

> **Status**: Impl Notes (v3 Runtime · Watcher & Flow)
> **Scope**: Logix Core Runtime (`@logix/core` · BoundApi / Flow / ModuleRuntime)
> **Audience**: 运行时实现者、性能调优、复杂场景 PoC。

本文从实现视角梳理 `$.onAction / $.onState / $.on` watcher 的完整链路，并记录当前 PoC 下的性能基线与调优建议，方便后续重构或优化时快速对齐心智模型。

## 1. 总体链路：从 dispatch 到 watcher handler

### 1.1 ModuleRuntime 源流

实现位置：`packages/logix-core/src/runtime/ModuleRuntime.ts`

- 状态存储：
  - `stateRef: SubscriptionRef<S>` 持有当前 State；
  - `stateRef.changes` 暴露 State 变化流。
- Action 通道：
  - `actionHub: PubSub<A>`；
  - `actions$: Stream.fromPubSub(actionHub)`。
- 对外接口（含 primary reducer）：
  - `dispatch(action)`：
    1. 若配置了 primary reducer（`options.reducers` 或运行时通过 `$.reducer` 注册），则根据 `_tag` 查找对应 `(state, action) => nextState` 函数，并同步更新 `stateRef`；
    2. 写一条 DebugSink 事件（`action:dispatch`，当前实现中 `state:update` 事件在 `setState` 内部单独记录）；
    3. 通过 `PubSub.publish(actionHub, action)` 将 Action 广播给所有 watcher（Logic / Flow）。
  - `changes(selector)`: `stateRef.changes |> Stream.map(selector) |> Stream.changes`。

> 关键点：`actions$` / `changes(selector)` 是所有 Flow / watcher 的统一源头。任何 watcher 数量的扩张，本质上都是在这两条源流上增加订阅和下游管道。

### 1.2 Flow.Api：fromAction / fromState / run*

实现位置：`packages/logix-core/src/dsl/FlowBuilder.ts`

- `fromAction(predicate)`：
  - 实现：`runtime.actions$.pipe(Stream.filter(predicate))`；
  - 对同一条 `actions$` 流可以挂任意多条不同 predicate 的 watcher。
- `fromState(selector)`：
  - 实现：`runtime.changes(selector)`；
  - 内部已经包含 `Stream.map + Stream.changes`，只对“值有变化”的事件向下游传播。
- `run / runParallel / runLatest / runExhaust`：
  - 统一形态：`(eff) => (stream) => Effect`；
  - 核心实现基于 `Stream.runForEach` / `Stream.runDrain`，在源流上为每个事件调度一个 Effect。

> 心智模型：Flow.Api 本身不持有“watcher 实例列表”，它只是为给定 ModuleRuntime 构造 “Stream → Effect” 的工具集。

### 1.3 Logic.IntentBuilder：run/update/mutate/runFork

实现位置：`packages/logix-core/src/dsl/LogicBuilder.ts`

`makeIntentBuilderFactory(runtime)` 为某个 ModuleRuntime 预绑定 Flow.Api，并为每条源流构造 Fluent IntentBuilder：

- `.debounce/throttle/filter/map`：
  - 只是对当前 Stream 做二次变换，然后递归调用 `makeIntentBuilderFactory`；
  - 不会额外存储全局状态。
- `.run(effect)`：
  - 实现：`Stream.runForEach(stream, payload => resolveEffect(effect, payload))`；
  - 整个 watcher 作为一个 Effect 返回，由 Logic 负责在 Scope 内启动。
- `.update(reducer)` / `.mutate(reducer)`：
  - 对每个事件：
    - `runtime.getState` → `reducer(prev, payload)` → `runtime.setState(next)`；
    - `mutate` 使用 `mutative.create` 生成新 State；
    - 包一层 `Effect.catchAllCause` 统一打日志。
- `.runFork(effect)` / `.runParallelFork(effect)`：
  - 语义：在当前 Logic.Env + Scope 上非阻塞地启动一条 watcher Fiber；
  - 实现：`Logic.secure(Effect.forkScoped(flowApi.run*(effect)(stream)), meta)`。

> 关键点：**每条 watcher = 一段长期运行的 Flow/Effect 程序**。`runFork` 是典型写法，会在 ModuleRuntime Scope 下挂出长期存在的 Fiber。

### 1.4 BoundApi：`$.onAction / $.onState / $.on`

实现位置：`packages/logix-core/src/runtime/BoundApiRuntime.ts` + `packages/logix-core/src/api/BoundApi.ts`

- 对当前 Module：
  - `BoundApiRuntime.make(shape, runtime)`：
    - 先构造 `flowApi = DSL.Flow.make(runtime)`；
    - 再构造 `makeIntentBuilder = LogicBuilder.makeIntentBuilderFactory(runtime)`。
  - `$.onAction(...)`：
    - 基于 `runtime.actions$` 做 filter（支持谓词、`_tag` 字面量、Schema 等），得到一个 Stream；
    - 将 Stream 交给 `makeIntentBuilder`，得到 IntentBuilder。
  - `$.onState(selector)`：
    - 调用 `runtime.changes(selector)` 得到视图变化流；
    - 同样交给 `makeIntentBuilder`。
  - `$.on(source)`：
    - 对任意 Stream 直接调用 `makeIntentBuilder(source)`。
- 跨 Module 的 `$Other`：
  - 使用 `ModuleHandle.actions$ / changes(selector)` 作为源流构造远程 Bound 风格 API；
  - 语义与当前 Module 上的 on* 一致，只是 Runtime 来源不同。

> 关键点：BoundApi 不管理 watcher 列表，只负责把 “ModuleRuntime 源流 + Flow.Api + LogicBuilder” 组合为 Fluent 的 `$.on*`。

### 1.5 Logic 与 ModuleRuntime Scope

实现位置：`packages/logix-core/src/runtime/ModuleRuntime.ts` + `docs/specs/runtime-logix/impl/module-lifecycle-and-scope.md`

- Logic 注入与启动：
  - ModuleInstance.live 调用 `ModuleRuntime.make(initial, { tag, logics, moduleId })`；
  - 在 `ModuleRuntime.make` 内，对每个 Logic：
    - 注入当前 ModuleRuntime Tag 与 LifecycleManager；
    - 在构造 ModuleRuntime 的 Scope 内 `Effect.forkScoped(logicWithServices)`。
- watcher Fiber：
  - 对于 `runFork` / 业务代码手写的 `Effect.forkScoped($.onAction(...).run(...))`：
    - watcher Fiber 的生命周期同样挂在 ModuleRuntime Scope 下；
    - Scope 关闭时，所有 Logic Fiber + watcher Fiber 会被一起中断。

> 关键点：没有任何“全局静态 watcher 列表”，所有 watcher 都严格跟随 ModuleRuntime/Scope 生命周期。

## 2. 性能模型：成本从哪里来

### 2.1 单条 watcher 的成本

对单条 `$.on*` watcher 来说，处理一个事件的成本包括：

1. 源流调度：`actions$` / `changes(selector)` 发出一条事件；
2. 前置处理：
   - `onAction`：跑一次 predicate（例如 `_tag === "xxx"`、Schema 校验等）；
   - `onState`：跑一次 selector + `Stream.changes` 的新旧值比较；
3. handler：
   - `run(handler)`：执行 handler Effect；
   - `update` / `mutate`：`getState → reducer → setState`，再触发下一轮 `changes`。

在实现层，selector / predicate 本身都是纯函数调用，单次成本非常小，真正决定性能的是：

- handler 做的事（尤其是大规模 state 更新、IO）；
- 每个事件命中的 watcher 数量（fan-out）。

### 2.2 多条 watcher 时的线性放大

当某个 Module 的单段 Logic 内有 N 条 watcher 时：

- 每次 Action / State 变更：
  - 所有 watcher 都会各自“看一眼”事件（跑一遍 predicate/selector 与流式管道），这一层是 **O(N)** 的固定成本；
  - 实际命中的 watcher 子集会执行 handler，这部分成本是 **O(N_hit × C_handler)**。
- 典型场景：
  - 按 `_tag` 分流的 onAction：
    - predicate 成本轻（字符串比较），单个 Action 实际命中 watcher 数量通常远小于 N；
  - “字段联动”的 onState：
    - selector 成本轻，但若盯的是高频更新字段，变更频率本身会放大总工作量。

结论：

- watcher 数量本身不是“灾难”，但会为每次事件引入一层 O(N) 的固定前处理成本；
- 真正需要警惕的是：“高频事件 + 大量 watcher 同时命中 + 重 handler”的组合。

## 3. 当前 PoC 的浏览器压测结果

为了建立一个可操作的数量级基线，我们在 `@logix/react` 包中添加了一条基线测试：

- 用例位置：`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
- 场景：
  - 使用 `PerfModule`（state `{ value: number }`，action 只有 `inc`）；
  - 为同一条 `"inc"` Action，在单个 Logic 中挂载不同数量的 `$.onAction("inc").runFork($.state.update(...))` watcher；
  - 在真实浏览器环境（Vitest Browser Mode + Playwright Chromium + vitest-browser-react）中：
    - 渲染 `<PerfApp>`（内部通过 `useModule / useSelector / useDispatch` 使用该 Module）；
    - 对 Button 做一次 click，测量 `start = performance.now()` 到 DOM 中出现 `Value: watcherCount` 的时间；
    - 每个 watcher 数量档位重复多次取平均。

### 3.1 测试环境

- 测试栈：
  - Vitest v4 Browser Mode（`@vitest/browser-playwright`）；
  - Playwright Chromium，headless；
  - `vitest-browser-react` 用于在浏览器中挂载 React 组件。
- 场景设定：
  - 单次测量只做一次 click → 等待单个 State 更新；
  - handler 形态为轻量 `state.update`：
    - `$.state.update(prev => ({ ...prev, value: prev.value + 1 }))`；
    - 主要目的是为每条 watcher 引入一个“非空 handler”，便于放大 fan-out 成本。

### 3.2 实测数据（示意）

在当前开发机器上的一组样本（多次运行细节略有波动，数量级稳定）：

- watchers = 1：
  - 首次 run 有冷启动（JIT、Browser/Playwright/DebugSink 初始化等），平均约 **45ms**；
  - 后续样本多在 20–30ms 之间。
- watchers = 8 / 32 / 64 / 128：
  - 平均 click→paint 延迟基本在 **25–31ms** 区间；
  - 在人眼层面可以视为“无明显差异”。
- watchers = 256：
  - 平均约 **40ms**；
  - 单次点击仍然流畅，但已经能感受到轻微的钝感。
- watchers = 512：
  - 平均约 **60ms**；
  - 在连续点击/高频交互时，人眼很容易感到明显的滞后。

> 注意：上述数字不是硬性指标，只是给出一个代表性硬件上的量级。  
> 真实项目应根据目标运行环境（PC / 移动 / 嵌入式）复跑 `watcher-browser-perf.test.tsx`，以此作为调优参考。

## 4. 设计与调优建议

结合实现与压测，可以给出以下实践建议：

### 4.1 watch 数量基线（单 Module · 单段 Logic 内）

- **绿区（推荐）**：`on*` watcher 数量 **≤ 128**
  - 适合大部分业务场景；
  - 即便部分 watcher 有中等复杂的 handler，整体交互仍然顺滑。
- **黄区（警戒）**：约 **256** 条 watcher
  - 需要明确：
    - 单个 Action 实际命中的 watcher 数量（例如是否有“大多数规则都盯同一个 `_tag`”的情况）；
    - handler 内是否存在大规模 state 更新或高频 IO；
  - 建议在进入黄区之前，优先考虑：
    - 合并相似规则为一条 watcher 内的结构化 match；
    - 拆分 Logic（例如按领域或 trigger 分段）；
    - 将重 handler 下沉到专门的 Flow/Service。
- **红区（避免）**：单段 Logic 内 **≥ 512** 条 watcher
  - 只建议用于 PoC 或极端实验；
  - 正式业务实现应视为违背「易调优」约束，优先通过：
    - 拆 Module（按业务子域拆分）；
    - 拆 Logic（按触发源 / 高频 vs 低频拆分）；
    - 为热点规则引入单独的 Flow/Service；
    - 在同一 Action 上合并多个 handler 为一个统一的 reducer / pipeline。

### 4.2 Dispatch 路径的实际瓶颈

- `dispatch` 本身（DebugSink + PubSub.publish）成本较低；
- 实际瓶颈在于：
  - 所有 watcher 的 predicate/selector 都要执行一次；
  - 命中的 watcher 各自执行 handler，并可能进行：
    - 状态更新（触发新的 `changes`）；
    - 额外 dispatch（形成级联）；
    - IO / 重计算。
- 因此：
  - “轻 handler + 低/中频事件”（例如按钮点击）场景下，哪怕有几百个 watcher，一次 dispatch 的成本总体仍然可控；
  - “重 handler + 高频事件”（输入联想、滚动同步）场景中，应尽量：
    - 减少实际命中的 watcher 数量；
    - 使用 `runLatest` / `debounce` 等 Flow 形态限制 fan-out；
    - 将复杂 handler 降级为专门的 Flow / Service，保持 watcher 本体轻量。

### 4.3 优化方向备忘

如果未来发现某些项目中 watcher 成为了明显瓶颈，可以考虑的优化方向包括：

- 在实现层对 `onAction("tag")` / `onAction(schema)` 进行合并：
  - 在 `actions$` 上先做一次 `_tag` 维度的路由；
  - 针对同一 `_tag` 的多个 watcher，在内核里合并 predicate 或共享部分 pipeline；
  - 但需要权衡实现复杂度与透明度。
- 为热点 Action 引入专门的 Flow/Service：
  - 将多个 handler 合并为一条 Flow pipeline，在其中进行结构化分支；
  - 减少“每个规则一条 `$.onAction`”的 fan-out 数量。
- 针对高频 `onState` watcher，避免监听整棵 state：
  - 始终推荐通过 selector 抽取最小必要视图；
  - 在业务层避免在 `onState` handler 内直接大规模 mutate 整棵 state。

上述优化一旦落地，应同步更新本文件和 `core/03-logic-and-flow.md` 中的相关说明，并视情况扩展或调整压测用例。 
