# Research: Devtools Session‑First（关键裁决与证据）

**Feature**: `specs/038-devtools-session-ui/spec.md`  
**Plan**: `specs/038-devtools-session-ui/plan.md`  
**Created**: 2025-12-27

本文件用于把 07/08 的愿景裁决落到“可实现、可回归、可解释”的设计产物上（Decision/Rationale/Alternatives），并将关键口径固化到 `contracts/*` 与事件/锚点协议，避免 UI 与 Runtime 协议漂移。

## Decision 1: 会话不是“时间窗”，而是“因果作用域”；必须可退化且可解释

**Decision**  
默认会话聚合以因果锚点优先级驱动：

1. **Primary**：`linkId`（同一条“业务链路”共享的 trace id）作为 `sessionId`；
2. **Secondary**：当事件缺失 `linkId` 时，退化用 `txnId` 作为 `sessionId`（只保证事务内关联）；
3. **Fallback**：当事件既缺 `linkId` 也缺 `txnId` 时，退化为确定性的时间窗/事件窗分组，并输出 `degradedReason`。

聚合结果必须输出：

- `confidence`：`high | medium | low`
- `degradedReason?`：可枚举原因（例如 `missing_linkId`、`missing_txnId`、`window_fallback`、`cross_instance_ambiguous`）

**Rationale**

- 纯时间窗聚合无法覆盖交错/并发/异步回写等真实场景，且会产生“错聚合但用户不知道”的误导。
- `linkId` 在 Runtime 已具备“跨 txn/跨模块共享”的语义，ROI 最高；缺失时才退化到更弱锚点。
- `confidence/degradedReason` 是“可信度 UI”的基础：宁可承认不确定，也不制造假确定。

**Alternatives considered**

1. **固定窗口（windowMs）作为默认**：实现简单但容易把真实链路切碎或合并错误，价值与可信度都低。
2. **要求所有入口必须显式发 start/end 事件**：能强一致，但需要业务/适配层全面改造，成本过高；更适合作为后续增强（可选 protocol）。

## Decision 2: UI 不做 Graph；底层允许 DAG，但主视图采用“脉冲 + 泳道”

**Decision**  
内部派生模型允许用“因果图（DAG）”表达关联（交错/扇入扇出允许存在），但 **本期 UI 不做 Graph UI**，主视图以 Pulse + Swimlanes 给结构化视角；树状/关联引用仅作为导航增强：

- 每个节点选择一个 `primaryParentId` 构成主树；
- 其余关联边以 “Related / 关联链路” 的形式展示（不强行塞进树导致误导）。

**Rationale**

- 真实运行时链路存在并发与跨模块协作，不保证可压成严格树。
- “树 + 关联边”能在可读性与真实度之间取得平衡：树用于导航，关联边用于保真。

**Alternatives considered**

1. **强制树（丢弃非树边）**：会隐藏关键因果链，误导排障。
2. **全图可视化（Graph UI）作为默认**：表达力强但信息密度过高；更关键的是当前事件骨架不足以稳定重建因果边（见 Decision 3），容易变成“卡顿玩具”。

## Decision 3: 为了把“因果关联做到极致”，锚点必须成为 RuntimeDebugEventRef 的一等字段（最小扩展）

**Decision**  
将 `linkId`（以及必要时的 `opSeq`）作为 `RuntimeDebugEventRef` 的可选一等字段，避免 UI 侧依赖 meta 解析与启发式对齐；并保证至少在以下事件种类上可用：

- `trace:effectop`（跨模块/跨 txn 链路锚点来源；Runtime 主动注入/传播）
- `trace:react-render` / `trace:react-selector`（影响面统计与归因）

若某条事件无法提供 `linkId`，必须显式留空并让聚合退化（对应 Decision 1）。

**Rationale**

- 当前 `linkId` 主要存在于 EffectOp meta；纯 reducer/纯同步链路可能没有 EffectOp，UI 无法稳定归因。
- `RuntimeDebugEventRef` 是 Devtools/Playground/EvidencePackage 的统一协议；把锚点做成一等字段能减少消费方分叉与漂移。
- 字段是小而确定的（string/number），符合“Slim + 可序列化”约束，且可被测试验证确定性（`SC-006`）。

**Code Evidence（对齐现状）**

- `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 已将 `linkId?: string` 提拔为 `RuntimeDebugEventRef` 的一等字段，并在 `trace:effectop` 上注入；`toRuntimeDebugEventRef` 同时支持对 `trace:*` 从 `data.meta.linkId` 兜底提取（避免消费侧深挖 meta）。
- `packages/logix-devtools-react/src/internal/ui/overview/OverviewStrip.tsx` 已优先使用 `ref.linkId` 归并 txnKey（仍保留必要兜底以覆盖旧事件或缺失字段的场景），消费侧不再需要依赖 `ref.meta.meta.linkId` 作为主路径。

**Alternatives considered**

1. **只在 meta 里塞 linkId**：light/full 档位差异与投影裁剪会增加漂移风险。
2. **UI 侧用 txnId ↔ linkId 映射推断**：存在无 EffectOp 的事务时会断链；同时推断规则更难解释与回归。

## Decision 4: Advisor 采用“纯派生规则 + 证据引用”的插件化结构

**Decision**  
Advisor Finding 统一为可序列化数据结构（见 `contracts/schemas/*`），由一组纯规则生成：

- 输入：会话范围内的事件切片 + 指标摘要
- 输出：Finding（结论/证据引用/建议/置信度）

优先复用现有 converge 审计能力，并将 “waterfall / degraded / unknown write” 等高价值模式作为首批规则覆盖。

**Rationale**

- “处方”必须可解释：每个结论都能回链到具体事件/字段/阈值命中。
- 纯派生规则易测试、易回放、无运行时开销；避免把诊断逻辑塞进 runtime 热路径。

**Alternatives considered**

1. **把 Advisor 放进 runtime 自动输出**：会增加热路径负担与协议耦合，且难以快速迭代 UI。

## Decision 5: 性能策略以“增量派生 + 结构共享”作为默认路径

**Decision**  
Devtools 派生层（会话/树/指标/Advisor）必须以 `snapshotToken` 为更新边界：

- `token` 未变：派生结果不得变化（避免 tearing）；
- `token` 变：优先按新增事件增量更新索引与会话，而不是全量重算。

**Rationale**

- DevtoolsHub snapshot 直接引用 ring buffer（避免拷贝）；消费侧应匹配这一语义，避免 O(n) 级的重复构造与 GC 抖动。
- 交互冻结的主要风险在“每次 token 更新都重建全量视图”。

**Alternatives considered**

1. **每次 token 更新全量 compute**：实现简单但会很快触达 `SC-003` 的卡顿上限。

## Decision 6: 最佳交付路线是 “Swimlanes（按 txn）+ Pulse（脉冲）+ Hero Advisor”

**Decision**  
在 Runtime 协议补齐（Decision 3）之前，UI 不尝试 Graph/DAG 可视化；改为利用现有可得数据，交付“上帝视角但不撒谎”的务实界面：

- 左侧会话列表升级为 Card，并在每条会话底部绘制 MicroSparkline（Txn 密度 + Render 密度）。
- 右侧主时间轴采用 `groupBy(txnId)` 的 Swimlanes：同 txn 的事件包裹在同一泳道中；仅 state:update 的 txn 默认折叠；含 converge 证据的泳道高亮。
- danger 会话在工作台顶部展示 Hero Banner（结论先行），点击直接 pin/highlight 对应泳道范围。

**Rationale**

- 现有代码已经具备“脉冲”所需的 bucket 聚合能力（OverviewStrip），应复用而不是只放在顶部 strip。
- 泳道能在不依赖因果边的情况下显著降噪，并天然与 txn 语义对齐（开发者心智更稳）。
- Hero Advisor 把“处方”提到第一屏，避免诊断被 JSON/Tab 埋没，符合 07 的 Active Prescription。

**Alternatives considered**

1. **先做 Graph UI 再补协议**：高风险、容易卡顿、且难以解释；违背“数据骨架先行”的工程顺序。
