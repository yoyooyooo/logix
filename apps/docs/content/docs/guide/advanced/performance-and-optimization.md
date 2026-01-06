---
title: 性能与优化
description: 调整 Logix Runtime 和 Devtools 的观测策略，在复杂场景下保持良好性能。
---

# 性能与优化

Logix Runtime 默认以“可观测性优先”的方式工作：  
在开发环境下会完整记录状态事务、Trait 行为和调试事件，配合 Devtools 提供时间线与时间旅行能力。  
在生产环境下则自动收敛为更轻量的观测模式。

本文从「日常业务开发者」视角，整理一套可操作的性能调优思路。

### 适合谁

- 已经在项目中使用 Logix Runtime / `@logix/react`，并开启了 Devtools；
- 希望在高频交互、复杂表单或长列表场景下保持良好响应速度。

### 前置知识

- 了解 `Logix.Module` / `Module.logic` / `Module.live` 的基本用法；
- 知道如何通过 `Logix.Runtime.make` 创建 Runtime，并在 React 中使用 `RuntimeProvider` / `useModule`。

### 读完你将获得

- 明白一次用户交互的主要成本落在哪些位置；
- 能够通过 `stateTransaction.instrumentation` 和 Devtools 设置控制观测开销；
- 在遇到“高 Trait 密度 / 高 watcher 数量”时，有一套分层优化 checklist。

## 0. 先记住 5 个关键词

1. **事务窗口**：一次同步入口的写入聚合边界，窗口结束最多一次对外提交。
2. **影响域（dirtySet）**：这次写入影响到哪些字段；决定增量派生/校验范围与归因质量。
3. **派生闭包**：提交前的同步收敛链（派生/校验写回），尽量留在同一事务内。
4. **可见性调度（priority）**：提交对 UI 的通知节奏（normal/low），用于减少非必要渲染（不改变最终状态）。
5. **证据链**：每次提交都能解释“谁触发 / 影响什么 / 为何这样调度 / 是否发生退化”。

### 粗粒度成本模型（你在为哪些成本买单）

- **事务次数**：决定 UI 通知次数与派生/校验频率上界。
- **dirtySet 质量**：越精确越容易走增量；`dirtyAll` 越多越容易退化全量。
- **派生/校验规模**：规则越多、依赖越深，越依赖增量与计划缓存复用。
- **React 渲染 fan-out**：订阅切片越粗、列表 identity 越不稳定，渲染压力越大。
- **模块初始化**：模块启动时的 build/setup/install（包括 traits 汇总、合并与安装）会影响首屏/首次可用性。
- **诊断等级**：证据越多越可解释，但启用时应有可预估的额外成本。

### Traits 组合的成本模型（`$.traits.declare` / Module `traits`）

当你在模块中大量使用 traits（包括 Module-level `traits`，以及 Logic setup 中的 `$.traits.declare`）时，初始化阶段会多做几件事：

1. **收集**：把 module-level 与每个 logicUnit 的声明汇总到同一个集合。
2. **确定性合并**：按稳定规则合并为“最终 traits 集”（同输入不随组合顺序漂移）。
3. **一致性校验**：检查重复 `traitId`、互斥/前置条件等配置问题；失败会在进入运行前暴露。
4. **冻结 + 安装**：setup 完成后冻结 traits；并在初始化阶段一次性安装对应的行为 Program。

常见调优点：

- **控制规模**：traits 数量越多，初始化越慢；优先把真正“通用且高复用”的规则抽成共享 Logic/Pattern，其余留在具体模块内。
- **稳定标识**：给复用 Logic 提供稳定 `logicUnitId`，避免来源漂移导致对比/回放困难。
- **按需观测**：性能敏感路径用默认（或显式）关闭诊断；排障时再切到 `light/full`，并用证据包对比 `digest/count`。

### 一条通用的优化梯子（从默认到拆分/重构）

当你遇到性能问题时，建议按下面顺序推进（越往后成本越高，但收益也更可控）：

1. **默认**：先用默认配置与声明式写法跑通，保持语义清晰。
2. **观察**：开启 Devtools、导出证据包，先定位瓶颈属于“事务次数 / dirtySet / 派生规模 / 渲染 fan-out / 初始化”。
3. **收窄写入**：优先用 `immerReducers` / `$.state.mutate`（或 `Module.Reducer.mutate/mutateMap` 作为 escape hatch）让运行时能采集更精确的影响域；避免无意义的全量 setState。
4. **稳定标识**：为列表项/逻辑单元提供稳定的业务 ID（例如 list `trackBy`、logicUnitId），减少漂移与无谓重算/重渲染。
5. **覆盖/调优**：只在热点模块上做局部 override（观测档位、调度/预算阈值等），并用证据包固化回归窗口。
6. **拆分/重构**：当单个模块/逻辑密度过高时，拆分 Module / Logic / Trait 规则，回收复杂度与诊断可解释性。

## 1. 一次交互的成本落在哪？

在 Logix 中，一次典型的用户交互（如输入、点击）大致会经历：

1. **Action 派发**：`dispatch(action)`，触发一次 StateTransaction。
2. **事务内部逻辑**：reducer / Trait / middleware 等在事务内多次读写 state。
3. **状态提交**：事务 `commit`，对外只写一次状态并触发一次订阅通知。
4. **React 渲染**：受影响的组件根据选择器结果重新渲染。
5. **调试与 Devtools**：记录调试事件、更新 Devtools Timeline / 视图。

通常来说：

- **真正的大头在 React 渲染和你自己写的业务逻辑**；
- Logix Runtime 与调试层的开销主要来自：
  - watcher / Trait 数量（fan-out 多时，每次事件要经过更多处理）；
  - 观测策略（是否记录 Patch / 快照 / 细粒度调试事件）；
  - Devtools 是否开启深度模式并显示大量事件。

后续几节会分别介绍如何控制这些部分的成本。

## 2. 控制 StateTransaction 观测开销

Logix 在内部使用 `StateTransaction` 封装一次逻辑入口下的全部状态演进，并保证：

- **单入口 = 单事务 = 单次状态提交**：  
  一次交互只会产生一次 `state:update` 事件和一次外部订阅通知。
- 所有 Patch / Trait 步骤都归属于同一个 `txnId`，方便在 Devtools 中分析事务。

在此基础上，你可以通过 **观测策略（Instrumentation）** 控制记录的细节程度。

### 2.1 观测级别：`"full"` vs `"light"`

- `"full"`（默认用于本地开发 / 测试）
  - 记录 Patch 列表、事务前后的状态快照；
  - 在调试事件中附带 `patchCount` / `originKind` 等信息；
  - 支持 Devtools 的事务视图、时间旅行和字段级 diff。
- `"light"`（默认用于生产）
  - 只保留必要的计时信息与最终状态；
  - 不再构建 Patch / 快照，降低内存与 CPU 开销；
  - 仍然保证“单事务 = 单次提交”的语义。

### 2.2 配置入口与优先级

你可以在 Runtime 级或单个 Module 级别配置观测策略：

```ts
import * as Logix from '@logix/core'

// 应用级默认观测策略
const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    instrumentation: 'full', // 或 'light'
  },
})
```

在少数高频模块（如拖拽、动画、频繁输入表单）上，可以单独降级为 `"light"`：

```ts
// HeavyFormDef = Logix.Module.make(...)
export const HeavyFormModule = HeavyFormDef.implement({
  // 其他配置略
  stateTransaction: {
    instrumentation: 'light',
  },
})

export const HeavyFormImpl = HeavyFormModule.impl
```

观测策略的优先级为：

1. **ModuleImpl 配置**：某个模块显式设置的值；
2. **Runtime.make 配置**：Runtime 级默认观测策略；
3. **环境默认值**：`NODE_ENV !== "production"` 时默认 `"full"`，生产环境默认 `"light"`。

> 提示：  
> 在排查性能问题时，可以短暂把某个模块或整个 Runtime 切到 `"light"`，对比一次交互的耗时与 React 渲染次数，帮助判断瓶颈是否来自观测层。

### 2.3 （可选）控制派生收敛的策略与预算

如果你的场景里有大量“派生字段 / 联动规则 / computed 值”，一次交互需要做较多联动计算，那么除了观测级别之外，还可以通过收敛调度控制面做两件事：

- 出现回归时快速止血回退到更稳妥的模式；
- 在页面/模块范围内试探更合适的默认值（并可回滚）。

详见：[收敛调度控制面](./converge-control-plane)

## 3. 使用 Devtools 设置控制噪音

在开启 Devtools 时，观测开销还与 Devtools 的设置有关。常用的几个开关：

- `mode: "basic" | "deep"`
  - `basic`：只展示 Action / State / Service 等粗粒度事件，隐藏 Trait 细节和时间旅行控件，适合日常开发；
  - `deep`：展示 Trait 级事件、React 渲染事件以及时间旅行按钮，适合深入排查。
- `showTraitEvents` / `showReactRenderEvents`
  - 在高频渲染或大量 Trait 的场景下，可以暂时关闭某类事件，以减少时间线噪音。
- `eventBufferSize`
  - 控制 Devtools 内部保留的事件数量（默认约 500 条）；
  - 在极端调试场景下可以临时放大，但不建议长期设置为几千以上，以免 Devtools 自身占用过多内存。

### 3.1 Runtime 级可调开关（除了收敛调度控制面以外）

如果你想更“确定”地控制观测开销（而不是只靠 UI 开关），可以从 Runtime 配置入手：

```ts
import * as Logix from "@logix/core"

const runtime = Logix.Runtime.make(RootImpl, {
  // 不传 devtools 或设为 false：Devtools 相关观测不会启用（更省）
  devtools: {
    bufferSize: 500,      // Devtools 事件窗口长度（越大越占内存）
    observer: false,      // 关闭 effectop trace（需要时再打开）
    sampling: { reactRenderSampleRate: 0.1 }, // 可选：降低 React 渲染事件采样率
  },
})
```

另外还有一个很常用但容易混淆的开关：

- **诊断分档**（`Debug.diagnosticsLevel`）：控制“是否输出/输出多少调试事件”（`off` 几乎零开销但完全失明；`sampled` 用低成本采样保留长尾定位能力；`light/full` 适合排查问题与解释链路）。
- **事务观测级别**（`stateTransaction.instrumentation`）：控制“事务里是否记录 Patch/快照”等结构化信息（`full` 更好调试，`light` 更省）。

#### 诊断分档：off / sampled / light / full（怎么选）

诊断分档影响的是「Devtools / TrialRun 等导出面」会生成/保留多少调试事件；  
它不会改变你的业务逻辑语义，但会影响“你能看到多少证据”以及“额外开销有多大”。

- `off`：几乎零开销，适合基准/极致性能确认；代价是几乎没有解释链路（Devtools/证据包会非常贫瘠）。
- `sampled`：低成本保留定位能力（尤其是 Trait 收敛链的热点定位）。运行时会按事务做**确定性采样**，只在命中的事务里输出收敛链的 Top-K 热点摘要（payload 仍保持 slim）。
- `light`：每次事务都输出 slim 事件，适合作为默认“可观测但不太贵”的档位；但不提供收敛链 step 级的热点摘要。
- `full`：信息最全、也最“贵”，适合短时间深度排查与解释链路对齐。

如果你主要关心“复杂表单/长列表的联动收敛是否卡顿”，推荐优先用 `sampled`；  
只有当 sampled 的摘要不足以定位问题时再切到 `full`。

示例：为某个 Runtime 显式启用 `sampled`（并配置采样频率与热点 Top-K 上限）

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    Logix.Debug.devtoolsHubLayer({
      diagnosticsLevel: 'sampled',
      traitConvergeDiagnosticsSampling: { sampleEveryN: 32, topK: 3 },
    }),
  ),
})
```

一个常见的实践是：

1. 初次开发某个模块时：`instrumentation = "full"` + `mode = "deep"`，完整观察事务与 Trait 行为；
2. 模块稳定后：切回 `mode = "basic"`，仅保留关键事件；
3. 遇到性能问题时：
   - 先在 `"deep"` 模式下用 Overview Strip 与 Timeline 找到“噪声最多”的时间段；
   - 再结合 `"light"` 观测策略和 `showReactRenderEvents` 开关，验证问题是否来自过多渲染或过多 Trait 事件。

### 3.2 TrialRun：离线采集证据与 IR（对比/回归用）

当你需要做“重构不回退”的对比时，推荐使用 **TrialRun** 在受控环境中跑一次程序，并导出可机器处理的证据包：

- 你可以在 **不打开 Devtools UI** 的情况下收集关键证据；
- 可以显式控制 `diagnosticsLevel` 与 `maxEvents`，避免“观测者效应”；
- 导出的 `EvidencePackage.summary` 能回答“当前实例启用了哪些运行时策略/覆写”，并提供可比较的 IR 摘要。

```ts
import * as Logix from "@logix/core"
import { Effect } from "effect"

const result = await Effect.runPromise(
  Logix.Observability.trialRun(program, {
    runId: "perf-check-1",
    source: { host: "node", label: "trial-run" },
    diagnosticsLevel: "light",
    maxEvents: 200,
  }),
)

// summary.runtime.services：运行时策略与覆写来源证据（Slim，可序列化）
// summary.converge.staticIrByDigest：静态 IR 摘要（按 digest 去重，便于对比）
console.log(result.evidence.summary)
```

实战建议：

1. 先用同一份输入跑出一份“基线证据包”（保存起来作为对比）；
2. 再在改动后用同样的输入跑一遍，比较 `summary` 的关键字段与事件密度；
3. 如果你只关心性能，不关心解释链路：优先用 `diagnosticsLevel: "off"` + 更小的 `maxEvents` 做一次确认。

## 4. Watcher 与 Trait 粒度建议

Logix 允许你在同一 Module 内挂载大量 `$.onAction` / `$.onState` watcher 和 Trait 节点。  
从实践经验看，下面的经验值可以作为参考：

- 单个 Module / 单段 Logic 内的 watcher 数量：
  - 约 **≤ 128**：通常处于“安全区”，一次交互的延迟主要由业务逻辑和 React 决定；
  - 约 **256**：需要留意是否有很多 watcher 同时命中、handler 做了较重的工作；
  - **≥ 512**：建议优先考虑拆分 Module / Logic，或合并规则，而不是简单堆叠 watcher。
- Trait 粒度：
  - 对于高频更新的字段（如正在输入的表单项），尽量避免挂载过多层级的 computed/link；
  - 对于只在提交时需要的统计信息，可以考虑延后到提交逻辑中计算，而不是每次输入都通过 Trait 维护；
  - 在 TraitGraph 中观察某个字段周围的节点密度，如发现某些热点字段挂了过多 Trait，可以优先考虑简化。

简化粒度的常见手段包括：

- 合并多个相似规则为一条 watcher 内的结构化 match，而不是复制多条相似 watcher；
- 将与 UI 无关的重计算下沉到 Service 或专用 Flow，而不是在 Trait / watcher 中同步完成；
- 对于长列表或虚拟滚动场景，优先使用列表虚拟化组件，减少每次状态变更需要重新渲染的节点数量。

### 4.1 高频 watcher 的写法建议

当你的页面里存在大量 `$.onAction / $.onState`（或少量但非常高频）时，优先遵循下面几条经验法则：

- **把 watcher 当作“长期订阅”**：每一条 `.run* / .update / .mutate / .runFork` 都会启动一条长期运行的监听；数量越多，一次事件需要经过的处理链路就越长。
- **让 handler 尽量快（尤其是高频事件）**：
  - 把重计算/IO 尽量放到 Effect 内部，并用合适的执行策略限制吞吐（见下条）。
  - 如果你观察到 dispatch 在高频场景下出现明显“等待/卡顿”，通常意味着事件产生速度超过了监听器的消费速度：优先做 debounce/throttle、合并 watcher、或降低单次 handler 的同步工作量。
- **为不同语义选择合适的 `.run*` 策略**：
  - **搜索/联想/输入驱动请求**：`debounce + runLatest`（新输入到来时取消旧请求，只保留最新）。
  - **提交/保存/幂等操作**：`runExhaust`（忙时忽略新事件，避免重复提交）。
  - **允许并发但要控量**：使用 `runParallel` 时要意识到并发度受 Runtime 并发策略影响；在性能敏感模块里避免“无限并发”的假设（详见 [并发控制面](./concurrency-control-plane)）。
- **能用 reducer 就别用 watcher**：如果某个 Action 的结果只是纯同步地更新状态，优先用 `$.reducer(...)`（或 Module Reducer）承载它，把 watcher 留给需要 IO/复杂编排的场景。
- **`onState` selector 返回“稳定值”**：
  - selector 的变化去重通常以“值相等/引用相等”为基础；如果 selector 每次都返回新对象/新数组，会导致几乎每次提交都被视为“变化”，从而放大 watcher 压力。
  - 优先返回 primitive、稳定引用，或拆成更细粒度的 selector（只订阅真正关心的字段）。

## 5. 高频场景调优 checklist

在你感觉“这个页面有点卡”时，可以按照下面的顺序排查：

1. **确认事务语义是否正常**
   - 打开 Devtools，检查一次交互是否只产生一条 `state:update` 事件；
   - 如发现单次交互出现了多条提交，需要优先排查逻辑是否重复写入状态。
2. **观察 React 渲染次数**
   - 在 Timeline 中切换到 `react-render` 视图，查看一次事务触发了多少组件渲染；
   - 结合 selector 优化（只订阅必要字段）和列表虚拟化，降低渲染 fan-out。
3. **调整观测策略**
   - 在本地把目标模块或 Runtime 切到 `instrumentation = "light"`，对比性能差异；
   - 如果差异明显，说明观测层占用了一部分预算，可以在 Devtools 中适当关闭深度事件或缩小事件窗口。
4. **梳理 watcher / Trait 数量**
   - 查找高频 Action / 字段周围的 watcher 和 Trait 节点数量；
   - 按前一节建议合并或下沉逻辑，减少一次事件需要经过的处理链路长度。
5. **回到业务视角做权衡**
   - 对于真正需要强观测能力的关键模块（如财务流水、风控流程），可以保留 `"full"` 观测与更细的 Trait 粒度；
   - 对于只需“跑得快”的纯展示模块，可以大胆使用 `"light"` + `mode = "basic"` 组合，把更多预算留给 UI 动效和业务逻辑。

## 6. 显式 Batch 与低优先级更新（高频兜底）

如果你还不熟悉 “tick/flush/trace:tick” 的含义，建议先读：[`Tick / Flush（从输入到稳定快照）`](../essentials/tick-and-flush)（它解释了为什么这些优化能减少“可观察提交/通知”，以及为什么它们不等价于“严格减少 render 次数”）。

当你遇到“输入很频繁 / 同步 dispatch 太多 / React render 压力大”时，可以在不改变业务正确性的前提下，显式选择两种兜底策略：

- **Batch（批处理窗口）**：把多次同步写入合并为一次可观察提交（一次订阅通知 + 一条 `state:update`）。
- **低优先级更新**：把部分更新标记为可延迟/可合并，让 UI 把更多预算留给高优先级交互（仍保证最终必达）。

### 6.1 Batch：合并多次 dispatch

如果你有“连发多个 Action 才能完成一次业务状态变更”的场景，优先使用 `dispatchBatch`：

```ts
const rt = runtime.runSync(MyModule as any)

yield* rt.dispatchBatch([
  { _tag: "setValue", payload: { path: "a", value: 1 } },
  { _tag: "setValue", payload: { path: "b", value: 2 } },
])
```

在 Devtools 中你会看到该次提交的 `state:update.commitMode = "batch"`。

它的最佳实践与边界是：

- **同一业务意图窗口**：把“同一次用户交互/同一次事件回调”里连续触发的多个 dispatch 收口到 batch（减少提交次数与 render 次数）。
- **不依赖中间派生结果**：batch 会延迟 converge/validate 到最后一次提交；如果你期望 Action A 之后 computed/validate 立刻更新并被 Action B 读取，这类写法不适合 batch。
- **不要把 IO 放进 batch**：batch 的收益来自“一个事务窗口内累积 dirty-set 并一次性收敛”，如果在中间等待 IO，会把实例级串行队列整体阻塞（Head-of-Line Blocking）。

### 6.2 低优先级更新：减少非必要 render

对于“不会影响当前输入手感/点击反馈，但又需要最终更新 UI”的场景（例如：实时统计、列表衍生摘要、非关键提示），可以使用 `dispatchLowPriority`：

```ts
yield* rt.dispatchLowPriority({ _tag: "recomputeSummary", payload: undefined } as any)
```

在 Devtools 中你会看到：

- `state:update.commitMode = "lowPriority"`
- `state:update.priority = "low"`

React 侧会用更温和的调度策略合并通知（例如 `requestAnimationFrame` / timeout 兜底），以减少高频渲染压力。

它的语义边界是：

- **仍然会提交**：状态更新与派生/校验仍按正常事务提交，保证最终必达；
- **只影响通知节奏**：低优先级只影响 React 订阅通知的调度（更晚、可合并），不改变模块内部的执行顺序；
- **会被普通提交打断**：如果在低优先级通知尚未 flush 之前又发生了普通优先级提交，React 会优先 flush 普通提交，并取消待执行的 lowPriority flush；
- **不适用于交互关键路径**：输入框 value/光标/拖拽反馈等需要“立刻更新”的 UI 不应使用 lowPriority。

默认情况下：低优先级通知会近似“推迟到下一帧”（约 16ms），并有最大延迟上界（默认 50ms）。如需调整，可通过配置键：

- `logix.react.low_priority_delay_ms`
- `logix.react.low_priority_max_delay_ms`

### 6.3 迁移指南（旧写法 → 新模式）

1. **多次同步 dispatch → `dispatchBatch`**
   - 旧：连续 `dispatch(a1)`、`dispatch(a2)`，每次都会产生一次可观察提交。
   - 新：把同一“业务意图”内的多次派发收敛到 `dispatchBatch([...])`。

2. **手写 setTimeout/raf 合并渲染 → `dispatchLowPriority`**
   - 旧：在 UI 层用 `setTimeout`/`requestAnimationFrame` 手动合并 dispatch 或 setState。
   - 新：把“可延迟”的那类更新显式标记为 lowPriority，让运行时与 React 适配层统一负责调度与上界。

3. **全量 update/setState → `immerReducers` / `$.state.mutate` / `$.onAction(...).mutate`（或 `Module.Reducer.mutate/mutateMap`）**
   - 旧：`(s) => ({ ...s, a: s.a + 1 })`、`$.state.update((s) => ({ ...s, a: s.a + 1 }))` 这类“整棵替换”很难提供字段级影响域，派生/校验更容易退化为全量路径。
   - 新：优先使用 `immerReducers`、`$.state.mutate(...)` 或 `$.onAction(...).mutate(...)`，让运行时自动采集“变更路径”，用于增量派生/校验；如果你想保留 `reducers` 字段，再用 `Logix.Module.Reducer.mutate/mutateMap` 包装。

例如：在 `Module.make` 内直接定义 draft 风格 reducers（推荐）：

```ts
immerReducers: {
  inc: (draft) => {
    draft.count += 1
  },
  add: (draft, payload) => {
    draft.count += payload
  },
},
```

如果你想保持 `reducers` 字段，也可以用 `Logix.Module.Reducer.mutateMap({...})` 批量包装：

```ts
reducers: Logix.Module.Reducer.mutateMap({
  inc: (draft) => {
    draft.count += 1
  },
  add: (draft, payload) => {
    draft.count += payload
  },
}),
```

类型提示：如果你发现 `mutateMap` 里 `draft/payload` 在 IDE 里退化成了 `any`，优先改用 `immerReducers`；或用 `satisfies Logix.Module.MutatorsFromMap<typeof State, typeof Actions>` 给 mutators 显式“挂上”类型约束。

同时需要“普通 reducer”时，可以同时提供 `immerReducers` 与 `reducers`（同名 key 以 `reducers` 为准）：

```ts
immerReducers: {
  inc: (draft) => {
    draft.count += 1
  },
},
reducers: {
  reset: (state) => ({ ...state, count: 0 }),
},
```

当你在开发环境看到 `state_transaction::dirty_all_fallback` 诊断时，通常意味着需要执行第 3 条迁移。

## 7. 表单 / 查询专项建议

当你的页面以“复杂表单联动”或“参数化查询”为主时，下面几条经验通常更有效：

1. **把 `deps` 当成契约，而不是提示**
   - 如果你在开发环境看到 `state_trait::deps_mismatch` 警告，优先修正 `deps`：
     - 漏写会导致“该更新时不更新”；
     - 写得过细会导致“无关变更也触发重算”。
   - 如果规则确实依赖整棵对象，可以声明更粗粒度的 deps（例如依赖 `profile` 而不是 `profile.name`）。

2. **用 `validateOn / reValidateOn` 控制“每次输入”的校验工作量**
   - 默认是“两阶段触发”：首次提交前倾向只在提交时校验；首次提交后再按 change/blur 做增量校验。
   - 对于跨行校验、复杂依赖或高频输入表单：优先让 `validateOn` 更保守（例如只保留 `"onSubmit"`），必要时用 `controller.validatePaths(...)` 精确触发局部校验。

3. **留意 Trait 的超预算降级**
   - 如果你看到 `trait::budget_exceeded` 之类的警告，说明某次交互的派生计算超出预算。
   - 常见处理方式：
     - 将重型计算下沉到服务调用或异步任务（把同步派生变成可缓存的结果）；
     - 给 computed 增加等价判定（避免无变化写回）；
     - 拆分热点字段周围的规则，降低单次交互的派生 fan-out。

4. **在 React 侧只订阅“你真正需要的状态切片”**
   - 避免订阅整棵 values/errors；优先用 selector 订阅聚合后的视图状态（例如 `canSubmit/isSubmitting/isValid/isDirty/submitCount`）。
   - `@logix/form/react` 提供 `useFormState(form, selector)`，能在不扫描大树的前提下稳定获取这些状态。

5. **长列表/嵌套数组：尽量提供稳定身份**
   - 对于“千行表单”或“虚拟滚动”场景，建议每行都有稳定的业务 ID，并在领域层/trait 配置中提供 `trackBy` 提示；
   - 这能提升缓存复用与异步写回的稳定性，减少因为插入/重排导致的无意义失效。

6. **查询场景：确认缓存引擎已注入并启用**
   - 如果你希望 Query 具备缓存与 in-flight 去重，请确认 Runtime 作用域内已注入 QueryClient，并启用了对应的 Query 集成中间件；
   - 若缺失注入，查询会以“配置错误”暴露出来，而不是静默退化为不缓存的行为（避免线上不可控差异）。

通过以上分层策略，你可以在不牺牲调试体验的前提下，让 Logix 在复杂场景中保持可接受的性能表现。

## 8. 常见反模式（高概率导致退化）

- 在事务窗口内做 IO/await（会把“同步窗口”变成不可预测的长事务）。
- 使用不可追踪的写入方式，导致 `dirtySet.dirtyAll = true`，进而派生/校验全量。
- 在高频交互（输入/拖拽）里频繁使用 `$.state.update` / `$.onAction(...).update` / `runtime.setState` 这类全量写入。
- 在 UI 侧订阅整棵 state 或把大对象直接作为 props 传递，导致无谓重渲染。
- 列表用 index 当 id（插入/重排会把小变更放大成大范围影响）。
- 把重型计算写进同步派生/校验（建议下沉到服务/异步任务或拆分热点依赖）。
