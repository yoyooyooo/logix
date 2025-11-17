# Research: 060 Txn Lanes（事务后续工作优先级调度 / 可解释调度）

本 research 固化「从 React 并发更新可吸收、且能在 Logix 红线约束下落地」的关键裁决，避免实现阶段把“更激进”误写成“更不可解释/更不可回放”。

## Decision 1：优先级作用域（不做可中断事务）

**Chosen**：

- 优先级只作用于 **事务之外** 的 Follow-up Work（补算/通知/flush 等），以及这些工作在队列中的调度顺序。
- 不引入“可中断事务/事务内 yield”；事务窗口仍同步、零 IO/async。

**Rationale**：

- 事务窗口是确定性与可回放的基础；允许中断会把一致性与证据锚点复杂度指数放大，且容易引入隐式 IO/await。

**Alternatives considered**：

- 在事务内按 deadline yield（类似渲染 work loop）：Rejected（违反事务边界与可回放约束）。

## Decision 2：p95 的核心杠杆是 lane-aware queue（而不是“低优先级通知”）

**Chosen**：

- 把“紧急不被堵塞”做成 Runtime 的硬能力：lane-aware queue（urgent 优先、non-urgent 可让路）。
- 043 的 deferred converge flush 作为第一类 non-urgent Follow-up Work：必须可以在队列层被紧急更新插队。

**Rationale**：

- 仅靠 `dispatchLowPriority`（通知延后）无法避免“补算/flush 本身”占用队列导致交互拖尾；p95 主要被队列堵塞与长事务拖尾击穿。

**Alternatives considered**：

- 只在 React 订阅侧延后通知：Rejected（对 runtime 热点无效，且无法解释 backlog）。

## Decision 3：非紧急工作必须是 Work loop（分片、合并、可取消）

**Chosen**：

- non-urgent backlog 以 Work loop 形式逐片追平：每片遵守预算，并在片与片之间给 urgent 让路。
- backlog 支持合并（coalesce）与取消（cancel）：允许跳过被新输入覆盖的中间态工作，但必须保证最终一致性，并在诊断中可解释。

**Rationale**：

- “一次性 flush 完”会形成长事务拖尾；而“每次都 flush 一点点”如果不可解释/不可合并，会导致抖动与无穷 backlog。

**Alternatives considered**：

- 只做 debounce，不做分片：Rejected（debounce 只推迟开始，不能避免 flush 本身拖尾）。

## Decision 4：work loop 切片粒度必须证据化（microbench）

**Chosen**：

- 在实现 T009（non-urgent work loop）时必须同时引入 microbench：用可复现的输入规模覆盖“切片过粗/切片过细/高频打断”三类极端，测量切片调度开销与让路效果。
- microbench 结果用于反推默认 budget 粒度与 guardrail（例如：最小切片、最大 yield 次数、合并窗口默认值），避免“理论完美但实现吞掉收益”。

**Rationale**：

- JS 单线程里“让路”本身就需要调度成本；切片过粗会让不出，过细会把调度开销放大成新的 p95 来源。
- 没有 microbench，预算粒度只能靠猜，容易在 Phase 2/3 落地时出现“看起来 time-slicing 了但仍然拖尾”的假象。

## Decision 5：不改变现有 dispatch 顺序语义；更激进的“低优先级状态更新”另立入口

**Chosen**：

- 现有 `dispatch`/`dispatchBatch` 仍保持 FIFO 执行语义。
- `dispatchLowPriority` 维持“只影响通知调度，不影响事务执行顺序”的语义。
- 若要把 Action 本身变成 non-urgent（更接近 React Transition 的“状态可见性延后”），应新增独立入口并明确迁移说明（不在本特性强制）。
- React 的 `startTransition` 延后的是“渲染调度/commit 时机”，而本特性延后的是 “runtime 内部 Follow-up Work（以及可能的 ExternalStore 通知）”；两者的时间窗口不完全重叠，必须在用户文档中显式解释，避免把调度变成黑盒。

**Rationale**：

- 直接改变既有 dispatch 排队顺序会引入大量不可预期行为变化；先把 p95 主要矛盾（非紧急 Follow-up Work 堵塞）解决，再考虑更激进语义。

## Decision 6：证据与协议（Slim、可序列化、稳定锚点）

**Chosen**：

- 以本特性 `contracts/schemas/*` 作为 LanePolicy 与 LaneEvidence 的最小契约；
- 诊断输出必须 Slim & 可序列化，并使用稳定锚点（`moduleId/instanceId/txnSeq/opSeq`）；
- `diagnostics=off` 近零成本：不引入常驻计时/对象分配；采样诊断口径与 044 对齐。
- core-ng（trial）不允许“为了省事跳过证据”：一旦 core-ng 宣称可跑，Node+Browser 的 evidence 必须按同一 matrix SSoT 复跑；任何 suite 缺失/不稳定都应阻断进入“supported/切默认”讨论。

**Rationale**：

- “可解释”是性能策略可推广的前提；没有证据口径的策略只会把收益变成债务。

## Decision 7：现代浏览器信号（`navigator.scheduling.isInputPending`）只作为渐进增强

**Chosen**：

- 在支持 `navigator.scheduling.isInputPending` 的现代浏览器中，可以把它作为 non-urgent work loop 的 **额外让路信号**（Progressive Enhancement），用于提升“输入期间低延迟 / 空闲期间高吞吐”的折中。
- 它不是核心依赖：在 Node/不支持的浏览器中必须完全退化为纯时间预算策略，保证行为与证据口径一致（不因为“环境缺 API”而改变语义）。
- 不能把 `!isInputPending()` 当成“可以一直跑”的许可：必须保留 **硬上界**（例如按 frame/宏任务边界定期让出）以避免饿死 React 渲染与 paint（isInputPending 对这些任务并不敏感）。

**Rationale**：

- 仅靠固定时间片很容易出现“过早让路”的无谓开销（空闲时吞吐不足）或“过晚让路”的交互拖尾（输入时延迟上升）；输入待处理信号可作为可选的纠偏信息。

**Alternatives considered**：

- 把 isInputPending 作为必须条件：Rejected（兼容性不足；且它对渲染/raf 等并不完备，会产生新的饥饿风险）。
