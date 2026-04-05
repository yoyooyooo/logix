---
title: Source / ExternalStore / Module-as-Source：边界绑定能力的终态写法教程 · 剧本集
status: draft
version: 1
---

# Source / ExternalStore / Module-as-Source：边界绑定能力的终态写法教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 `StateTrait.source` / `StateTrait.externalStore` / `ExternalStore.fromModule`（Module-as-Source）三者的职责边界、事务/tick 语义、以及常见落坑点讲透。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先建立边界感）

1. Source（SSoT 总览）：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md`
2. Source（实现与回放细节）：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`
3. ExternalStore trait（关键约束摘要）：`docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`
4. TickScheduler/RuntimeStore（为何必须单一真相源）：`docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`
5. 代码入口（对外 API）：`packages/logix-core/src/ExternalStore.ts`、`packages/logix-core/src/StateTrait.ts`

如果你只做一件事：请先读第 1 节的“心智模型”，它决定你未来会不会把 IO 塞进 `getSnapshot()`、或者让 reducers 写 external-owned 字段。

---

## 1. 心智模型：三类“输入”，三种边界

在 Logix 里，我们把“会影响状态图的输入”分成三类（这三类决定了你应该用 Source 还是 ExternalStore）：

1. **同步可读、可订阅的外部输入（ExternalStore）**
   - 典型：Router/URL、Browser API（在线状态/焦点）、来自 Service 的 SubscriptionRef、平台注入的“当前选择/光标/悬停目标”等。
   - 关键约束：`getSnapshot()` **必须同步、且无 IO**；`subscribe()` 只负责“发信号”，不要把业务写回散落在 subscribe 回调里。
   - 落点：`StateTrait.externalStore({ store })` + `ExternalStore.*` sugars。

2. **需要 IO 的资源/查询（Source）**
   - 典型：HTTP 请求、缓存/查询引擎、长轮询、需要 loading/success/error 状态机的“资源字段”。
   - 关键约束：IO 不进 txn-window；写回必须可回放、可诊断、可被 keyHash 门控（避免过期结果覆盖新 key）。
   - 落点：`StateTrait.source({ deps, resource, key, ... })` + Resource/Query + EffectOp middleware。

3. **来自“另一个模块状态”的输入（Module-as-Source）**
   - 直觉：它看起来“不是外部”，但在 tick 视角它更像外部输入：它跨模块、需要被调度器稳定化、需要纳入一致性批次（tick）。
   - 落点：`StateTrait.externalStore({ store: ExternalStore.fromModule(SourceModule, readQuery) })`。

### 1.1 一个很关键的约定：externalStore 字段是 external-owned（外部所有权）

`StateTrait.externalStore` 的目标不是“提供一个更方便的订阅 API”，而是把字段所有权明确下来：

- 这个字段由外部输入驱动写回（runtime 写回），**业务 reducers/$.state.* 不应该写它**；
- 如果你需要把外部值变成别的形态：用 `select(snapshot)` 或用另一个 computed/link 派生到“业务字段”；
- 如果你硬写，会被 runtime 以 `ExternalOwnedWriteError` fail-fast（避免隐性数据竞争）。

这条规则是“新成员最容易忽略、但一忽略就会把系统搞得不可诊断”的地方。

### 1.2 为什么 ExternalStore 要求 `getSnapshot()` 同步且无 IO？

ExternalStore 的第一性目标是：**把外部输入纳入 tick/txn 的确定性收敛**，从而支持：

- React no-tearing：同一次 render 读取到的是同一个 tickSeq 的快照；
- 观测与诊断：可以解释“这次 tick 由哪个外部输入触发、合并了哪些变更、是否降级、为何降级”；
- 事务窗口禁 IO：subscribe 只 signal dirty，真正写回在可控窗口内发生（单 writer）。

因此，`getSnapshot()` 不是“读取远程资源”，而是“同步读取你已经有的当前事实”。如果你把 IO 塞进来：

- 你会在 UI render 或 tick 结算里引入不可控等待；
- 更糟的是你会破坏事务窗口禁 IO 的总原则；
- runtime 会把它视为 defect：同步抛错会触发 fuse（熔断该 trait，不再继续同步）。

---

## 2. 核心链路（从 0 到 1）：从 DSL → Program/Plan → runtime 安装与执行

本节只讲“必要骨架”，细节都在第 3 节剧本与第 4 节代码锚点里。

### 2.1 ExternalStore：对外契约与四种 sugar

对外契约定义在：`packages/logix-core/src/ExternalStore.ts`

```ts
type ExternalStore<T> = {
  getSnapshot: () => T
  getServerSnapshot?: () => T
  subscribe: (listener: () => void) => () => void
}
```

四种 sugar 的定位（都返回一个 ExternalStore，但“可否在 install/runtime 内被解析”不同）：

- `ExternalStore.fromService(tag, map)`：**延迟解析**（store 本体是 unresolved 占位）；install 时从 Env 取 service，再 map 成真实 store。
- `ExternalStore.fromSubscriptionRef(ref)`：立即可用；用 `SubscriptionRef.get` 实现 sync snapshot，用 `ref.changes` 驱动 notify（microtask coalesce）。
- `ExternalStore.fromStream(stream, { initial|current })`：立即可用；但 Stream 没有“同步 current”，必须提供初始快照（可能 stale）。
- `ExternalStore.fromModule(module, selector)`：**延迟解析**（unresolved 占位）；install 时解析 module runtime，并注册 Module-as-Source 逻辑（不是直接 subscribe）。

其中最需要新成员牢记的两点：

1. `fromStream` 的 `{ initial }` 可能 stale：它是“能跑”，但不是“强一致 current”；需要强一致 current 时优先 `fromService/fromSubscriptionRef`。
2. `fromModule` 不是“把模块当 external store 来 subscribe”，而是“把模块状态变成可识别依赖”，纳入 tick 的 fixpoint 稳定化。

### 2.2 StateTrait.externalStore：声明式接入（字段所有权 + 调度语义）

DSL 入口：`packages/logix-core/src/StateTrait.ts`

```ts
StateTrait.externalStore({
  store,
  select?,
  equals?,
  priority?,        // urgent/nonUrgent（影响 commit 优先级）
  coalesceWindowMs?,// 当前主要用于 IR/manifest（运行时 coalesce 以 microtask 为主）
  meta?,
})
```

它会在 build 阶段生成一个 `kind = "external-store-sync"` 的 PlanStep（最终执行落点在 install/runtime）。

### 2.3 runtime：externalStore trait 的两条执行路径（raw store vs Module-as-Source）

实现落点：`packages/logix-core/src/internal/state-trait/external-store.ts`

#### 2.3.1 raw store（getSnapshot + subscribe）路径：原子 init + 长期同步 loop

核心语义（建议你对照源码阅读）：

1. **原子 init（避免“订阅窗口丢事件”）**
   - 先 `before = getSnapshot()`；
   - 再 `unsubscribe = subscribe(signal)`；
   - 再 `after = getSnapshot()`；
   - 以 `after` 作为“初始写回值”，并在 `before !== after` 时立刻 signal 一次。
2. **coalesce**：signal 到来后，先 `awaitSignal()`，再等一个 microtask，再 pull 最新 snapshot，一次性写回（减少高频事件抖动）。
3. **事务语义**：写回发生在 txn-window 内（若当前已在 txn 内则复用；否则开启一笔新的 state transaction）。
4. **熔断（fuse）**：`getSnapshot()` 同步抛错会把该 trait 标记为 fused，记录诊断 `external_store::snapshot_threw`，并停止后续同步（保留 last committed 值）。

这四点共同保证了：外部输入写回是“可控、单 writer、可合并、可诊断”的。

#### 2.3.2 Module-as-Source 路径：注册可识别依赖（DeclarativeLinkRuntime）

当 `store` 是 `ExternalStore.fromModule(...)`，descriptor.kind 会是 `module`，走另一条路径：

1. **解析源模块 runtime**
   - 你必须把源模块作为 imports 引入（strict wiring）；否则会报错提示你补 imports。
2. **校验 instance 锚点（可选）**
   - 若 caller 传入的是具体 ModuleRuntime（带 instanceId），runtime 会校验 descriptor.instanceId 与解析到的 runtime 一致，避免“订到别的实例”。
3. **注册 Module-as-Source link**
   - 通过 `DeclarativeLinkRuntime.registerModuleAsSourceLink({ readQuery, applyValue, ... })` 注册。
   - 之后 tick 结算时，会基于“源模块本 tick 的 commit state”跑 `readQuery.select`，若变更则调用 `applyValue` 写回目标字段。
4. **initial sync**
   - install 时会立即读取一次源模块 `getState`，select 后写回，保证初始值一致。

注意：Module-as-Source 不是 subscribe；它依赖 tick scheduler 在结算时提供“被接受的 commit state”，因此天然满足 no-tearing 的快照语义。

### 2.4 Source：两阶段提交、keyHash 门控与回放

Source 的 DSL/Plan 解释见：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md`

实现落点主线（简化）：

1. `StateTrait.source({ deps, resource, key })` build 出：
   - program entry（kind=source，包含 resourceId 与 key 计算）
   - plan step（kind=source-refresh）
2. install 时会为每个 source 字段注册 refresh handler（Bound API 入口是 `$.traits.source.refresh(fieldPath)`）。
3. refresh 执行时：
   - 在 txn-window 内计算 key / keyHash，并做 idle 同步（key 为空时同步写回 idle，避免 tearing）；
   - 通过 EffectOp 总线发起资源调用（IO 在 txn-window 外）；
   - 在写回时用 keyHash 门控：只允许把结果写回到“当前仍匹配的 key”上（避免过期结果覆盖新 key）；
   - live 模式记录 ReplayLog（以便 replay 模式重赛 loading/success/error 的时间线）。

这条链路的核心：Source 是“可回放的异步状态机”，而 ExternalStore 是“同步可读的外部事实源”。

---

## 3. 剧本集（用例驱动）

本节按“你现实里会遇到的问题”组织，尽量给出可落地的判断标准。

### 3.1 Router/URL：用 ExternalStore，而不是 Source

**症状**：你想把 `pathname/params/query` 放进状态图，并让多个模块对它做派生。

**写法**：

- 把 router 的“当前快照”做成 ExternalStore（`getSnapshot` 同步读当前路由；`subscribe` 只在路由变更时 signal）；
- 用 `StateTrait.externalStore` 把它写进一个 `inputs.router` 字段；
- 其他字段通过 computed/link 依赖 `inputs.router`（确保 deps 明确）。

**为什么不是 Source**：Router 不是“异步资源”；它就是当前事实，且 UI 渲染时必须同步可读。

### 3.2 订阅型 Service：优先 fromService / fromSubscriptionRef，慎用 fromStream

**目标**：把某个服务的当前状态作为外部输入接进 StateGraph。

- 若服务能提供 `SubscriptionRef<T>`：用 `ExternalStore.fromSubscriptionRef(ref)`（current 强一致，microtask coalesce）。
- 若服务只能提供“订阅回调 + 当前值”：用 `ExternalStore.fromService(Tag, (svc) => ({ getSnapshot, subscribe }))`。
- 若只有 Stream：用 `ExternalStore.fromStream(stream, { current|initial })`，但要接受“initial 可能 stale”的现实；需要强一致 current 时要改造成 ref/service。

### 3.3 误用警报：把 IO 塞进 getSnapshot

**反例**：`getSnapshot()` 内部去读文件/发请求/await。

**后果**：

- 轻则性能抖动、UI 卡顿；
- 重则同步抛错被熔断：runtime 记录 `external_store::snapshot_threw`，该字段停更，排障成本暴涨。

**正确替代**：

- 真 IO → `StateTrait.source`（资源字段、loading/success/error、keyHash 门控、回放）；
- 事件流且无 current → `ExternalStore.fromStream({ initial|current })`（但承认 initial 可能 stale）。

### 3.4 Module-as-Source：跨模块“把一个模块当输入”时用它

典型场景：模块 A 的状态要驱动模块 B 的某个字段，但你不想写“手搓 subscribe + setState 胶水”。

**推荐写法**：

1. 为模块 A 里的“你要读的片段”定义一个 `ReadQuery.make`（selectorId/debugKey/reads 明确）
2. 模块 B 用 `StateTrait.externalStore({ store: ExternalStore.fromModule(A, readQuery) })` 写回一个 external-owned 字段
3. 模块 B 内再 computed/link 派生业务字段

**证据用例**：`packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts`（同 tick 内 settle，且无需手动 flush）。

### 3.5 external-owned 字段写入冲突：如何拆字段避免 ExternalOwnedWriteError

**症状**：你把外部输入写到 `state.profile`，然后 reducers 也想更新 `state.profile.name`。

**后果**：写入路径重叠，runtime 会 fail-fast（ExternalOwnedWriteError）。

**拆法**（常用）：

- `inputs.profile`（externalStore 写回，external-owned）
- `profileDraft`（业务可写，reducers 写）
- `profileView`（computed/link：综合 inputs + draft，最终给 UI）

这样所有权边界清晰，Devtools/回放也更可解释。

### 3.6 deps 的必要性：Source/Computed 的性能与正确性都靠它

你会在 dev 环境看到 `state_trait::deps_mismatch` 的 warning：这是在提醒你“声明 deps 与实际 reads 不一致”。

这件事之所以重要，是因为：

- deps 是增量调度、reverse closure、性能优化的单一真相源；
- deps 不准会让系统退化为粗粒度重算（甚至产生隐藏的链路漂移）。

如果你确实依赖整个对象：请显式声明更粗粒度的 dep（例如依赖 `profile` 而不是多个子字段），不要偷偷在 key/get 里读更多字段。

---

## 4. 代码锚点（Code Anchors）

### 4.1 对外 API（业务/平台读这个就够）

- `packages/logix-core/src/ExternalStore.ts`
- `packages/logix-core/src/StateTrait.ts`
- `packages/logix-core/src/internal/external-store-descriptor.ts`（storeId/descriptor 的隐藏附着）

### 4.2 runtime/install（决定真实语义的地方）

- `packages/logix-core/src/internal/state-trait/external-store.ts`（原子 init、microtask coalesce、fuse、Module-as-Source install）
- `packages/logix-core/src/internal/state-trait/source.impl.ts`（syncIdleInTransaction、installSourceRefresh、keyHash gating、deps trace）
- `packages/logix-core/src/internal/runtime/core/DeclarativeLinkRuntime.ts`（Module-as-Source edge 的执行）
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`（tick 边界、fixpoint、budget/yield、trace:tick）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`（external-owned 字段集合与写入冲突 fail-fast）

### 4.3 回归测试（新成员跑一遍就能建立直觉）

- `packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts`
- `packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`
- `packages/logix-core/test/internal/Runtime/TickScheduler.starvation.test.ts`

---

## 5. 验证方式（Evidence）

### 5.1 最小回归（不跑 watch）

- core 单测：在 `packages/logix-core` 下用 `vitest run` 一次性跑 `ModuleAsSource.tick` 与 TickScheduler 相关用例。
- 若你在写 ExternalStore/source 的实现：优先补“语义回归测试”，再补文档（避免文档先行但语义漂移）。

### 5.2 诊断信号（你应该在 Devtools 里看到什么）

- external store snapshot 抛错：`code=external_store::snapshot_threw`（trait fused，字段停更）
- external-owned 写入冲突：`ExternalOwnedWriteError`（fail-fast，指向 owned/path）
- deps 声明漂移：`code=state_trait::deps_mismatch`（warning，一次 runSession 去重）

---

## 6. 常见坑（Anti-patterns）

1. **把 IO / await 藏进 `getSnapshot()`**：ExternalStore 不是 Source；真 IO 用 Source。
2. **把 external-owned 字段当普通字段写**：拆成 `inputs.*` + `draft` + `view`，不要让 reducers 与 externalStore 写同一路径。
3. **用 `ExternalStore.fromStream` 期待强一致 current**：Stream 没有 current，除非你额外提供 `current`；需要强一致时改成 SubscriptionRef/service。
4. **`ExternalStore.fromModule` 传入 read-only handle**：必须是 Module/ModuleTag/ModuleImpl/ModuleRuntime（需要可解析 moduleId）。
5. **selectorId 不稳定**：用 `ReadQuery.make` 显式提供 `selectorId/debugKey/reads`，不要依赖动态闭包导致 fallback。

