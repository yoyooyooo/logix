---
title: Process / Link / Scheduling 教程 · 剧本集（长期进程、触发器、并发、错误策略、scope）
status: draft
version: 1
---

# Process / Link / Scheduling 教程 · 剧本集（长期进程、触发器、并发、错误策略、scope）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 Process（含 Link）作为“长期运行程序 + 元数据”的设计动机、安装点、触发/并发/错误策略、事务窗口边界、以及可诊断链路讲清楚。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

建议按这个顺序（从“裁决/语义”到“实现/证据”）：

1. 运行时容器与安装点（SSoT 摘要）：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`
2. AppRuntime 装配与 Process 安装（实现备忘）：`docs/ssot/runtime/logix-core/impl/01-app-runtime-and-modules.03-flatten-algorithm.md`（3.3）
3. Public API（用户向，快速扫一遍即可）：`apps/docs/content/docs/api/core/process.cn.md`
4. 关键实现（先看“定义”，再看“运行时”）：
   - `packages/logix-core/src/Process.ts`
   - `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
5. 作为“可运行教程”的测试入口（挑你关心的场景跑）：
   - 并发：`packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
   - 错误策略：`packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`
   - 边界：`packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`
   - React 子树：`packages/logix-react/test/Hooks/useProcesses.test.tsx`

---

## 1. 心智模型：Process 解决的不是“怎么写 Effect”，而是“怎么管理长期运行与协作”

在 Logix 里，长期运行逻辑很多：预热/刷新/订阅、跨模块协调、平台桥接、UI 子树副作用、Devtools 抽样等。你当然可以随便 `Effect.forkScoped(...)`，但**只有 Process 能让 runtime “识别并结构化管理”这些长期逻辑**：

- **安装点（scope）显式**：app / moduleInstance / uiSubtree 三种 scope，是“生命周期与隔离边界”的最小集合。
- **触发器显式**：platformEvent / moduleAction / moduleStateChange / timer 四类 trigger，是“可解释因果链”的最小集合。
- **并发策略显式**：latest / serial / drop / parallel，是“可控的背压与取消语义”的最小集合。
- **错误策略显式**：failStop / supervise，是“可控重启与上限”的最小集合。
- **诊断与证据链内建**：`process:*` 事件 + 预算/裁剪 + txn anchor，保证“可解释但不偷性能”。

> 一句话：Process 是“长期运行程序的 **运行时契约**”，而不仅是一个 Effect。

### 1.1 Process vs Logic：为什么不要把“跨模块胶水”塞进某个 Logic

- Logic 属于某个模块实例：它天然更适合处理“本模块的 action/state”与“本模块内部的流式约束”。
- 跨模块协作如果塞进某个 Logic，会带来三类隐患：
  1. **scope 隐式**：你会不自觉地用 Tag 去猜另一个模块实例；strict imports/root provider 的裁决会被绕开或被误用。
  2. **生命周期错位**：模块实例的 scope 关闭时，协作逻辑也会一起死；但协作可能是 app 级别的。
  3. **因果链不可解释**：谁触发了协作？为什么重入？为什么并发？这些在“散落 fiber”里很难统一观测。

因此：跨模块胶水（尤其是协调器/桥接器）优先用 `Process.link` 或 `Process.linkDeclarative`（或等价别名 `Link.make/Link.makeDeclarative`）。

### 1.2 术语对齐（本教程后文默认使用这些词）

- **ProcessDefinition**：描述 processId / triggers / concurrency / errorPolicy / diagnosticsLevel / requires 的“静态面”。
- **Installation**：把一个带 meta 的 Effect 安装到某个 scope，得到一个可被 runtime 管理的实体。
- **Scope**：Process 的生命周期边界：`app` / `moduleInstance` / `uiSubtree`。
- **Instance**：一次实际运行（具备 runSeq）；同一个 Installation 可以因为 restart 或重装产生多个 Instance。
- **Trigger**：一次触发信号；可能带 `txnSeq`（来自 moduleAction/moduleStateChange），用于锚定到事务参考系。
- **ConcurrencyPolicy**：触发到来时，run 的取消/排队/并行策略。
- **DiagnosticsLevel**：是否记录“触发→派发”的链式事件；`off` 要求接近零成本。

---

## 2. 核心链路（从 0 到 1：定义 → 安装 → 触发 → 调度 → 诊断）

### 2.1 定义：`Process.make` 把“程序 + 元数据”绑在一起

入口：`packages/logix-core/src/Process.ts`

- `Process.make(definition, effect)`：把 meta attach 到 effect 上，让 runtime 识别它是一个 process。
- `definition` 可以直接给字符串 `processId`，此时会走默认策略：
  - triggers：默认包含 `{ kind: 'platformEvent', platformEvent: 'runtime:boot' }`
  - concurrency：`{ mode: 'latest' }`
  - errorPolicy：`{ mode: 'failStop' }`
  - diagnosticsLevel：`'off'`

这四个默认值非常关键：它们是“零心智负担”的 safe default（能跑、能停、不会堆积、不会默默吃性能）。

### 2.2 安装点：同一个 Process，可以在三类 scope 下被安装

三类 scope（协议定义）：`packages/logix-core/src/internal/runtime/core/process/protocol.ts`

- `app`：跟随 Runtime Tree 的启停（Root ModuleImpl 的 `processes: []`）
- `moduleInstance`：跟随某个模块实例的 scope（该 ModuleImpl 的 `processes: []`）
- `uiSubtree`：跟随 React UI 子树挂载/卸载（React `useProcesses(...)`）

直觉选型：

- **跨模块协调器**（例如 Search → Detail）更像 app-scope（属于这棵 Runtime Tree 的 root）；
- **实例内后台任务**（例如某个列表模块实例自己的 polling）更像 moduleInstance-scope；
- **UI 局部副作用**（例如某个路由子树在 mount 时启动的统计/桥接）更像 uiSubtree-scope。

> 一个重要约束：scope 是“隔离边界”。尤其 moduleInstance-scope 必须保证多实例严格隔离，避免串扰。

### 2.3 ProcessRuntime：安装与调度的单一事实源

实现：`packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`

ProcessRuntime 的关键职责：

1. `install(process, { scope, enabled, installedAt, mode })`
2. 统一触发与调度（streams → concurrency.run）
3. 统一错误策略（failStop / supervise）
4. 统一 `process:*` 事件与 Debug 链路（可选，受 diagnosticsLevel 控制）
5. 强制事务窗口边界（禁止在同步事务窗口里 deliver/schedule）

#### 2.3.1 “raw Effect fallback” 是兼容兜底，不是推荐路径

`ProcessRuntime.install(...)` 如果拿到的 Effect 没有 meta，会返回 `undefined`。

上层（AppRuntime / ModuleRuntime / React hook）通常会把这种 “raw Effect” 当兼容兜底直接 fork：

- 它仍然能运行，但：
  - 没有 ProcessDefinition（无法触发器化、无法统一并发/错误策略）
  - 不会产生标准 `process:*` 事件（诊断链路缺口）

因此：长期任务/跨模块协作应尽量用 `Process.make` / `Process.link` / `Process.linkDeclarative`，不要裸 fork。

#### 2.3.2 requires：scope 内依赖必须可解析（缺失要报“可行动”的错误）

安装时会检查 `definition.requires`（例如 Link 会自动把参与模块加入 requires）：

- 如果缺失依赖，会触发 `process::missing_dependency` 并给出 Strict scope 的 hint。
- 对应的“可运行证据”：`packages/logix-core/test/Process/Process.AppScope.MissingDependency.test.ts`

这条规则的价值是：它把“隐式 Tag 猜测失败”变成可解释的配置错误。

### 2.4 触发器：四类 trigger，统一进入一个 triggerStream

触发器类型在协议里定义：`packages/logix-core/src/internal/runtime/core/process/protocol.ts`

ProcessRuntime 在 instance fiber 内会构造一个 merge 后的 triggerStream：

- `platformEvent`：通过 `deliverPlatformEvent` 投递到 instance 内的 queue（`platformTriggersQueue`）
- `timer`：`Stream.tick(Duration)`（`timerId` 解析失败会报 `process::invalid_timer_id`）
- `moduleAction`：订阅模块的 `actions$` 或 `actionsWithMeta$`（后者带 txnSeq）
- `moduleStateChange`：订阅模块的 `changesWithMeta(selector)`（selector 由 path + schemaAst 构造）

一个细节但很关键：当 diagnosticsLevel 为 `off` 时，runtime 会尽量避免订阅“更贵的流”（例如 `actionsWithMeta$`），以减少热路径订阅者数量。

### 2.5 调度：concurrency policy 决定“触发来了之后怎么 run”

实现：`packages/logix-core/src/internal/runtime/core/process/concurrency.ts`

四种模式：

- `latest`：新触发到来会 interrupt 上一次 run（适合“只要最新结果”的场景）
- `serial`：串行执行，允许排队（适合“必须按序处理”的场景；注意 maxQueue）
- `drop`：忙时直接丢弃触发（适合“只要边沿信号，不要堆积”的场景）
- `parallel`：并行执行（受 `maxParallel` 限制；内部也有 queue guard 防爆）

队列防爆：

- `serial` 的 queue 默认虽然“用户看起来是 unbounded”，但 runtime 会用 guard 限制内存增长；
- guard 触发时，会 fail-stop，并给出 `process::serial_queue_overflow` 的可行动 hint（切 maxQueue / 换模式）。

“可运行证据”：

- `latest` vs `serial`：`packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
- `drop` vs `parallel`：`packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts`

### 2.6 错误策略：failStop vs supervise

实现：`packages/logix-core/src/internal/runtime/core/process/supervision.ts`

- `failStop`：第一次失败即停止（仍会记录 `process:error`，并发出 `process::failed_stop` 诊断）
- `supervise`：在 window 内最多重启 `maxRestarts` 次；每次 restart 会让 runSeq 递增，并发出 `process:restart`

“可运行证据”：`packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`

### 2.7 事务窗口边界：ProcessRuntime 不能在同步事务窗口里 deliver/schedule

实现入口：

- `deliverPlatformEvent` 内部会调用 `TaskRunner.shouldNoopInSyncTransactionFiber(...)`
- 命中时发出诊断：`code = process::invalid_usage`

“可运行证据”：`packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`

这条边界的意图：避免在同步事务窗口里引入可能死锁 txnQueue 的操作；让调度/触发发生在事务窗口之外。

### 2.8 诊断链路：diagnosticsLevel=off 的硬约束与“链式事件”

ProcessRuntime 的事件协议：`packages/logix-core/src/internal/runtime/core/process/protocol.ts`

- 事件类型：`process:start/stop/restart/trigger/dispatch/error`
- 当 diagnosticsLevel 为 `off` 时，要求尽量接近零成本：
  - 不进入 Debug sinks（除非错误需要发 diagnostic）
  - 不订阅 meta 流（减少热路径订阅者）
- 当 diagnosticsLevel 为 `light/full` 时，会记录“触发→派发”链路：
  - trigger 事件携带 `triggerSeq`（每个 instance 内递增）
  - 若 trigger 来自 moduleAction/moduleStateChange，会携带 `txnSeq` 并导出 `txnId = ${instanceId}::t${txnSeq}`
  - dispatch 事件会把同一个 trigger 回填，形成可解释链

另外还有两条“性能防线”：

- **事件预算**：每次 run 最多允许一定数量的 trigger/dispatch 事件，超出会发 `process::event_budget_exceeded` 的 summary（并 suppress 后续事件）。
- **事件体裁剪**：事件会被强制控制在字节预算内（默认 4KB），必要时裁剪 error.hint。

实现：`packages/logix-core/src/internal/runtime/core/process/events.ts`

“可运行证据”：

- 链式事件 + JSON 可序列化：`packages/logix-core/test/Process/Process.Diagnostics.Chain.test.ts`
- 预算门禁：`packages/logix-core/test/Process/Process.Events.Budget.Enforcement.test.ts`

### 2.9 Link：黑盒 best-effort vs Declarative IR 强一致

Link 的 public 入口有两套（等价别名）：

- 黑盒 Link：`Process.link` 或 `Link.make`
- Declarative Link：`Process.linkDeclarative` 或 `Link.makeDeclarative`

#### 2.9.1 `Process.link`：黑盒胶水（best-effort，不保证同 tick 收敛）

`Process.link(config, logic)` 的典型形态是“订阅一个模块流，再派发到另一个模块”：

- 好处：自由度大（你可以用任意 Stream/Effect 组合）
- 代价：这是黑盒程序，runtime 只能 best-effort 观测它，**不能证明它在同一个 tick 内收敛**

因此实现里会在 diagnostics!=off 时记录一个明确的边界诊断事件：

- `code = process_link::blackbox_best_effort`
- message 会提示：同 tick 强一致只对 declarative IR 成立

入口：`packages/logix-core/src/Process.ts`

#### 2.9.2 `Process.linkDeclarative`：受控 builder，导出 DeclarativeLinkIR（同 tick 强一致的前提）

DeclarativeLink 的定位是：让“跨模块收敛关系”从黑盒 Effect 变成可识别、可序列化、可 diff 的 IR。

- IR 结构：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`
  - `version: 1`
  - nodes：只允许 `readQuery`（静态 ReadQueryStaticIr）与 `dispatch`
  - edges：read → dispatch
  - digest：`dlink_ir_v1:${fnv1a32(stableStringify(ir))}`
- 关键限制（fail-fast）：
  - `read(selector)` 里的 selector 必须是 static lane 且具备 `readsDigest`，并且 `fallbackReason == null`
  - 不满足会直接 throw，并提示修复：用 `ReadQuery.make(...)` 或标注 `selector.fieldPaths`

DeclarativeLink 会注册到 runtime（`registerDeclarativeLink`），并在存在 converge static IR collectors 时导出 IR（用于 EvidenceCollector/Devtools 的静态面索引）。

> 直觉：DeclarativeLinkIR 不是用户输入，而是受控 builder 的产物；因此它能保证“写侧不逃逸”（只允许 dispatch）。

---

## 3. 剧本集（你会遇到的高频场景）

### A) 跨模块协调：Source action → Target dispatch（黑盒 Link）

目标：把一个模块的 action 流转换成另一个模块的 action。

证据用例：`packages/logix-core/test/Process/Process.AppScope.Coordinate.test.ts`

要点：

- Link 里通常用 `actions$` 做订阅，再调用 `target.actions.xxx(...)` 派发。
- 这是 best-effort：它是“异步协调”，而不是“同 tick 收敛”。

### B) 依赖缺失：Strict scope 要报可行动错误

目标：当 Link/process 需要的模块 runtime 不在 scope 中，必须给出 actionable error（不能 silent）。

证据用例：

- app-scope：`packages/logix-core/test/Process/Process.AppScope.MissingDependency.test.ts`
- moduleInstance-scope：`packages/logix-core/test/Process/Process.ModuleInstance.MissingDependency.test.ts`

### C) 并发模式选择：latest/serial/drop/parallel

目标：让“背压/取消/并行”在运行时层可控、可观测。

证据用例：

- `latest` 会 interrupt 前序 run：`packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`
- `serial` 不重叠：同上
- `drop/parallel`：`packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts`

经验选型（不是裁决，只是经验）：

- 外部信号高频、只要最新：`latest`
- 业务必须按序、不允许丢：`serial`（务必配置 maxQueue）
- 只要边沿、不要堆积：`drop`
- 可并行、吞吐优先：`parallel`（控制 maxParallel）

### D) 错误策略：supervise 重启上限

目标：错误不可避免，但重启必须受控（不能无限重启）。

证据用例：`packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`

你应该关注：

- runSeq 的递增（每次 restart 都会生成新的 instance identity）
- restart 事件与 error 事件的配对关系

### E) 事务窗口边界：不要在同步事务窗口里 deliver/schedule

目标：在 transaction body 内 deliver 平台事件要被 noop 并发出诊断。

证据用例：`packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`

### F) moduleAction trigger：diagnostics 开关影响“锚点”与“热路径订阅成本”

目标：

- diagnostics=off：尽量不要订阅 `actionsWithMeta$`（减少热路径订阅者）
- diagnostics=light/full：为了 txnSeq/txnId anchor，需要订阅 meta 流并记录链式事件

证据用例：`packages/logix-core/test/Process/Process.Diagnostics.Chain.test.ts`

### G) moduleStateChange trigger：路径选择 + selector 退化诊断

目标：用 `path` 订阅状态变化，并避免“高频/慢 selector”把系统拖垮。

证据用例：

- 基本语义：`packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
- selector 诊断：`packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`

你会看到两个 warning code：

- `process::selector_high_frequency`
- `process::selector_slow`

它们是“解释不撒谎”的退化口径：告诉你订阅太频繁或 selector 太慢，并给出修复建议（缩小 path、让返回值稳定、避免返回新对象）。

### H) timer trigger：DurationInput 解析失败要报 `process::invalid_timer_id`

证据用例：`packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`

### I) React UI 子树：`useProcesses` 的正确姿势（StrictMode / Suspense）

目标：让 UI 子树上的 processes：

- mount 只启动一次（StrictMode safe）
- unmount 后按 gcTime 回收（吸收 StrictMode / Suspense 抖动）
- Suspense 在 commit 前不应安装（避免“没 commit 的树也启动后台任务”）

证据用例：`packages/logix-react/test/Hooks/useProcesses.test.tsx`

实现入口：`packages/logix-react/src/internal/hooks/useProcesses.ts`

关键点：

- subtree registry 用 `subtreeId + signature` 防止同一个 subtreeId 被不同 process 集合抢占
- 建议在 React 侧 `useMemo(() => [proc], [])` 保持 processes 数组稳定，避免不必要 churn

### J) DeclarativeLink：同 tick 强一致的 IR 形态

当你遇到“同 tick 必须收敛”的跨模块关系时，优先考虑 declarative link：

- 构造入口：`Process.linkDeclarative` / `Link.makeDeclarative`
- IR 定义：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`
- 约束闭包的背景（ReadQueryStaticIr/readsDigest）：`docs/ssot/handbook/tutorials/09-state-trait-readquery-closure.md`
- 规格落点（契约侧）：`specs/073-logix-external-store-tick/contracts/ir.md`（DeclarativeLinkIR v1）

---

## 4. 代码锚点（Code Anchors）

Public API：

- `packages/logix-core/src/Process.ts`
- `packages/logix-core/src/Link.ts`

Runtime 内核（ProcessRuntime）：

- `packages/logix-core/src/internal/runtime/core/process/protocol.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
- `packages/logix-core/src/internal/runtime/core/process/supervision.ts`
- `packages/logix-core/src/internal/runtime/core/process/events.ts`

DeclarativeLink IR：

- `packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

安装点：

- app-scope：`packages/logix-core/src/internal/runtime/AppRuntime.ts`
- moduleInstance-scope：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- uiSubtree-scope：`packages/logix-react/src/internal/hooks/useProcesses.ts`

InternalContracts（测试/工具入口）：

- `packages/logix-core/src/internal/InternalContracts.ts`（installProcess/deliverProcessPlatformEvent/getProcessEvents 等）

Tests（可运行教程）：

- `packages/logix-core/test/Process/*`
- `packages/logix-react/test/Hooks/useProcesses.test.tsx`

---

## 5. 验证方式（Evidence）

最小闭环（一次性运行，不进 watch）：

- core：`packages/logix-core/test/Process/*`
- react：`packages/logix-react/test/Hooks/useProcesses.test.tsx`

如果你要验证某个具体语义，优先挑对应的测试文件作为“可运行剧本”，并以它为基线做增量改动。

---

## 6. 常见坑（Anti-patterns）

1. **把长期任务当成随手 fork 的 fiber**：能跑，但 runtime 不认识、诊断链断、scope 很容易错。
2. **在同步事务窗口里 deliver/schedule**：会被 noop 并发 `process::invalid_usage`；正确做法是把触发移出 txn body。
3. **serial 不设 maxQueue**：高频 trigger 会堆积，最终触发 queue guard fail-stop；要么设 maxQueue，要么换 latest/drop。
4. **moduleStateChange selector 返回新对象**：会导致“看起来每次都变”，触发风暴；尽量返回 primitive/tuple，或缩小 path。
5. **黑盒 Link 里假设同 tick 强一致**：`Process.link` best-effort；需要强一致时用 `Process.linkDeclarative` 并满足 ReadQuery 静态约束。
6. **React 侧 processes 数组不稳定**：每次 render 都新建数组会导致 install/uninstall churn；用 `useMemo` 固定引用。
7. **同 subtreeId 绑定了不同 process 集合**：`useProcesses` 会 fail-fast（这是防呆，不是 bug）；换 subtreeId 或保持 processes 稳定。

