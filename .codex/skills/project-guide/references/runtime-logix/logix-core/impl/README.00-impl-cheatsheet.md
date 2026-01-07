# logix-core impl 小抄（实现视角｜高频坑位与锚点）

> 目标：把“读源码时最容易踩坑/最关键但不显眼的实现细节”压缩成一份可检索的小抄；它不是 SSoT（契约/语义以 `../runtime/*` 为准），只记录：为什么这样做、风险点、如何验证、源码锚点。

## 0. 三句话心智模型

1) **Layer 是 build-time 依赖注入**：服务在 `Layer.build` 时被构造并**闭包捕获**其依赖（`yield* Tag`）。最终 Env 合并（`Layer.mergeAll`）不等于“把依赖喂给已经构造好的服务”。  
2) **Tick 体系是 runtime 的参考系**：`RuntimeStore.tickSeq` 是 React/Devtools/测试的唯一“原子锚点”；避免 tearing 的关键不是“更快”，而是“单一快照真相源”。  
3) **宿主调度必须可注入且可控**：核心路径禁止散落 `queueMicrotask/setTimeout/raf`，否则平台差异 + 测试不确定性 + starvation 风险不可控。

---

## 1) Layer/Env 的 build-time 捕获：最常见坑

### 1.1 症状：测试替换了 HostScheduler，但 tick 仍跑在默认 scheduler 上

典型写法（**错**）：

- `Layer.mergeAll(testHostSchedulerLayer(host), tickSchedulerTestLayer(config))`

为什么错：

- `tickSchedulerLayer` 在构建时会 `yield* HostSchedulerTag`，把得到的 scheduler **闭包捕获**。  
- `Layer.mergeAll` 只是把最终 Env 合并；它不会改变 **tickSchedulerLayer 构建时**从哪取 HostScheduler。

正确写法（**对**）：

- `const hostLayer = testHostSchedulerLayer(host)`  
- `const tickLayer = tickSchedulerTestLayer(config).pipe(Layer.provide(hostLayer))`  
- `Layer.mergeAll(hostLayer, tickLayer, Layer.empty)`

代码锚点：

- `packages/logix-core/src/internal/runtime/core/env.ts`：`tickSchedulerLayer` 内 `yield* HostSchedulerTag`
- `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`：已按上面方式组装

### 1.2 症状：`Service not found` 只在某些测试/集成场景出现

高概率原因：

- 模块/logic 在 Env 尚未完全 ready 时 fork 了长生命周期 fiber，并在 fiber 内捕获了“半成品 Env”。后续再 provide/merge 也无效。

修复原则：

- **先 build base runtime env，再在 baseEnv 下 build module layers**；不要让 module 初始化先于 tick services 完成。

代码锚点：

- `packages/logix-core/src/internal/runtime/AppRuntime.ts`：`baseLayer` 先 build，module layers 在 `Effect.provide(..., baseEnv)` 下 build（含 073 的注释解释）

---

## 2) HostScheduler：统一调度入口（microtask/macrotask/raf/timeout）

### 2.1 为什么一定要 HostScheduler

- **可测试性**：deterministic scheduler 能同步 `flushMicrotasks/flushOneMacrotask`，让 tick 演化可控。  
- **跨平台一致性**：浏览器/Node 的 macrotask 优选实现不同（`setImmediate/MessageChannel/setTimeout`）。  
- **避免“隐形 microtask”**：Promise job queue 不可控，容易造成“测试以为已 flush，但其实还有 Promise microtask”。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/HostScheduler.ts`：默认实现 + deterministic 实现
- `packages/logix-core/src/internal/runtime/core/env.ts`：`HostSchedulerTag` + default layer/test stub layer

### 2.2 实现侧禁忌：不要在核心路径用 `Effect.promise(() => new Promise(queueMicrotask))`

原因：

- native Promise microtask 不归 deterministic scheduler 管；测试无法可靠 flush。  
- 会绕开 `HostScheduler` 的单点治理（未来无法统一观测/预算/替换）。

推荐写法：

- `Effect.async((resume) => hostScheduler.scheduleMicrotask(() => resume(Effect.void)))`

代码锚点（修复示例）：

- `packages/logix-core/src/internal/state-trait/external-store.ts`：微任务让出用 HostScheduler
- `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.closeScope.ts`：已改为 HostScheduler microtask yield（避免直接 `queueMicrotask`）

---

## 3) TickScheduler：预算、降级与 yield-to-host（避免饿死）

### 3.1 Tick 的两条“安全边界”

- **budget（maxSteps）**：防止 nonUrgent backlog 把一次 tick 变成“长任务”；超预算 => `stable=false`，defer backlog。  
- **cycle_detected（urgentStepCap/maxDrainRounds）**：防止看似 urgent 的循环/无进展把系统卡死；触发 => 切断并在下一 tick 继续。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：`maxSteps/urgentStepCap/maxDrainRounds`
- `packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`：budget/cycle 的语义回归

### 3.2 microtask starvation：什么时候会强制切 macrotask

机制：

- tick 默认在 microtask boundary 合并触发（便于 coalesce）。  
- 如果连续 microtask 链过深（`microtaskChainDepth >= limit`）且未被其它 forced reason 覆盖，则下一 tick **强制**在 macrotask boundary 启动，并重置链深度。

证据：

- `trace:tick.schedule.forcedMacrotask=true`  
- `schedule.reason === 'microtask_starvation'` 时才发 `warn:microtask-starvation`（budget/cycle 的 forced macrotask 不应复用 starvation 的语义）

代码锚点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：`microtaskChainDepth`、`nextForcedReason`、`warn:microtask-starvation` 条件
- `packages/logix-core/test/internal/Runtime/TickScheduler.starvation.test.ts`：回归用例

### 3.3 生产可观测：diagnostics=off 仍可 opt-in telemetry

目的：

- diagnostics=off 要近零成本，但线上仍希望低频知道“是否经常 degraded / forced yield”。

做法：

- `TickSchedulerConfig.telemetry = { sampleRate, onTickDegraded }`  
- 仅在 `stable=false` 或 `forcedMacrotask` 且命中采样时回调；callback 必须 best-effort（不可影响 tick）。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：telemetry 结构与采样
- `packages/logix-core/test/internal/Runtime/TickScheduler.telemetry.test.ts`：diagnostics=off 下仍会回调

---

## 4) RuntimeStore：tickSeq 作为“唯一对外原子锚点”

原则：

- commit 发生后再 notify；`tickSeq` 单调递增，React/Devtools 都以它对齐。  
- **不要引入第二真相源**（例如 per-module store）；否则 tearing 会以不可预测方式回归。

代码锚点：

- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- 浏览器语义/性能门禁：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

---

## 5) ExternalStore trait：跨源/跨模块强一致的关键约束

关键点：

- `getSnapshot` 必须同步；且必须在 txn-window 外执行（避免“事务窗口内 IO/等待/副作用”）。  
- subscribe 只做 “Signal Dirty”；真正写回在 tick/txn-window 内完成（单 writer、0/1 次对外 commit）。

代码锚点：

- `packages/logix-core/src/ExternalStore.ts`：对外 contract + sugars
- `packages/logix-core/src/internal/state-trait/external-store.ts`：install/runtime 行为（含 HostScheduler microtask）

---

## 6) 测试面：deterministic HostScheduler + act-like flush

### 6.1 flush 的语义（避免误用）

- `flushMicrotasks()`：只 flush “通过 deterministic hostScheduler.scheduleMicrotask 入队的 microtask”；不会 flush native Promise microtask。  
- `flushAllHostScheduler()`：目标是把系统跑到静止（quiescence）；队列清空后还会额外 `yieldNow` 若干次，让非 host 工作有机会 enqueue 后续 host task。

代码锚点：

- `packages/logix-core/test/internal/testkit/hostSchedulerTestKit.ts`
- `packages/logix-test/src/Act.ts`

### 6.2 React 集成的最小回归：本地更新插队 + no-tearing

代码锚点：

- `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`

---

## 7) Perf evidence（只写 impl 侧最容易犯错的点）

- `matrixHash` 必须一致才可下硬结论；subset collect 要 `--allow-partial`（否则 validate 会报缺 suite）。  
- yield-to-host 的性能证据在 `tickScheduler.yieldToHost.backlog`（browser perf boundary）；用 `TickScheduler.telemetry` 收集 forcedMacrotask/degradedTicks 做 evidence。

代码/证据锚点：

- `packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx`
- `specs/073-logix-external-store-tick/perf/README.md`

