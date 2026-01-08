---
title: 收敛调度控制面
description: 通过 Runtime/Provider/模块级覆盖，控制 Trait 收敛策略（auto/full/dirty）与预算，支持止血回退与默认值调参。
---

# 收敛调度控制面

这是一份“能直接上手”的高级指南：教你在不理解底层细节的前提下，通过少量配置就能做到：

- **止血**：当某个页面/模块突然变慢或不稳定时，快速回退到更稳妥的模式（只影响局部）。
- **调参**：在不影响整体的情况下，逐步试探更合适的默认值（并能回滚）。

## 适合谁

- 你在用 Logix 做表单联动/派生字段/规则计算，出现交互卡顿或一次升级后性能波动；
- 你希望“不改业务逻辑”就能快速验证：问题是不是出在收敛策略上，并能安全回退。

## 先用一句话理解「收敛」

你可以把 **收敛（converge）** 理解为：

> 当 state 发生变化后，运行时需要把一批“派生值 / 联动规则 / computed 字段”重新算一遍，让最终状态一致。

收敛的核心矛盾只有一个：

- **全量重算**（稳，但可能浪费）；
- **只重算受影响部分**（快，但需要更多判断/更依赖依赖关系准确）。

控制面就是让你在这两者之间“可控地切换”。

## 你能控制什么

### 1) 调度策略：`traitConvergeMode`

把它当成“三档开关”即可：

- `"auto"`（默认）：运行时自己决定“这次用全量还是局部”，目标是在不牺牲稳定性的前提下尽量快。
- `"full"`（最稳）：每次都做全量收敛，最适合当作“稳定基线/止血回退”。
- `"dirty"`（更激进）：每次尽量只重算受影响部分。适合你非常确定写入是局部的、且联动依赖关系足够准确的模块。

### 2) 两个预算：`traitConvergeBudgetMs` / `traitConvergeDecisionBudgetMs`

你不需要知道具体怎么算，只要记住它们的“手感”：

- `traitConvergeBudgetMs`：**这一笔交互最多愿意花多少时间做收敛**（越大越“肯算”，越小越“保响应”）。
- `traitConvergeDecisionBudgetMs`：`auto` 在做“该不该局部重算”的判断时允许花的时间（越小越保守，越容易直接回退到 `"full"`）。

如果你完全不配：运行时会使用默认值（目前 `traitConvergeMode="auto"`、`traitConvergeBudgetMs=200ms`、`traitConvergeDecisionBudgetMs=0.5ms`）。

### 3) time-slicing：`traitConvergeTimeSlicing`（显式 Opt-in）

当模块里 traits 数量很大（例如 1000+）且交互频繁时，你可能会遇到“每次输入都要检查/收敛一大堆派生”的硬上限。  
这时可以考虑 time-slicing。

先把几个概念讲清楚（不需要理解底层细节）：

- **一次事务窗口 / 一笔交互窗口**：你可以粗略理解为“一次状态提交”（例如一次 `dispatch`、一次 `$.state.mutate(...)`、一次业务逻辑触发的状态写入）。运行时会把这个窗口内产生的所有写入合并成一次提交。
- **immediate**：这个窗口结束时就必须是最新值（适合关键业务字段、校验、提交门控等）。
- **deferred**：允许短时间滞后，先不在当前窗口算，之后会补算（适合 UI 展示/格式化/非关键统计等）。

time-slicing 的核心做法很简单：

- **把 traits 显式分两类**：`immediate`（必须同窗口收敛）与 `deferred`（允许短暂读到旧值）；
- **每次窗口只收敛 immediate**，把 deferred 的工作合并到后续窗口里补算（带上界，避免饿死）。

重要：**time-slicing 不会自动把任何 trait 变成 deferred**。只有你显式标了 `scheduling: "deferred"` 的 `computed/link` 才会被延后；没标的仍然按 immediate 处理。

开关在 stateTransaction 下（默认关闭）：

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeTimeSlicing: {
      enabled: true,
      debounceMs: 16,   // “停下来多久才补算”（建议从 16ms/一帧开始）
      maxLagMs: 200,    // “最晚多久必须补上”（避免 deferred 永远不补算）
    },
  },
})
```

下面用更直白的话解释这三个字段：

- `enabled`：是否启用 time-slicing（默认 `false`）。
- `debounceMs`（合并窗口，单位 ms）：当你连续输入/连续触发事务时，运行时会先“攒一攒” deferred 的工作；**当你停止触发并持续 `debounceMs` 没有新事务**，就会补算一次 deferred（默认 `16`）。
- `maxLagMs`（最大滞后上界，单位 ms）：从第一次“需要补算 deferred”开始计时，**即使你一直在连续输入**，也会在到达 `maxLagMs` 后强制补算一次（避免 deferred 永远不补算，默认 `200`）。  
  你可以把它当成：deferred 值“允许过期”的最长时间。

### 怎么理解「最大滞后上界（maxLagMs）」？

假设 `maxLagMs=200`：

- 你在输入框里持续打字：deferred 字段（例如展示用 `priceText`）可能会暂时保持旧值；
- 但它**最晚**会在“第一次输入触发后”的 200ms 左右补上一次（中间可能因为你暂停输入更早补算）。

你应该如何选它：

- UI 只要“别抖、别卡”，允许一点滞后：从 `200ms` 开始。
- UI 必须更“跟手”：尝试 `100ms`，甚至更小（但补算更频繁，收益会变小）。
- UI 可以明显晚一点也没关系（例如非关键统计、辅助提示）：可以 `300ms~500ms`，但注意用户是否会感到“数值不可信”。

### 什么时候建议开 time-slicing？

- traits/派生很多（比如 1000+）且交互高频，明显感觉“每次输入都在做很多不必要的派生计算”。
- 你能明确划分：哪些派生是“必须立刻一致”的（immediate），哪些是“允许短暂过期”的（deferred）。

### 什么时候不建议开？

- 你没有把握哪些字段可以延后；或者业务强一致依赖派生结果（校验/提交/库存/金额等）。
- 你希望“每次输入后 UI 立刻完全一致”，不能接受短暂过期（哪怕 100ms）。

### 怎么调参（推荐流程）

1. **只在一个卡顿的模块上试**（用模块级 override，见“配方 E”），不要全局一刀切。
2. 先把最安全的一小批派生标成 `deferred`（例如展示文案、格式化、非关键统计），观察体验。
3. 如果还卡：再逐步扩大 deferred 范围，或适当增大 `debounceMs`（更容易合并高频输入）。
4. 如果“值更新太慢/用户不信任”：减小 `maxLagMs`，或把关键派生改回 immediate。

### 我怎么确认它真的生效了？

最直接的判断方式是“行为差异”：

- 开启后：同一次输入/事务结束时，immediate 字段已更新，但 deferred 字段可能还没更新；在 `debounceMs`/`maxLagMs` 到达后会补上。
- 未开启（或没有任何 deferred）：每次事务结束时，所有派生都应在同一窗口内完成更新（行为与以前一致）。

### 4) 覆盖范围：全局 / 模块级 / Provider 子树

你可以在三个层级注入配置：

1. **Runtime 默认**：全局生效（适合做“全局开关/默认值”）。
2. **按模块覆盖**：只影响某个模块（最常用的止血方式）。
3. **Provider 子树覆盖**：只影响某棵 React 子树（适合在页面级做试探，或只对某个业务域调参）。

覆盖优先级为：`provider > runtime_module > runtime_default > builtin`，且配置会在**下一笔事务**开始时生效（不会打断一半的交互）。

## 先解决一个现实问题：`moduleId` 到底填什么？

`moduleId` 就是你创建模块时传给 `Logix.Module.make(...)` 的那串字符串：

```ts
const OrderForm = Logix.Module.make("OrderForm", { /* ... */ })
// 这里的 "OrderForm" 就是 moduleId
```

如果你不确定：直接在代码里搜 `Module.make("OrderForm"` 或搜 `Module.make(` 看看有哪些 id。

## 常用配方

### 配方 A：模拟“旧基线”（全量收敛）

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeMode: "full",
  },
})
```

### 配方 B：只对某个模块止血回退（推荐）

当你发现“只有某个页面/模块卡”，优先用这个方式止血：其它模块继续走默认策略。

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeMode: "auto",
    traitConvergeOverridesByModuleId: {
      OrderForm: { traitConvergeMode: "full" },
    },
  },
})
```

### 配方 C：在 React 子树范围内试探默认值（页面级调参）

```tsx
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"

const overrides = Logix.Runtime.stateTransactionOverridesLayer({
  traitConvergeMode: "auto",
  traitConvergeDecisionBudgetMs: 0.25,
  traitConvergeOverridesByModuleId: {
    OrderForm: { traitConvergeMode: "full" },
  },
})

export function App({ runtime }: { runtime: Logix.ManagedRuntime<any, any> }) {
  return (
    <RuntimeProvider runtime={runtime} layer={overrides}>
      {/* 这棵子树下生效 */}
    </RuntimeProvider>
  )
}
```

### 配方 D：运行时热切换某个模块（排查用，避免频繁发版）

```ts
import * as Logix from "@logixjs/core"

Logix.Runtime.setTraitConvergeOverride(runtime, "OrderForm", { traitConvergeMode: "full" })
// 取消覆盖：传 undefined
Logix.Runtime.setTraitConvergeOverride(runtime, "OrderForm", undefined)
```

> 提示：热切换是止血/排查工具，不建议把它当成长期配置系统；长期默认值应固化在 Runtime/Provider 配置中。

### 配方 E：只对某个模块开启 time-slicing（大 N 高频输入止血）

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  stateTransaction: {
    traitConvergeMode: "dirty",
    traitConvergeOverridesByModuleId: {
      OrderForm: {
        traitConvergeTimeSlicing: { enabled: true, debounceMs: 16, maxLagMs: 200 },
      },
    },
  },
})
```

### 配方 F：如何把 trait 标成 deferred（必须显式声明）

> 只有“允许短暂读到旧值”的派生才适合 deferred（例如 UI 展示用文案、非关键统计）；关键业务字段请保持 immediate。

```ts
import * as Logix from "@logixjs/core"

const Traits = Logix.StateTrait.from(State)({
  // immediate（默认）：同窗口收敛
  priceWithTax: Logix.StateTrait.computed({
    deps: ["price"],
    get: (price) => price * 1.13,
  }),

  // deferred：允许延后补算（需要先在 runtime 打开 traitConvergeTimeSlicing）
  priceText: Logix.StateTrait.computed({
    deps: ["price"],
    scheduling: "deferred",
    get: (price) => `¥${price.toFixed(2)}`,
  }),

  // link 同样支持 scheduling（示例：把某字段映射到展示字段）
  displayPrice: Logix.StateTrait.link({ from: "price", scheduling: "deferred" }),
})
```

## 一套接地气的流程：止血 → 对比 → 回收

### 1) 止血（先让业务能跑）

优先按模块回退：

1. 找到变慢的模块 `moduleId`；
2. 加一条 `traitConvergeOverridesByModuleId[moduleId].traitConvergeMode="full"`；
3. 验证页面是否恢复（至少应该“更稳、更可预期”）；
4. 记录这条覆盖（便于后续回收）。

### 2) 对比（确认问题是不是出在收敛策略）

你不需要精确测量也能做第一轮判断：

- `"full"` 明显更稳：说明“自动/局部策略”可能需要调参或进一步排查。
- `"full"` 和 `"auto"` 差不多：说明瓶颈可能不在收敛（转去看渲染/观测/业务逻辑）。

### 3) 回收（根因修复后不要长期背覆盖）

当问题修复或默认值调优后，移除模块级/子树级 override，回到默认策略。

## 常见问题（FAQ）

### Q1：我只想“回到升级前的表现”，需要改哪些？

只改一个就够：把 `traitConvergeMode` 固定为 `"full"`（全局或只对目标模块）。预算先别动。

### Q2：我设置了 override，但感觉没生效？

最常见的三个原因：

1. **生效时机**：配置从**下一笔事务**开始生效（不会打断正在进行的交互）。
2. **moduleId 写错**：确认它就是 `Logix.Module.make("...")` 的 id。
3. **覆盖层级被更高优先级覆盖了**：例如子树里又包了一层 Provider override。

### Q3：`traitConvergeBudgetMs` 能不能随便调小？

不建议一上来就调很小。它是“执行预算”，太小可能触发降级，让派生值/联动计算在极端事务里无法完整完成（表现为更保守、更稳，但不一定更快）。

### Q4：我应该用 `"dirty"` 吗？

建议把 `"dirty"` 当成“实验档”：先用 `"full"` 做稳定基线，再用 `"auto"` 调到满意；只有当你非常确定写入是局部的、且联动依赖关系足够准确时，再考虑在少数模块上试 `"dirty"`。

## 常见误区

- 把“止血覆盖”当成长期默认：覆盖应该是临时手段，最终要么修根因，要么把更好的默认值固化下来。
