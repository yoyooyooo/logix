# Phase 0 Research: Process（长效逻辑与跨模块协同收敛）

**Feature**: [spec.md](./spec.md) (`/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/spec.md`)  
**Plan**: [plan.md](./plan.md) (`/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/plan.md`)  
**Created**: 2025-12-16

本文件用于在实现前固化关键决策与取舍，避免“语义先跑偏、实现后补文档”的事实源漂移。

## Decision 0: 保留 `processes` 作为唯一运行承载（Process 只是收敛命名）

**Decision**: 本特性保留现有 `processes` 机制作为长效/跨模块协同逻辑的唯一运行承载；对外统一命名为 Process，并补齐安装点语义、并发/错误策略与可诊断协议。

**Rationale**:

- 现实落点一致：当前系统已经以 `processes`（含 Link 产物）承载跨模块长期任务，继续演进能避免重复建设与分叉语义。
- 术语去冲突：仓库中 `Program/ProgramRunner` 已被用于 “根模块运行入口”（`Runtime.runProgram/openProgram`）；继续沿用 Program 作为“长效协同”会造成概念冲突。
- 与现有 “Program” 术语区分：例如 StateTrait 的 `Program`（traits 归一化产物）已经存在；本特性不应再引入第三种 Program。

**Alternatives considered**:

- 新建 `ProgramRuntime/ProcessRuntime` 内核：会与现有 `processes + Link + TaskRunner/Flow` 体系重复，且会把诊断/并发语义分叉为两套。
- 继续沿用 “Program” 命名：会与根运行入口 Program 概念正面冲突，导致文档与 API 心智模型漂移。

## Decision 1: Process 是长效逻辑与跨模块协作的唯一收口点

**Decision**: 以 Process 作为表达“跨模块协作 + 长效运行”逻辑的唯一概念与对外入口，历史上用于承载同类能力的机制/入口应被收敛为 Process 的不同安装形态（不保留并行概念）。

**Rationale**:

- 降低心智与维护成本：避免同类能力分散在多处（各自有不同生命周期/诊断/错误语义）。
- 为“严格作用域 + 多实例隔离”提供统一承载体：收敛后才能对所有长效逻辑施加同一套作用域/依赖/隔离约束。
- 为诊断与回放统一事件协议：Devtools/Sandbox 能用同一套事件解释“发生了什么、为何发生、由谁触发、影响了什么”。

**Alternatives considered**:

- 保留现有机制并新增另一套概念：短期更易落地，但会形成两套语义并存，长期必然漂移且难以诊断。
- 只在平台/React 侧提供长效机制：会把语义锁死在某个平台适配层，无法覆盖非 UI 环境与后台场景。

## Decision 2: 三种安装点（应用级 / 模块实例级 / UI 子树级）是同一语义的不同生命周期边界

**Decision**: Process 的核心语义与调度一致，仅生命周期边界由安装点决定：

- **应用级**：随应用运行时启停（全局效果：类似“全局 Effects / bootstrap glue”）。
- **模块实例级**：随宿主模块实例启停（多实例隔离：类似“局部 Effects / per-session processes”）。
- **UI 子树级**：随 UI 子树挂载/卸载启停（feature 级启停：避免全局常驻）。

**Rationale**:

- 同一语义多边界：既吸收 Angular “全局监听”的一致性，也吸收“局部 module/process”在实例隔离与按需启停上的优势。
- 严格作用域前提下，安装点天然决定依赖可见性与目标实例，不需要“猜实例”。

**Notes / Implementation guidance**:

- React 子树安装点必须把 Process 当成“可中断、可复用的资源”，而不是一次性的 `useEffect` 副作用：
  - StrictMode 下 mount/unmount 的 double-invoke 会放大“重复请求/重复订阅/重复 dispatch”的风险；
  - 推荐实现为 provider-scope 的进程注册表（按 `processId + subtreeKey` 做 refCount 复用，并带延迟 stop/GC），卸载时必须 interrupt，确保不会泄漏后台 Fiber。

**Alternatives considered**:

- 仅提供应用级：简单但无法满足多实例隔离与 feature 级启停；会把实例选择再次推回“隐式约定”。
- 仅提供模块实例级：会让平台桥接/全局后台逻辑变得笨重（需要人为造宿主实例）。

## Decision 3: 触发模型统一为“可解释的触发源 → 调度 → 跨模块动作驱动链路”

**Decision**: Process 的触发源支持多类型，但统一建模为结构化 Trigger：

- 触发源类型：模块动作、模块状态变化、平台事件、定时/时钟等；
- Trigger 必须携带最小可序列化上下文（例如源模块/实例锚点、动作名/路径、平台事件名等）；
- Process 的跨模块影响必须通过“动作协议”表达，禁止绕过模块边界直接写入其他模块状态。

**Rationale**:

- 可解释：任何一次跨模块影响都能沿 Trigger → Process → Dispatch 链路回溯。
- 严格事务边界：触发判定与监听不要求在事务窗口内执行；跨模块驱动以显式动作产生新事务，避免事务内 IO/await。

**Alternatives considered**:

- 允许 Process 直接拿到别的模块可写引用：实现快捷但破坏模块边界与事务写入纪律，且诊断难以收敛。
- 允许“跨作用域兜底解析依赖”：能跑但会引入隐式依赖与串实例风险，违背 strict scope 前提。

## Decision 4: 并发语义最小集为 4 类可区分策略，并以取消/背压语义固定化

**Decision**: Process 的并发策略至少覆盖四类，且语义一致可测试：

- **latest**：只保留最新一次触发（旧的执行会被取消或结果被抑制），最终只产生一次可见结果。
- **serial**：按触发顺序串行处理（可配置队列上限；未配置时默认 `unlimited`，但超限护栏默认 failStop 并可诊断）。
- **drop**：执行中忽略重入（触发发生但不启动新执行，需产出可诊断的“被忽略”证据）。
- **parallel**：并行处理（可配置最大并发；超限需背压/丢弃并可诊断）。

**Rationale**:

- 这 4 类能覆盖多数业务对“只要最新”“必须按序”“避免重入”“允许并行”的核心诉求。
- 并发/取消语义固定化后，诊断事件与性能预算才可稳定建立与回归。

**Alternatives considered**:

- 完全交给业务用 Fiber/队列自己实现：自由度高但会把关键语义散落在业务代码，无法统一诊断与预算。
- 提供过多策略（丰富到策略矩阵）：早期易膨胀且难以验证，违背 KISS/YAGNI。

## Decision 5: 错误策略默认“失败即停”，可选受控监督（有上限）

**Decision**:

- 默认错误策略：Process 发生未处理失败时，进入失败/停止状态，不进行隐式无限重试；
- 可选监督策略：允许受控重启，但必须有明确上限（例如 `maxRestarts` + 窗口）并产出 restart 诊断事件；达到上限后停止。

**Rationale**:

- 防止“错误风暴”与无界重试造成的不可控成本与系统不确定性。
- 让平台/运维能把 Process 视为一等可监督单元（可观测、可停止、可解释）。

**Alternatives considered**:

- 默认无限重试：可能掩盖错误并导致日志/事件刷屏，违背可运维性与性能预算。
- 默认静默吞错：破坏可诊断性，且容易形成“看起来没事但逻辑已停摆”的隐患。

## Decision 6: Process 稳定标识模型（禁止随机/时间默认 id）

**Decision**: 以稳定锚点组合派生 Process 的身份：

- `processId`：Process 定义的稳定标识（建议由作者显式提供）；
- `scope`：安装点对应的作用域锚点（应用级 / 模块实例级 / UI 子树级）；
- `runSeq`：同一安装记录内的运行序列（从 1 递增；监督重启会递增）。

事件级别补充：

- `triggerSeq`：同一 Process 运行实例内的触发序列（从 1 递增），用于串联 Trigger → Dispatch 的因果链；
- 当 Trigger 来自模块事务（moduleAction/moduleStateChange）时，**必须**携带源模块的稳定事务锚点 `moduleId + instanceId + txnSeq`（可由 `instanceId + txnSeq` 确定性派生 `txnId`，禁止随机/时间）；并要求 `process:dispatch` 事件同时携带 `trigger` 与 `dispatch`，保证“触发（含事务锚点）→ 驱动（目标动作）”链路可解释。

**Rationale**:

- 满足宪章“稳定标识”硬约束，为回放、对齐与性能回归提供可靠锚点。
- 让跨模块协作在多实例下可定位：同一个 `processId` 在不同 scope 中互不混淆。

**Alternatives considered**:

- 使用随机/时间生成 id：实现简单但无法跨运行对齐，也不利于回放与基准对比。
- 使用哈希：可行但需要稳定输入源；在缺少稳定 key 时仍需 fallback，复杂度更高。

## Decision 7: 诊断事件协议必须 Slim、可序列化且有预算上界

**Decision**: Process 诊断事件至少覆盖：

- 生命周期：start/stop/restart；
- 运行链路：trigger/dispatch；
- 错误：error（携带可序列化 error summary 与策略结果）。

并满足：

- 事件载荷 **Slim & 可序列化**：禁止携带 Effect 本体、闭包或大型对象图进入事件与 ring buffer；
- 事件预算：单个 Process run 内事件数量与单条事件大小有明确上界（在 schema 与 data-model 中固化）；
- 诊断分档：关闭时近零成本；开启时成本可预估并可基准验证。

**Rationale**:

- Devtools/Sandbox 的 ring buffer 必须可裁剪；事件协议若不可控会反向污染性能与稳定性。
- 结构化事件是解释链路的唯一事实源：能回答“为何触发、触发了什么、驱动了什么”。

**Alternatives considered**:

- 直接透传运行时对象/错误对象：调试方便但不可序列化且风险极高（内存/分配/桥接都不可控）。

## Decision 8: 性能基线以“触发判定/调度开销”与“诊断开销分档”为核心

**Decision**: Phase 2 实现前后都必须给出可复现基线，并至少覆盖：

- 无 Process 安装时：触发判定路径应接近零成本（不引入额外全量扫描/分配）。
- 少量 Process（例如 5 个）时：每次触发的额外开销 p95 ≤ 5%（诊断关闭时 ≤ 1%）。
- 诊断分档对比：off/light/sampled/full 的时间/分配开销差异具备可解释证据（至少一类指标）。

**Rationale**:

- Process 触及核心路径（动作/变化触发），必须先建立“可测量”的回归防线。

**Alternatives considered**:

- 只在实现后 profile：无法建立基线与回归准线，难以长期演进。

## Decision 9: 迁移策略以“可批量替换”为目标，不保留兼容层

**Decision**: 迁移以“删除旧入口 + 迁移说明替代兼容期”为原则：

- 将历史长效逻辑入口映射为 Process（按安装点归类：应用级/实例级/子树级）；
- 将跨模块依赖由隐式捕获/全局访问迁移为“作用域内可见依赖 + 动作协议驱动”；
- 迁移说明写入 `quickstart.md` 并同步到 `docs/ssot/handbook/reading-room/reviews/99-roadmap-and-breaking-changes.md`。

**Rationale**:

- 本仓库拒绝向后兼容；越早收敛越少“遗留语义债”。

**Alternatives considered**:

- 保留兼容层：短期减少改动，但会长期拖累契约演进与诊断一致性。

## Decision 10: `moduleStateChange` 触发必须复用 selector 订阅（不做全量 diff / 轮询）

**Decision**: Process 的 `moduleStateChange` 触发器实现必须复用现有 Store/ModuleRuntime 的 selector 订阅能力（`ModuleRuntime.changes(selector)` / `ModuleHandle.changes(selector)`），并在语义与实现上明确：

- **不允许** 在触发判定路径里做“全量 state diff”或周期性轮询；
- 触发器的 selector 必须是“窄视图”（例如字段/路径级），并通过 distinct 语义只在值变化时触发；
- 如需表达 fieldPath，优先把 fieldPath 映射为 selector（或等价的 path getter），避免引入第二套订阅系统。

**Rationale**:

- 现状证据：仓库已有 `ModuleRuntime.changes(selector)` 作为 selector 订阅入口（Link 也直接复用该能力），可用于构建高效的“状态变化触发”而不引入全量扫描。
- 性能风险可控：selector 订阅的成本主要是“每次 commit 计算 selector + distinct”，其复杂度由 selector 决定；只要强制“窄视图 selector”，就不会退化成对整棵 state 的 diff。
- 语义一致：让 `moduleStateChange` 与现有 watcher/Link 的订阅模型保持一致，避免 Process 另起炉灶造成两套触发语义与诊断口径分叉。

**Notes / Implementation guidance**:

- Phase 2 必须优先验证：`ModuleRuntime.changes` 在高频 commit 下的开销与分配是否满足 NFR-001/NFR-002；若不满足，再考虑在 **诊断开启** 时用 dirtySet/commit meta 做“变化域预过滤”的优化（但不得改变诊断关闭路径的近零成本目标）。
- `moduleStateChange` 的事件载荷保持 Slim：仅携带必要锚点（moduleId/instanceId/selectorName 或 fieldPath）与稳定的 `triggerSeq`，禁止把整段 state/大型对象图塞进事件。
- 需要正视 selector 的 DX/性能陷阱（这是复用订阅模型的代价）：
  - selector 必须是 **纯函数 + 低成本 + 返回稳定值**（优先 primitive/tuple；避免每次返回新对象导致 `Stream.changes` 去重失效）；
- 仅在 dev/test 或 diagnostics=light/sampled/full 下，对 selector 的耗时与触发频率做采样告警（warning 事件），避免把测量开销引入 diagnostics=off 热路径。

## Decision 11: Process 必须显式遵守事务边界（事务内禁止 IO/await，违规需可诊断）

**Decision**: Process 的触发与调度必须始终发生在同步事务窗口之外；若在事务窗口（或等价的“同步事务 fiber”）内触发了 Process 的调度入口，系统必须：

- 以稳定、可解释的方式 **阻止执行**（避免死锁/卡队列）；
- 在 dev/test（或 diagnostics=light/sampled/full）下产出结构化诊断信号（指出触发来源与修复建议），而不是静默吞掉。

**Rationale**:

- 宪章硬约束：事务窗口内禁止 IO/await；而 Process 的存在价值之一就是承载长期/异步副作用，必须把边界做成“系统级不变量”，而不是靠调用方自觉。
- 现状可复用：运行时已有 `TaskRunner` 的“同步事务 fiber 禁用” guard 语义（避免 txnQueue 自等导致死锁）；Process 应复用同一防线与诊断口径，避免出现第二套“看起来能跑但偶发卡死”的边界。

**Notes / Implementation guidance**:

- Guard 的目标不是“在事务内执行 IO”，而是“在事务内调度/等待会导致 txnQueue 自等的逻辑”一律 no-op + 诊断；真正的 IO 只能在事务外 fiber 中运行，并通过 dispatch/writeback 回到事务。

## Decision 12: Process 只获得 ModuleHandle 视图（禁止跨模块可写引用逃逸）

**Decision**: Process 逻辑中对模块的访问必须统一通过 `ModuleHandle`（read/changes/dispatch/actions），不得把 `ModuleRuntime.setState` 或可写 Ref/SubscriptionRef 作为跨模块协作的手段暴露给 Process。

**Rationale**:

- 直接写其他模块状态会破坏模块边界与可诊断性：会让“为何变化/由谁触发”无法稳定归因到动作协议。
- `ModuleHandle` 形态能把跨模块影响收敛为“触发 → 调度 → dispatch”，与 FR-005、事务边界与诊断链路天然一致。

**Notes / Implementation guidance**:

- 运行时内部可以持有 ModuleRuntime，但对 Process 逻辑只投影为 `ModuleHandle`；Link 目前已经是该模式，Process 应复用。

## Decision 13: Process 的静态面（Definition/Installation）视为 Static IR，必须可导出且与 Trace 对齐

**Decision**: Process 的 `Definition` / `Installation`（含 scope/identity/策略/触发器声明）属于 Static IR 的一部分，必须满足：

- **可序列化**：不携带闭包/Effect 本体/大型对象图；
- **可导出**：至少能通过 InternalContracts/Devtools 导出（供平台对齐/回放/审计）；
- **与 Dynamic Trace 对齐**：动态事件必须引用稳定 identity（`processId + scope + runSeq/triggerSeq`），避免出现“静态/动态两套 id”漂移。

**Rationale**:

- 宪章要求所有高层抽象可完全降解到统一最小 IR（Static IR + Dynamic Trace）；如果 Process 的静态装配信息无法导出，Devtools/Sandbox 就只能依赖“并行真相源”（运行时对象图），会直接违背 IR-first 原则。

## Decision 14: DX 以“最小 API + 默认收敛”为目标，不引入 `Process.of(effect)` 这类隐式 id

**Decision**:

- 对外只保留最小入口：`Process.make(processId, effect)` / `Process.make({ processId, ... }, effect)` 与特化入口 `Process.link(...)`；
- 不提供 `Process.of(effect)`：因为无法在不引入随机/时间的前提下为其生成稳定 `processId`，会直接破坏可导出 Static IR 与可回放诊断链路；
- 运行时仍允许“裸 `Effect`”被塞进 `processes`（历史能力），但它不属于 Process 体系：缺少 definition/identity，诊断与导出能力受限；建议在 dev/test 给出一次性提示，引导迁移到 `Process.make/link`。
