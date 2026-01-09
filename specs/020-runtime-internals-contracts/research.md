# Research: Runtime Internals Contracts（关键裁决与全链路治理）

**Feature**: `specs/020-runtime-internals-contracts/spec.md`  
**Plan**: `specs/020-runtime-internals-contracts/plan.md`  
**Created**: 2025-12-21

本文件用于把“运行时内部契约化改造”的关键取舍收敛为可执行裁决（Decision/Rationale/Alternatives），并明确与性能基线、诊断证据、以及文档 SSoT 的对齐关系，避免实现漂移。

## Decision 1: 以 RuntimeKernel + Runtime Services 作为唯一装配与扩展机制

**Decision**  
在 `packages/logix-core/src/internal/runtime/**` 内引入内部 RuntimeKernel（单一装配点），并将核心能力拆为可替换的 Runtime Services（最小契约）。所有子模块通过 Effect Env（Tag/Layer）获得依赖，禁止跨文件长参数列表“手动接线”。

**Rationale**  
- 当前参数爆炸已经证明“拆文件但不改装配模型”会把复杂度转移到调用点，且阻断持续演进。  
- Effect 的强项是显式 Env + 可组合 Layer：把“依赖”从形参移动到 Env，天然带来可替换性、可测试性、可读性。  
- 运行时热路径可通过“初始化取一次服务 → 闭包捕获”的方式保持零额外查找成本，实现 Effect‑Native 与性能兼得。

**Alternatives considered**  
1) **维持现状（参数继续增长）**：短期最省事，但长期迭代成本呈指数上升，且容易引入隐式耦合与资源泄漏。  
2) **全面 Layer 化到每个函数调用都 `Effect.service`**：过度 Effect 化可能在热路径引入可感知开销与噪声；本特性采用“构建期解析、运行期闭包”的折中。

## Decision 2: 全链路纳入范围（本次必须改 vs 值得顺手改 vs 暂缓）

**Decision**  
本次重构以 `ModuleRuntime` 为中心，但不局限于单文件：按“链路耦合度与演进阻力”选择纳入点。

**纳入（本次必须）**
- `ModuleRuntime.*`：把 txnQueue/dispatch/transaction/runOperation/internalHooks 变成明确子系统（Runtime Services），并由 RuntimeKernel 统一装配。  
- internal hooks 桥接：保留现有 `runtime.__*` 形态作为内部适配层，但其实现改为调用子系统服务（避免继续在 `installInternalHooks(...)` 传参接线）。
- 全链路内部消费方迁移：`BoundApiRuntime`、trait-lifecycle、state-trait（install/source/validate 等）与 `@logixjs/react` strict imports 解析，必须统一迁移到内部契约入口（不再直接读散落的 `__*` 字段），否则“契约化”收益无法扩散到真实调用链。

**纳入（高 ROI，顺手改）**
- `BoundApiRuntime` 的内部桥：把 `__runWithStateTransaction/__recordStatePatch/...` 的获取方式从“鸭子类型读属性”升级为“优先从 Env/Kernel 取内部能力”（仍保持对外 API 形状不变）。  
- `runOperation`/EffectOp middleware：把 middleware stack 的解析与 meta/linkId 注入统一收敛到 OperationRunner 子系统，避免在多个位置重复做 FiberRef/Env 访问。
- 证据采集与 IR 摘要导出：将 `ConvergeStaticIrExport` 的注册与 EvidencePackage.summary 的构造从 DevtoolsHub 全局单例中解耦出来，支持按 RunSession/Scope 注入采集器（DevtoolsHub 仅作为可选 consumer）。

**暂缓（记录为后续 Backlog）**
- AppRuntime 的 TagIndex/Env 拓扑可视化增强（属于更大范围 devtools 能力）。  
- Devtools UI 的性能治理与状态管理（应在 devtools 轨道单独开 spec）。  
- 大规模迁移/重写 public API（本特性明确禁止）。

**Rationale**  
- “必须纳入”项是为了解决参数爆炸与装配漂移；不做会让架构目标无法落地。  
- “顺手改”项是因为其耦合点紧贴 ModuleRuntime 热路径，且与服务化边界天然一致。  
- “暂缓”项虽然重要，但会显著扩大影响面并增加破坏性风险，不符合本特性“对外稳定”的主约束。

**Alternatives considered**  
1) **只改 ModuleRuntime，不动桥接点**：会留下大量隐式耦合（仍需要传参/读私有字段），新架构难以推广。  
2) **趁机全仓大重构**：违背“可交付/可验证”的最小增量原则，且回归面不可控。

## Decision 3: 覆写语义以“模块实例作用域”为第一公民（Strict by Default）

**Decision**  
将子系统覆写（例如 TxnScheduler/TxnEngine/DiagnosticsPolicy）定义为**按模块实例**生效的覆写能力：默认 strict（不跨实例泄漏、不回退全局），并定义清晰的优先级与来源证据（builtin < runtime_default < runtime_module < provider < instance）。

**Rationale**  
- 多实例语义下，全局 registry/全局开关无法表达正确隔离；strict default 是宪章硬约束。  
- 只有把“覆写作用域”建模为一等实体，未来的 batch/lowPriority/调参等能力才有稳定落点。  
- 可解释：同一条链路必须能回答“为何生效/来源是什么”，否则覆写会变成不可控的隐性魔法。

**Alternatives considered**  
1) **全局覆写**：简单但语义错误（多实例冲突）且不可解释。  
2) **把覆写塞到 runtime 对象上**：会引入隐式共享与生命周期问题（难以清理/容易泄漏）。

## Decision 4: 诊断证据 contracts‑first，且默认 off 近零成本

**Decision**  
把“子系统覆写/策略选择/配置来源”的证据字段以 `contracts/*` 固化为单一事实源（不假设具体传输），并保证：
- diagnostics=off：不引入默认扫描/大对象构造；  
- diagnostics=on：提供 Slim、可序列化、可回放的证据（包含来源范围、关键参数摘要、影响面）。

**Rationale**  
- 宪章要求“诊断 Slim & 可序列化、关闭近零成本”。  
- contracts‑first 能让 Devtools/Sandbox/平台侧对齐同一口径，避免字段命名与语义漂移。

**Alternatives considered**  
1) **先写代码后补协议**：极易漂移（字段命名/可选性/序列化边界）。  
2) **默认开启重载荷诊断**：会把诊断本身变成性能问题，违背“默认零成本”原则。

## Decision 5: 性能基线复用 logix-perf-evidence，并为本特性补齐 before/after 口径

**Decision**  
性能测量优先复用 `logix-perf-evidence` 的 runner 与报告结构（统一入口：`pnpm perf collect` / `pnpm perf diff`）；本特性在工作区记录 before/after 并给出解释摘要，作为“重构不回退”的证据基线。

**Rationale**  
- 014 已经在仓库内形成相对统一的“浏览器侧边界/可复现报告”形态，复用可避免口径碎片化。  
- 本特性改动热路径较多，必须有同口径对比数据来确保不回退。

**Alternatives considered**  
1) **新建一套 runner**：维护成本高且容易与既有口径漂移。  
2) **只跑单测不做基线**：违背宪章“核心路径改动必须给出性能证据”硬约束。

## Decision 6: 内部 hooks 作为显式内部契约（RuntimeInternals Runtime Service），不再散落 magic 字段

**Decision**  
将当前挂在 runtime 对象上的 `__*` 协作协议（lifecycle 注册、事务执行助手、traits 注册、imports-scope 注入、patch/replay 记录、time-travel 等）收敛为明确的内部契约（Runtime Services），并提供仓库内统一访问入口；`__*` 仅作为过渡 shim（如确需维持既有调用点），禁止新增依赖散落字段的路径。

**Rationale**  
- `__*` 字段本质上是“隐式内部 API”，难以做 DI/mock、难以做多实例/多会话隔离，也很难审计生命周期与泄漏。  
- 把 hooks 变为 Runtime Service 后，子模块通过 Env 获取依赖，天然可替换/可测试/可解释；同时可以统一记录“来源证据”，支撑 devtools/平台解释链路。  
- 既有 `__importsScope` 已有明确的“最小 injector + 可回收”规范（008），本次应把同类内部协作协议一并正规化。

**Alternatives considered**  
1) **继续维持 `__*` 字段**：短期省事，但会把新架构的收益锁死在少数文件内，且平台试运行/Mock 的诉求无法落地。  
2) **直接删除所有 `__*` 字段**：会在迁移期造成过大扰动；本次采用“有界 shim + 统一入口”的渐进收敛方案。

## Decision 7: 平台侧“受控试运行”以 RunSession + EvidenceSink 建模（一次跑出证据/IR）

**Decision**  
引入“试运行会话（RunSession）”与“证据采集（EvidenceSink）”的内部模型：平台可在 Node/浏览器环境为单次试跑构造隔离 scope，按会话/实例注入 Mock/覆写，并在结束时导出可序列化证据与关键 IR 摘要（复用既有 EvidencePackage 形态与 ConvergeStaticIrExport）。

**Rationale**  
- 平台侧要做离线分析/对比/回放解释时，必须能把“本次生效的子系统绑定 + 关键 IR”稳定导出；如果依赖全局单例（例如 DevtoolsHub 的全局可变状态），并行试跑会互相污染。  
- 以 RunSession 为边界建模可把“证据/IR 导出”从 UI/devtools 需求里解耦出来，成为可复用的底座能力；Devtools 仅作为其中一种 sink/consumer。  
- 该建模与宪章一致：证据 Slim & 可序列化、diagnostics=off 近零成本；实例/事务/操作仍以确定性锚点为核心，runId 仅作为会话关联信息。

**Alternatives considered**  
1) **复用现有全局 DevtoolsHub 作为唯一出口**：实现快但会引入跨会话串扰与生命周期问题，不适合作为平台底座。  
2) **为平台单独做一套 IR 导出链路**：会制造并行真相源；本次要求复用统一证据协议与既有 IR 导出结构。

## Decision 8: 反射构建（Reflection）作为“获取高保真 Static IR”的首选路径之一

**Decision**  
将“受控构建态反射（Reflection）”纳入本次底座：平台可在受控 Build Env 中执行一次 Builder（可依赖配置/平台信息等），获取并导出静态 IR（traits 结构/依赖/资源元信息、模块拓扑摘要）。Reflection 与 Trial Run 共用“会话隔离”原则，避免全局注册表与隐式缓存污染结果。

**Rationale**  
- 静态 AST 解析能覆盖部分场景，但动态构建（feature flag 条件挂载）下最稳妥的真理来源是“运行 Builder 得到的对象”。  
- 当前 `Module.make` 已在构建期生成 `StateTraitProgram` 并挂载到 module 实例，这是天然的 Reflection 落点；需要补齐的是：标准 Build Env、约束与诊断、以及对全局注册表污染的治理。  
- Reflection 的产物（Static IR）是后续 Agentic Reversibility（phantom source / drift detection / semantic compression）的共同底座；先把可复现与可对比的 IR 抽出来，后续才有语义级可逆的地基。

**Alternatives considered**  
1) **只做 Trial Run，不做 Reflection**：能拿到动态 trace，但无法稳定覆盖“构建态拓扑变化”与 IR 提取，平台侧仍需另起一套机制。  
2) **只做 AST 解析**：实现复杂且难覆盖动态构建路径，且对 Effect 语义/闭包捕获的理解成本高。

## Decision 9: Exported Static IR 的 meta/注解必须可扩展（为 Phantom Source 留锚点）

**Decision**  
在导出的 Static IR 与 Evidence Summary 中，除最小拓扑/依赖外，必须携带可扩展的“语义锚点/注解”（trait meta 的 label/description/tags/docsUrl 等），并为未来 Phantom Source / 语义压缩保留扩展位（例如 `x-*` 形式的注解键）。所有 meta/注解必须 Slim、可序列化且可裁剪。

**Rationale**  
- `docs/specs/sdd-platform/workbench/13-agentic-reversibility.md` 的三种可逆模式都需要“可被机器读取的语义提示”，否则从 IR 反推只能得到无灵魂骨架。  
- 现有 IR 导出已包含 label/tags，但缺少 description/docsUrl 等更强语义信号；补齐后可作为 LLM 的最小上下文，减少幻觉与回填成本。  
- 把锚点放在 IR/证据侧比依赖代码注释更可控（可 schema 校验、可裁剪、可 diff）。

**Alternatives considered**  
1) **只导出结构，不携带语义锚点**：平台侧只能依赖 AST/注释解析，复杂度高且覆盖不全。  
2) **把所有语义都塞进事件流**：会放大诊断开销，且难以在 diagnostics=off 场景保持近零成本。

## Decision 10: RunSession 隔离必须覆盖 once 去重与序列号分配（禁止跨会话污染）

**Decision**  
将 RunSession 作为“可复现与可对比”的隔离边界：任何会影响试运行/反射导出内容的状态（once 去重、缓存命中、序列号分配器、全局 Set/Map）都必须被收敛到 RunSession/实例作用域（可通过 Effect Env 注入），禁止进程级全局状态导致跨会话污染。

**Rationale**  
- 平台侧“同进程内重复/并行试跑”是 020 的硬需求（NFR‑008）；进程级 once 去重会让后续 run 的证据缺失，造成不可解释差异。  
- 当前链路上已存在典型风险点：
  - `packages/logix-core/src/internal/state-trait/source.ts` 的 `depsMismatchEmitted/depsTraceSettled`（进程级 Set）；
  - `packages/logix-core/src/EffectOp.ts` 的 `nextOpSeqByInstance`（进程级 Map）；
  - `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 的 `nextEventSeqByInstance`（进程级 Map）。
- 若继续依赖“全局清理函数”做 reset，将无法支持并行会话；必须改为“每会话自带状态”。

**Alternatives considered**  
1) **要求平台每次试跑都新起进程**：可行但成本高，且不满足浏览器侧试跑需求。  
2) **保留全局状态，只约定 instanceId 必须唯一**：对 Drift Detection/对比场景不友好，且仍有隐式污染风险（尤其是 once 去重）。
