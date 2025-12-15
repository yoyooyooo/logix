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
export const HeavyFormImpl = HeavyFormModule.implement({
  // 其他配置略
  stateTransaction: {
    instrumentation: 'light',
  },
})
```

观测策略的优先级为：

1. **ModuleImpl 配置**：某个模块显式设置的值；  
2. **Runtime.make 配置**：Runtime 级默认观测策略；  
3. **环境默认值**：`NODE_ENV !== "production"` 时默认 `"full"`，生产环境默认 `"light"`。

> 提示：  
> 在排查性能问题时，可以短暂把某个模块或整个 Runtime 切到 `"light"`，对比一次交互的耗时与 React 渲染次数，帮助判断瓶颈是否来自观测层。

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

一个常见的实践是：

1. 初次开发某个模块时：`instrumentation = "full"` + `mode = "deep"`，完整观察事务与 Trait 行为；  
2. 模块稳定后：切回 `mode = "basic"`，仅保留关键事件；  
3. 遇到性能问题时：  
   - 先在 `"deep"` 模式下用 Overview Strip 与 Timeline 找到“噪声最多”的时间段；  
   - 再结合 `"light"` 观测策略和 `showReactRenderEvents` 开关，验证问题是否来自过多渲染或过多 Trait 事件。

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

## 6. 表单 / 查询专项建议

当你的页面以“复杂表单联动”或“参数化查询”为主时，下面几条经验通常更有效：

1. **把 `deps` 当成契约，而不是提示**  
   - 如果你在开发环境看到 `state_trait::deps_mismatch` 警告，优先修正 `deps`：  
     - 漏写会导致“该更新时不更新”；  
     - 写得过细会导致“无关变更也触发重算”。  
   - 如果规则确实依赖整棵对象，可以声明更粗粒度的 deps（例如依赖 `profile` 而不是 `profile.name`）。

2. **留意 Trait 的超预算降级**  
   - 如果你看到 `trait::budget_exceeded` 之类的警告，说明某次交互的派生计算超出预算。  
   - 常见处理方式：
     - 将重型计算下沉到服务调用或异步任务（把同步派生变成可缓存的结果）；  
     - 给 computed 增加等价判定（避免无变化写回）；  
     - 拆分热点字段周围的规则，降低单次交互的派生 fan-out。

3. **长列表/嵌套数组：尽量提供稳定身份**  
   - 对于“千行表单”或“虚拟滚动”场景，建议每行都有稳定的业务 ID，并在领域层/trait 配置中提供 `trackBy` 提示；  
   - 这能提升缓存复用与异步写回的稳定性，减少因为插入/重排导致的无意义失效。

4. **查询场景：确认缓存引擎已注入并启用**  
   - 如果你希望 Query 具备缓存与 in-flight 去重，请确认 Runtime 作用域内已注入 QueryClient，并启用了对应的 Query 集成中间件；  
   - 若缺失注入，查询会以“配置错误”暴露出来，而不是静默退化为不缓存的行为（避免线上不可控差异）。

通过以上分层策略，你可以在不牺牲调试体验的前提下，让 Logix 在复杂场景中保持可接受的性能表现。
