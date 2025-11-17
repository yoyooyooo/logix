---
description: "Research notes and decisions for 016-serializable-diagnostics-and-identity"
---

# Research: 016 可序列化诊断与稳定身份（Observability Hardening）

> 目标：为 005/011/013 的横切硬约束提供统一“落地口径”，先把 `@logix/core` 的可序列化与稳定锚点做稳；Devtools 交付（组件/015/Chrome 插件）延后。

## Decision 1: 导出边界落点（Host 内原始事件 vs 可导出事件）

**Decision**: 把“导出/跨宿主 JSON 硬门”作为 `RuntimeDebugEventRef` 的强约束：

- `Debug.Event` 允许宿主内携带 `unknown`（例如 state/cause/闭包），但 **不得进入可导出的 ring buffer / evidence package**。
- `DevtoolsHub` 的 ring buffer **只存** 可导出的 `RuntimeDebugEventRef`（其 `meta` 必须是 `JsonValue`）。
- 边界实现集中在：
  - `packages/logix-core/src/internal/runtime/core/DebugSink.ts`（`toRuntimeDebugEventRef` 负责投影 + 降级标记）
  - `packages/logix-core/src/internal/observability/jsonValue.ts`（提供可复用的 `JsonValue` 投影/裁剪）

**Rationale**: 证据包与跨宿主链路必须满足 `JSON.stringify`，否则会在导入/聚合/协作中崩溃；把边界收口在单点，能避免多处“侥幸 stringify”。

**Alternatives considered**:

- A) DevtoolsHub 继续存 `Debug.Event`，导出时再降级：实现简单，但导出时才暴雷（不可预测），且 Hub snapshot 无法保证可序列化。
- B) 全面禁止 `Debug.Event` 的 `unknown` 字段：会把宿主内调试能力也一刀切掉，成本过高。

## Decision 2: `SerializableErrorSummary` 口径（Cause/Error/unknown）

**Decision**: 复用 011 的 schema（`SerializableErrorSummary = { name?, message, code?, hint? }`），并新增一个构造器：

- 输入：`Cause` / `Error` / `unknown`
- 输出：`{ errorSummary, downgrade? }`
  - `errorSummary.message` 必填（无法提取时回退 `"Unknown error"` 或 `String(x)`）
  - `downgrade.reason` ∈ `non_serializable | oversized | unknown`
- 禁止把原始 `cause` 写入可导出 `meta`；如需可读信息，使用 **裁剪后的字符串摘要**（例如 `causePretty`/`message`）并受体积预算约束。

**Rationale**: `Cause.pretty` 与原始错误对象常含循环引用/闭包/巨量堆栈；证据包需要“可解释但可控”的摘要，而非全量对象图。

**Alternatives considered**:

- A) 导出完整 `causePretty`：可能超 64KB，且包含敏感信息；不满足 slim/budget。
- B) 只导出 `"unknown"`：可序列化但不可解释，无法满足诊断产品目标。

## Decision 3: 稳定实例锚点（`instanceId` 单一事实源）

**Decision**: `instanceId` 是唯一实例锚点；不再存在“第二锚点字段”，且不提供兼容读取。

- `ModuleRuntime` 必须支持显式注入 `instanceId`（来自上层 ModuleCache/React key/显式参数）。
- 若调用方未提供 `instanceId`：使用 **单调序号** 作为兜底（同一进程内稳定，不使用随机/时间作为默认唯一性来源）。
- 所有可导出事件、Hub 聚合 key、错误上报 context 使用 `moduleId + instanceId (+ runtimeLabel)`。

**Rationale**: 双锚点会制造“双真相源”，导致聚合/回放不可证明；同时随机/时间默认值会破坏重放与对比。

**Alternatives considered**:

- A) 继续保留“双锚点”：会制造双真相源，与 016/009/011/005 的 SSoT 冲突。
- B) `instanceId = hash(state)`：代价高且不稳定（状态变化会漂移锚点）。

## Decision 4: 稳定序号（txn/event）与 ID 派生策略

**Decision**:

- 引入 instance-local 的单调序号（至少包含 `txnSeq` 与 `eventSeq`），并以此确定性派生：
  - `txnId = ${instanceId}::t${txnSeq}`
  - `eventId = ${instanceId}::e${eventSeq}`
- 禁止默认用 `Date.now()/Math.random()` 作为 `txnId/eventId/linkId` 的唯一性来源（可作为辅助信息，但不作为主锚点）。

**Rationale**: 009 已要求“可比较、可重建”的标识；用 seq 派生能保证稳定顺序与可回放。

**Alternatives considered**:

- A) 继续使用 now+random：实现简单，但无法回放对比，且跨宿主对齐困难。

## Decision 5: 诊断分档与预算（off/light/full）

**Decision**:

- 分档语义以 `off|light|full` 为准：
  - `off`：不产生可导出事件；不做递归 `JsonValue` 投影扫描；不引入新热路径分配/遍历
  - `light`：只记录 slim 元信息（不包含完整 state/cause 对象图）；允许省略高成本字段
  - `full`：允许更丰富 meta，但必须经过 `JsonValue` 投影/裁剪并遵守预算
- 预算默认：
  - 单条事件 `meta` JSON 字符串估算 ≤ 4KB
  - 单字符串字段 ≤ 256 chars（超限截断并标记 `oversized`）
  - 对象深度/宽度限制（避免 O(n) 扫描/爆炸）

**Rationale**: 诊断必须是产品能力，但默认不能拖慢核心路径；启用时也必须可预估与可回归。

**Alternatives considered**:

- A) 永远 full：开发体验好但生产不可控。
- B) 永远 light：生产可控但调试体验差，且很难解释复杂问题。

## Deferred（明确不在本阶段交付）

- Devtools 组件/015 面板/Chrome 插件等 UI 交付面：只在 core hardening 稳定后再推进（见 016 `tasks.md` 的 Deferred Phase）。

## Decision 6: 不提供 legacy 兼容读取

**Decision**: 本仓当前不需要历史兼容：任何缺失 `instanceId` 的旧 payload 视为不可导入。

**Rationale**: 直接切断历史包袱可以避免双真相源回流，且能让证据链/跨宿主对齐保持单一锚点。

**Alternatives considered**:

- A) 兼容读取旧 payload：需要维护额外映射与 UI 标注，且会把“旧锚点”继续引入心智模型。
- B) 双锚点并存：会制造双真相源，与宪法/009 冲突。

## Decision 7: 性能基线与回归门槛（必须可复现）

**Decision**:

- 性能证据入口统一写在 `specs/016-serializable-diagnostics-and-identity/perf.md`：
  - 固化可复现测量方式（对齐 009：30 次、丢弃前 5 次 warmup、报告 p50/p95）
  - 固化门槛：off 档位默认门槛 p95 ≤ +5%；light/full 必须可解释且预算可验证
  - 记录每个矩阵点的基线结果与回归对比（作为合并 gate）

**Rationale**: 016 触及 Debug/Hub/事务标识等核心路径；必须把“如何测 + 怎么算过线”提前固化，避免实现后无法评审或无法复现回归。

**Alternatives considered**:

- A) 只写目标不写测量方式：无法复现，也无法证明 off 近零成本。
- B) 只在 PR 里贴一次性 profile：不可复现且容易漂移，无法作为长期回归防线。
