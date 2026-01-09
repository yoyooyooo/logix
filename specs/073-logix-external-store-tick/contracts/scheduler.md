# Contracts: Scheduler（HostScheduler + Tick 边界）

> 目标：把宿主调度（microtask/macrotask/raf/timeout）收敛到单一可注入入口，避免在核心路径散落 `queueMicrotask/setTimeout/requestAnimationFrame/MessageChannel/setImmediate` 导致的：平台差异、链式 microtask 饥饿、上下文污染与测试不确定性。

## 1) 术语

- **microtask**：`queueMicrotask` / Promise job；在同一 macrotask 结束前执行，通常会发生在浏览器下一次渲染之前。
- **macrotask**：`MessageChannel` / `setImmediate` / `setTimeout(0)` 等；允许浏览器在任务之间安排渲染、允许 Node 处理 IO。
- **yield-to-host（反饥饿）**：当 tick 执行可能变“重活”时，主动切到 macrotask 续跑，让出主线程（避免卡 UI/IO）。

## 2) HostScheduler（internal Runtime Service）

### 2.1 最小契约（概念）

> 说明：这是 internal Runtime Service 合同（非 public API）。实际类型/Tag 以实现落点为准。

```ts
type Cancel = () => void

type HostScheduler = {
  readonly nowMs: () => number

  // 合并触发：用于 Signal Dirty / schedule-once。
  readonly scheduleMicrotask: (cb: () => void) => void

  // 让出主线程：用于 tick 续跑、low-priority notify、重活拆分。
  readonly scheduleMacrotask: (cb: () => void) => Cancel

  // 仅在 browser 可用；Node 下可降级为 macrotask。
  readonly scheduleAnimationFrame: (cb: () => void) => Cancel

  // 可选：用于“最大延迟”节流（nonUrgent notify）。
  readonly scheduleTimeout: (ms: number, cb: () => void) => Cancel
}
```

### 2.2 实现约束（必须满足）

- HostScheduler 是唯一允许直接触碰宿主调度 API 的地方（其余模块禁止直接调用 `queueMicrotask/setTimeout/requestAnimationFrame/...`）。
- `scheduleMicrotask` 只用于“合并触发/Signal Dirty”，不得承载重计算循环。
- `scheduleMacrotask` 必须优先选择“更快的 macrotask”实现：
  - browser：优先 `MessageChannel`（fallback 到 `setTimeout(0)`）
  - Node：优先 `setImmediate`（fallback 到 `setTimeout(0)`）
- Node：禁止使用 `process.nextTick` 作为任何“让出主线程/续跑”的实现（会加剧饥饿与优先级倒挂）；`scheduleMicrotask` 也不应基于 `process.nextTick` 实现。
- `nowMs` 必须单调近似（browser 优先 `performance.now()`；Node 优先 `performance.now()`；fallback `Date.now()`）。

## 3) TickScheduler 调度策略（与 HostScheduler 的关系）

### 3.1 默认策略（microtask 边界）

- 外部输入/dispatch 触发时：只做 **Signal Dirty → scheduleMicrotask(flush)**（同一 microtask 内最多 schedule 一次）。
- tick flush 的目标仍是 fixpoint：在预算内 drain 到空，产出 `trace:tick.result.stable=true`。

### 3.2 反饥饿策略（yield-to-host）

当出现以下任一情况，tick 不得继续在 microtask 链中“死跑”，必须 yield：

- `budgetExceeded`（ms/steps/txnCount 任一触顶）
- `cycle_detected`（同 tick 内无进展反复 requeue，或等价判定）
- `microtaskChainDepth` 超阈值（避免“微任务套微任务”阻塞渲染/IO）

处理方式：

- 先完成 urgent lane 的最小 flush（保证 no-tearing 的 snapshot 可观测）。
- 将剩余 nonUrgent/backlog 通过 `scheduleMacrotask` 续跑（分段稳定化）。
- 在 diagnostics=light/sampled/full 下输出 Slim 证据（见 `contracts/diagnostics.md`）：本 tick 是否发生 yield、续跑的 scheduleKind、以及触发原因。

### 3.3 与 requestAnimationFrame 的关系（明确边界）

- 本特性中，`requestAnimationFrame` 只用于 **low-priority notify 的节流**（以及 perf 的 click→paint 观测），不是 tick 的驱动边界。
- Tick 的合并触发/续跑只在 `scheduleMicrotask`/`scheduleMacrotask` 上发生；这使得 “让出主线程” 语义在 browser/node 下可治理且可压测。
- 若未来确实需要 frame-aligned 的 tick（例如把 backlog 续跑对齐到下一帧以减少掉帧），应作为独立扩展引入 `yield-to-next-frame`（并配套 perf/diagnostics gate）；073 首版不承诺该能力。

### 3.4 `microtaskChainDepth` 的实现要求（必须自维护）

- 原生 `queueMicrotask` 不提供深度信息；`microtaskChainDepth` 必须由 TickScheduler/HostScheduler 在运行时维护计数（best-effort）。
- 推荐实现：在每次“同一段 microtask 链中的 flush continuation”递增计数，在进入 macrotask（yield continuation）时重置；并把该值写入 `trace:tick.schedule.microtaskChainDepth`（diagnostics=light/sampled/full）。

## 4) 测试口径（act-like）

> 目标：避免测试里散落 `sleep/flushMicrotasks`，把“排空异步队列”变成显式 API，与 React `act` 类似但以 `tickSeq` 为锚点。

要求：

- 提供一个测试辅助（建议落在 `@logixjs/test` 或 core internal testkit）：
  - `flushAll()`：排空 runtime 的 tick 队列 + HostScheduler 的 microtask/macrotask 队列（直到稳定或显式上限）。
  - `advanceTicks(n)`：可选，用于稳定复现“多 tick”行为。
- TestKit 必须与 HostScheduler 配套：测试中注入 deterministic HostScheduler（队列可控、可断言）。
- 至少包含 1 个 React 集成用例：在触发 yield-to-host 的场景下，验证 React 仍可插入更高优先级更新且最终 commit 满足 no-tearing（同一次 render/commit 观测同一 `tickSeq`）。

## 5) 与 diagnostics/perf 的协同

- diagnostics：当发生 yield（forced macrotask）或 microtask 饥饿防线触发时，必须能在 `trace:tick` 或 `warn:*` 中解释（Slim、可序列化）。
- perf：任何把 tick 从“纯 microtask”扩展为“microtask + macrotask 续跑”的改动，都必须回到 `plan.md#Perf Evidence Plan` 的边界场景重新采集/对比（尤其注意 click→paint 观测点与 retained heap gate）。

## 6) Alternatives considered（为何不选某些方案）

- 仅依赖 `effect` 的时间/调度（Clock/Schedule/fiber 调度）来替代宿主调度：
  - 不能表达/约束 “microtask 合并触发 vs macrotask 让出主线程 vs raf/timeout 节流” 这些对 UI/IO 饥饿与 React 订阅时序至关重要的边界；
  - 会让宿主差异与“最快 macrotask”选择变成隐式实现细节，难以诊断与做 perf gate；
  - 更容易引入 fiber-local 上下文传播/污染（调度边界不清晰时尤其危险）。
  - 结论：effect 仍用于 **依赖注入/Scope 取消/测试替身**，但宿主调度必须显式抽象为 `HostScheduler`。
- 全部用 microtask（到处 `queueMicrotask`）：
  - 易造成链式 microtask 饥饿（阻塞渲染/IO），且问题分散难治理；因此只允许 microtask 做 schedule-once 的合并触发。
- 全部用 `setTimeout(0)`：
  - 会把“同一事件内合并”退化成更粗的边界（引入额外延迟/抖动），并破坏我们对“tick 边界/证据链”的精确控制；只作为 macrotask fallback。
- 让 React adapter 自己决定 notify 的宿主 API（core 不管）：
  - 会产生双真相源（核心调度 vs adapter 调度）并造成漂移；因此 low-priority notify 也必须通过 HostScheduler。
