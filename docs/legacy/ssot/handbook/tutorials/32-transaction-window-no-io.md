---
title: 事务窗口禁止 IO 教程 · runWithStateTransaction / TaskRunner guard / multi-entry 模式（从 0 到 1）
status: draft
version: 1
---

# 事务窗口禁止 IO 教程 · runWithStateTransaction / TaskRunner guard / multi-entry 模式（从 0 到 1）

> **定位**：本文把“事务窗口禁止 IO”从一句口号落到真实代码边界：事务窗口到底在哪里开始/结束？哪些 API 会被硬性 guard？正确的 IO 编排写法是什么？  
> **重要**：这是运行时核心不变量之一；违反它会直接破坏性能、可诊断性与 no-tearing。  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md` 与 `docs/ssot/handbook/tutorials/12-process-and-scheduling.md`。

## 0. 最短阅读路径（10 分钟上手）

1. 先读「1.1 为什么事务窗口禁止 IO」：理解它不是“洁癖”，而是死锁/证据链/一致性的地基。  
2. 再读「2.1 事务窗口的单一边界：`runWithStateTransaction`」：定位开始/结束点。  
3. 最后读「2.3 正确写法：TaskRunner 的 `pending → IO → writeback`」：你以后写 IO 就照这个来。  

如果你正在排障：直接跳「3.3 剧本 C：`state_transaction::async_escape` 是什么」。

## 1. 心智模型（为什么必须禁止）

### 1.1 事务窗口禁止 IO 不是洁癖，是“不会死锁 + 可解释 + 可回放”

事务窗口（Transaction Window）是一个非常具体的承诺：

- **对外只允许 0/1 次提交**：事务结束时 commit 一次（或无变化则不 commit）。  
- **对外不可见中间态**：事务内的 draft 变化不会被外部订阅者看到。  
- **对外可解释**：commit 时能输出 `dirtySet/patchCount/origin` 等 Slim 证据，解释“为什么发生”。  

一旦你在事务窗口里引入长 IO（sleep/await/HTTP/Promise 链），会同时破坏三件事：

1. **死锁风险**：事务窗口通常运行在“串行队列/txnQueue”语义里；事务内再触发需要 txnQueue 的能力（如 run*Task / deliverPlatformEvent）容易形成自锁。  
2. **一致性/订阅断裂**：事务拖长会让 tick/commit/notify 的参考系变得不可解释（外部看到的是“长时间无变化”，然后突然跳变）。  
3. **证据链污染**：动态 trace 会把本应是“同步可解释的一段”变成“夹杂外部世界不确定性的一段”，replay 也会退化为 re-fetch（碰运气）。

所以我们不只是“建议不要 IO”，而是把它做成 **硬 guard + 推荐模式**。

### 1.2 两种 guard：Fiber 级（Effect 内）+ Callstack 级（非 Effect API）

本仓同时维护两种“事务内标记”，原因是：不是所有入口都处在 Effect fiber 上。

1. **Fiber 级标记**：`TaskRunner.inSyncTransactionFiber`（FiberRef）  
   - 事务内 Effect 可以读取它，做 guard/no-op。  
2. **Callstack 级标记**：`TaskRunner.enterSyncTransaction/exitSyncTransaction`（全局 depth 计数）  
   - 用于 Promise/async 这类“非 Effect API 入口”做硬 guard（FiberRef 不可靠）。  
   - 额外提示：如果事务 body 错误跨越 async 边界，这个 depth 会被持有更久——这是严重违规。  

入口：`packages/logix-core/src/internal/runtime/core/TaskRunner.ts`。

## 2. 核心链路（从 0 到 1：边界在哪、怎么跑、怎么写 IO）

### 2.1 事务窗口的单一边界：`runWithStateTransaction(origin, body)`

概念定义（SSoT）：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.06-statetransaction-entry.md`  
实现入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

关键语义（用人话讲）：

- `runWithStateTransaction` 包裹了一段 `body()`：从 `beginTransaction` 到 `commit` 的整个执行，就是事务窗口。  
- Runtime 不会“解析 body 的 Effect 结构”来自动拆分事务：你写了 `Effect.sleep`/HTTP 也不会被自动拆开。  
- 所以事务窗口禁止 IO 的约束必须由调用方遵守，并辅以 guard/诊断。

实现上它做了几件关键事（建议对照源码看）：

- `Effect.locally(TaskRunner.inSyncTransactionFiber, true)(...)`：在 fiber 里标记“事务内”。  
- `TaskRunner.enterSyncTransaction()` / `exitSyncTransaction()`：在同步 callstack 层标记“事务内”。  
- `StateTransaction.beginTransaction(...)` / `StateTransaction.commit(...)`：聚合写入并在末尾 commit 一次。  
- commit 时发 `Debug.record({ type: 'state:update', ... })`（在允许的 diagnostics 档位下）。

### 2.2 事务窗口里的“允许做的事”与“不允许做的事”

允许做的事（典型）：

- reducer 写 draft、record patch（纯同步计算）。  
- Trait converge/validate（必须是纯计算/受预算约束的同步步骤）。  
- 产生 Slim 诊断事件（必须可序列化且 gated）。  

不允许做的事（典型）：

- `run*Task`（TaskRunner）在事务内启动（会死锁 txnQueue，因此直接 no-op + 诊断）。  
- ProcessRuntime 在事务内 deliver/schedule（同样会触发 guard）。  
- 任何长 IO（sleep/await/HTTP/Promise 链）：即使你“勉强能跑”，也会被视为严重违规（dev/test 下会被诊断捕获）。

### 2.3 正确写法：TaskRunner 的 `pending → IO → writeback`（multi-entry 模式）

当你想做 IO（请求/延迟/并发/取消），正确写法不是“在 reducer 里 await”，而是把一次触发拆成三个 entry：

1. `pending`（事务内、同步）：写入 loading 状态、清理错误等。  
2. `effect`（事务外、异步）：执行真实 IO。  
3. `success/failure`（事务内、同步）：把结果写回 state（或写错误）。  

实现入口：`packages/logix-core/src/internal/runtime/core/TaskRunner.ts`（`runTaskLifecycle`）。  
它明确写了：`// 2) IO: runs outside the transaction window.`

这条模式的价值是：

- 保持事务窗口“短且同步”；  
- IO 的取消/并发语义清晰（latest/exhaust/parallel）；  
- writeback 一定通过 `runWithStateTransaction`，保持 0/1 commit 规则与 Slim 证据链。

### 2.4 guard：事务内调用 `run*Task` 会发生什么？

TaskRunner 在启动时调用 `shouldNoopInSyncTransactionFiber(...)`：

- 命中时：**无条件 no-op**（否则可能死锁）。  
- 诊断事件：只在 dev/test 下发出（避免生产常态税）。  
- 诊断码：`code = 'logic::invalid_usage'`，并给出推荐写法提示（multi-entry）。  

入口：`packages/logix-core/src/internal/runtime/core/TaskRunner.ts`（`shouldNoopInSyncTransactionFiber`）。

### 2.5 guard：事务内 Process deliver/schedule 会发生什么？

ProcessRuntime 对“事务内不允许 deliver/schedule”做了同样的 guard：

- 教程入口：`docs/ssot/handbook/tutorials/12-process-and-scheduling.md`（2.7）  
- 测试证据：`packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`  
- 代码入口：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`（调用 `TaskRunner.shouldNoopInSyncTransactionFiber`）

意图很直接：避免在同步事务窗口里引入可能死锁 txnQueue 的操作；让调度/触发发生在事务窗口之外。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：我现在有一段“同步写 state + 异步请求 + 写回”，该怎么改？

目标：把“事务内 IO”改成 multi-entry。

步骤（推荐）：

1. 把“写 loading/清理错误”挪到 `pending`。  
2. 把真实 IO 放到 `effect`。  
3. 把“写回结果/错误”挪到 `success/failure`。  
4. 根据业务语义选 concurrency：`latest/exhaust/parallel/task`。  

你会得到：更短的事务窗口、更清晰的取消语义、更可解释的证据链（originKind/service-callback）。

### 3.2 剧本 B：我需要在事务内触发“后续工作”，但又不能 IO

常见误解：在事务内“触发一个异步任务”看似不算 IO，但它仍会引入 txnQueue/调度链路，可能死锁。

正确思路：

- 事务内只做“记录意图”（写 state、写一个 request 标记）。  
- 事务外（watcher/run section）观察这个意图，启动 TaskRunner/Process 进行 IO。  

这也是为什么很多能力要以“状态驱动的控制律”存在，而不是“事务内直接 fork Promise”。

### 3.3 剧本 C：`state_transaction::async_escape` 是什么？（为什么我在 dev 看到它）

在 `ModuleRuntime.transaction.ts` 里，dev 环境会对事务 body 做一个非常关键的检测：

- 它会 fork `body()`，并用有限次 `Effect.yieldNow()` 轮询（YIELD_BUDGET）。  
- 如果在预算内仍未完成，发出诊断：`code = 'state_transaction::async_escape'`。  
- 含义：你很可能在事务窗口里引入了 async/await（或其它让 body 跨越异步边界的行为）。  

这是“违反事务窗口约束”的强信号：应立即把 IO 改成 multi-entry 模式。

### 3.4 剧本 D：我必须违背这条约束，有没有逃生舱？

原则：逃生舱存在，但必须满足两个条件：

1. **显式降级且可解释**：必须发出 Slim 诊断事件（稳定 code/reason），让工具链知道“这里违背了约束”。  
2. **把成本隔离在 scope 内**：只允许在极小范围、短时间启用（例如试跑/对齐），不能把它变成线上常态。  

实现层面目前的“逃生舱形态”主要是：  
在 dev/test 下发诊断并保持 no-op（避免死锁），而不是提供“偷偷允许 IO”。

## 4. 代码锚点（Code Anchors）

1. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`：事务窗口边界（runWithStateTransaction）、async_escape 诊断、commit 发 state:update。  
2. `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`：begin/commit/dirty-set/patch recording 的最小语义（事务窗口的底盘）。  
3. `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`：事务内 guard（inSyncTransactionFiber + shouldNoop + multi-entry 模式）。  
4. `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`：Process 在事务边界的 guard。  
5. `packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`：事务边界 guard 的可运行证据。  
6. `docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.06-statetransaction-entry.md`：事务窗口的裁决性定义（概念层）。  
7. `docs/ssot/handbook/tutorials/12-process-and-scheduling.md`：从“业务写法”视角理解事务边界的意图。  

## 5. 验证方式（Evidence）

最少应验证三件事：

- **事务窗口不会变长**：业务触发一次后，事务 body 保持同步短路径（dev 下不触发 async_escape）。  
- **IO 不在事务内**：`pending/writeback` 都走 `runWithStateTransaction`，真实 IO 只在 `effect` 段。  
- **失败可解释**：事务内触发禁用能力会发稳定诊断 code（dev/test），且不会造成死锁。  

## 6. 常见坑（Anti-patterns）

- 在 reducer/trait.run/事务 body 里直接 `await` / `sleep` / Promise 链。  
- 在事务内调用 `run*Task` 并以为“只是 fork 一下”——实际上会死锁 txnQueue。  
- 为了“临时救火”把 guard 改成允许执行：会把短期问题变成长期不可诊断的性能税。  
- 把“事务窗口”当成“随便包一段 Effect”：事务窗口是强语义边界，不是 try/catch。  
