# React 与 Sandbox 集成（性能与契约）

本报告关注：Logix 与 React 结合是否能达到你期待的 1+1>2，并且 Sandbox/Playground 是否作为“可执行规范”支撑全双工与 AI 生成工作流。

## 本报告的评估范围

- `packages/logix-react`：React adapter（Provider/hooks/订阅模型）
- `packages/logix-devtools-react`：Devtools UI 与 Debug/DevtoolsHub 的契约
- `packages/logix-sandbox`：Playground/Alignment Lab 基础设施
- `examples/logix`：示例是否体现唯一推荐写法

## 需要达成的契约（北极星）

1. **事务 → 渲染批处理**：React 订阅以 txn 为边界收敛，避免一次 action 触发多次渲染抖动。
2. **可诊断性**：组件渲染事件能与 txnId 对齐（DebugSink 已为此做了 lastTxnId 兜底，但需要强协议）。
3. **选择器与依赖收敛**：React 侧 selector 必须可追踪、可缓存、可复用；禁止“每次 render 创建新 selector 导致订阅失效”。
4. **开发体验**：默认开启的观测应足够解释性能问题，但生产环境必须可降级且无隐性开销。

## React 集成现状：已经接近“事务 → 渲染批处理”

### 1) 订阅模型：`useSyncExternalStore` + microtask batching

- `packages/logix-react/src/hooks/useSelector.ts` 使用 `useSyncExternalStoreWithSelector` 订阅状态；
- 订阅底座 `packages/logix-react/src/internal/ModuleRuntimeExternalStore.ts`：
  - 通过 `moduleRuntime.changes((s) => s)` 订阅整棵 state；
  - 在每次状态变化时用 `queueMicrotask` 合并多次通知（microtask batching）。

结合 core 的 0/1 commit 语义（单事务最多一次 `SubscriptionRef.set`），目前链路已经能做到：

- “一次事务 → 至多一次 React 通知（且被 microtask 合并）”
- “selector + equalityFn” 负责组件级去重（避免无效渲染）

这是正确方向。

### 2) 多实例隔离：imports-scope 已经是 React 侧的默认严格语义

`@logix/react` 明确区分两类句柄：

- 全局单例语义：直接 `useModule(ModuleTag)`（依赖当前 RuntimeProvider 的全局 Env）；
- 本地实例语义：`useModule(ModuleImpl, { key })` / `useLocalModule(...)`，并通过 imports-scope 解析子模块：
  - core：每个模块实例在 runtime 上携带 `__importsScope`（最小 injector：ModuleToken → ModuleRuntime）；
  - `packages/logix-react/src/internal/resolveImportedModuleRef.ts` strict-only 从 `parentRuntime.__importsScope` 解析子模块（缺失即报错并给出 fix 建议）；
  - root/global 单例语义统一走 `Root.resolve(Tag)`（忽略 `RuntimeProvider.layer` 的局部 override）。

结论：React 侧已经把“多实例必须确定性隔离”做成默认，这与本仓“追求完美”目标高度一致。

### 3) 可诊断性：React 侧已开始写回 trace 事件

`packages/logix-react/src/hooks/useSelector.ts` 在 dev/test（或 devtools enabled）下会发出 `trace:react-selector` Debug 事件，携带 selectorKey/fieldPaths 等信息，为“事务 → 渲染”对齐提供数据。

### 4) StrictMode 友好与实例标签：ModuleCache + `trace:instanceLabel`

`packages/logix-react/src/hooks/useModule.ts` 在 `ModuleImpl` 路径下引入了 ModuleCache 与 gcTime（默认约 500ms）：

- 目的：抵抗 React StrictMode 的 mount/unmount 抖动，避免重复初始化模块导致的“幽灵实例/重复副作用”；
- 同时会发出 `trace:instanceLabel` 与 `trace:react-render`，用于 Devtools 将 runtime.id 与 key/label/渲染事件对齐。

结论：React 侧已经在“工程体验与可诊断性”层面做了正确的防抖与标注，但要真正 1+1>2，还需要 core 在 identity/事务协议上补齐（见下文缺口 D）。

## React 集成的关键缺口（要做到 1+1>2 必须补齐）

### A) core 侧全局 registry fallback 会破坏 React 的 strict 实例语义

core 的 `BoundApi.use` 过去会在 Env 缺失时回退到进程级 registry（`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`）。这会让“本地实例”在某些边界条件下悄悄串到其他实例，直接违反 React 侧 strict 语义。

建议（不兼容）：core 删除 registry fallback；React 的 imports API strict-only；显式 root/global 单例语义统一使用 `Root.resolve(Tag)`。

### B) `state.ref()` 可写 Ref 会让“事务 → 渲染/诊断”失去统一边界

如果业务/Pattern 直接 `SubscriptionRef.update($.state.ref(), ...)`：

- React 仍然会收到 changes（能更新 UI）；
- 但事务/patch/trait/Devtools 都被绕过（无法解释、无法优化）。

这会让 1+1>2 变成“UI 看起来能跑，但引擎无法优化/诊断”的陷阱。建议在 core 侧禁止业务可写 ref（详见 `03-transactions-and-traits.md`）。

### C) “事务 → 渲染”需要从兜底对齐升级为强协议

目前 DebugSink 侧对齐 txnId 的方式包含兜底逻辑（最近一次 txnId），但要做极致性能与因果分析，需要：

- 每次 React 通知携带明确 txnId（而不是推断）；
- Devtools 能按 txn 展示 selector 命中、渲染次数、耗时与触发原因。

### D) `instanceId` 已稳定：默认单调序号 + 可注入

React/Devtools 使用 `instanceId` 作为“实例标识”与聚合锚点：

- trace 事件用它来分组（`trace:react-render`/`trace:react-selector`/`trace:instanceLabel`）；
- time-travel 入口 `Logix.Runtime.applyTransactionSnapshot(moduleId, instanceId, txnId, ...)` 以 `instanceId` 精确定位实例。

core 的 `ModuleRuntime` 已去随机化：`instanceId` 支持外部注入（`ModuleRuntimeOptions.instanceId`），缺省兜底为进程内单调序号（`i1/i2/...`）。

在 React 场景中，`useModule(Impl, { key, gcTime })` 会通过 ModuleCache 复用同一个 ModuleRuntime，因此同一 key 的 `instanceId` 在存活窗口内保持不变；释放并 GC 后重新创建才会生成新的 `instanceId`。

## Sandbox/Playground（Alignment Lab）待审阅要点

### 现状：Sandbox 已经能跑通“编译→运行→采集事件”的骨架

代码落点：

- Host/Client：`packages/logix-sandbox/src/Client.ts`
- 协议：`packages/logix-sandbox/src/Protocol.ts`、`packages/logix-sandbox/src/Types.ts`
- Compiler：`packages/logix-sandbox/src/compiler.ts`
- Worker：`packages/logix-sandbox/src/worker/sandbox.worker.ts`

当前契约（按实际实现）：

- INIT：初始化 `esbuild-wasm`，并接收 `kernelUrl`（用于 externalize `@logix/core` 到 “kernel”）；
- COMPILE：把用户代码编译成 ESM bundle（外部依赖走 `https://esm.sh/*`；`@logix/core` 走 `kernelUrl`）；
- RUN：动态 import bundle（Blob URL），要求 `default` 导出是一个 `Effect` 程序，然后 `Effect.runPromise`；
- 观测：
  - console proxy → `LOG`；
  - Effect Logger → `LOG`；
  - 简化 span → `TRACE`；
  - `globalThis.logixSandboxBridge.emitUiIntent(packet)` → `UI_INTENT` + `TRACE`；
  - Debug 集成：若能从 `kernelUrl` 解析到 `logix.Debug.internal.currentDebugSinks`，则在当前 fiber locally 注入一个 sink，把 Debug 事件转为 `LOG/TRACE`（目前仅把 `trace:*` 转成 span）。

### Alignment Lab 视角的关键缺口（还没成为“可执行规范”）

1. **缺少“IR-first”的桥接**  
   Sandbox 目前采集的是自定义的 `LOG/TRACE/UI_INTENT`，而不是 Logix 的 Debug/Txn/EffectOp/Replay 的统一 IR。结果是：

- Playground 变成“代码 runner + 日志窗口”，而不是“规范对齐与回放对齐工具”；
- 上层无法做确定性的冲突检测/合并（例如 path 重复定义、单写者规则、覆盖优先级），因为没有统一的最小中间表示。

2. **RUN.actions 未落地**  
   协议里 `RunCommand.payload.actions` 存在，但 worker 的 `handleRun` 完全未消费，意味着 Sandbox 还不能做“可脚本化回放（action 驱动）”，也就谈不上“回放链路可对齐”。

3. **TERMINATE 不可取消运行中的 Effect**  
   当前 `TERMINATE` 仅清空 `currentRunId`，并不会 interrupt 正在跑的 fiber；长任务/死循环会卡死，无法作为 Studio/对齐实验室的可靠执行容器。

4. **UI_CALLBACK 只记录事件，不回注入用户程序**  
   协议层有 `UI_CALLBACK` 与 `UI_CALLBACK_ACK`，但 worker 侧没有把 callback 映射到用户程序可消费的队列/stream，这让“语义 UI Mock 的全双工闭环”还停在占位。

5. **依赖加载策略会放大“多份 Effect 实例”的风险**  
   编译阶段把 `effect` external 到 `https://esm.sh/effect@3.19.13/*`，运行阶段 worker 也必须确保 Logger/Runtime 等全部来自同一份 `effect@3.19.13` 模块实例；否则在 Alignment Lab 场景，任何“多份 Effect 实例导致 Tag/类型身份不一致”的问题都会被放大（尤其是 Context.Tag 体系与层级注入）。

### 性能与内存风险（必须尽早修）

- `SandboxClient` 在每条事件到来时用 `setState({ logs: [...logs, entry] })` / `setState({ traces: [...traces, span] })` 追加数组，且 `TRACE` 更新会 `findIndex` 做 O(n) 查找；高频 trace 下会明显拖慢 UI。
- worker 与 client 都把 `uiIntents/logs/traces` 存成无上界数组（缺少 ring buffer / 裁剪策略），长时间运行必然内存膨胀。
- DebugObserver 若把“完整对象（含闭包/不可序列化内容）”塞进事件，会在 Sandbox 中形成更严重的保留引用（见 `04-diagnostics-and-devtools.md` 的 SlimOp 建议）。

### 不兼容改造建议（让 Sandbox 真正成为 Alignment Lab）

- 以 `Static IR + Dynamic Trace` 为中心重做协议：worker 不再“自定义 trace”，而是输出 IR 事件（Txn/Op/Diagnostic/Replay/ReactTrace），Host 只做渲染与裁剪。
- 补齐可回放链路：实现 `RUN.actions`（按 action 序列驱动 runtime），并把 `runId/instanceId/txnSeq` 串成稳定标识。
- 支持真正的终止：worker 侧为每次 RUN 创建可中断 fiber，并在 `TERMINATE` / timeout 时 interrupt + 清理。
- UI 全双工：把 `UI_CALLBACK` 映射为 worker 内的队列/Stream，使用户程序可以 `yield*` 等待回调并继续执行。
- 性能基线：Host/Worker 两侧都用 ring buffer（容量可配）+ microtask 批量通知，禁止无界数组；trace 的“更新/合并”要改为 Map 索引（O(1)）。
