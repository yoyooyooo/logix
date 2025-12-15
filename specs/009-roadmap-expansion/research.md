# Research: 009 事务 Patch/Dirty-set 一等公民

> 本文用于把 `docs/reviews/03-transactions-and-traits.md`、`docs/reviews/04-diagnostics-and-devtools.md`、`docs/reviews/07-platform-full-duplex-and-alignment-lab.md` 与 `docs/reviews/99-roadmap-and-breaking-changes.md` 的结论，收敛为可落地的裁决与取舍。

## Decision 1：Dirty-set 永远是调度输入；Patch 是可选的证据载荷

**Decision**：

- 每次事务必须产出 `dirty-set`，且它是增量调度的硬输入（不依赖诊断开关）。
- `patch` 作为“证据载荷”，在 `full` 诊断级别下记录更完整的 `from/to/reason/stepId/...`；在 `light` 下可只保留 `dirty-set` 与必要摘要（例如 `patchCount`）。

**Rationale**：

- 只有 `dirty-set` 常驻，才能保证“增量调度的收益”不被诊断开关反向影响。
- `patch` 载荷若常驻会引入分配与保留引用风险（尤其是错误地携带闭包/不可序列化对象时），必须可裁剪。

**Alternatives considered**：

- 仅靠 `patch` 推导 dirty-set：拒绝（会诱导在热路径做全量 diff 或过度分配）。
- `dirty-set` 只在 dirty 模式启用：拒绝（会导致模式切换引入不可预测的性能差异）。

## Decision 2：拒绝 `path="*"`；未知写入必须显式标记为 `dirtyAll`

**Decision**：

- `*` 作为“未知写入”的字符串哨兵不进入 `dirty-set`；统一用结构化字段 `dirtyAll: true` 表达。
- 任何无法产出精确 dirty-set 的写入必须显式降级为全量收敛，并附带 `degradeReason`（可解释来源）。

**Rationale**：

- `*` 会污染路径语义与合并规则，导致平台无法做冲突检测/回写，也让运行时难以区分“真正未知”与“偷懒”。
- 显式 `dirtyAll` 能让“降级阀门”成为可诊断、可统计、可优化的对象。

**Alternatives considered**：

- 允许 `*` 但只用于内部：拒绝（最终仍会溢出到 Devtools/Sandbox 协议，形成并行真相源）。

## Decision 3：路径归一化必须稳定（列表/索引不进入 dirty-root）

**Decision**：

- dirty-set 内部采用“根级/字段级路径”而非具体索引路径；列表内的 `items.3.name` 必须归一化为 `items`（或 `items.name` 的等价根口径，取决于依赖声明口径）。
- 归一化规则必须是纯函数、可复用、可被平台/Devtools/Sandbox 复刻（避免“核心一套、平台一套”）。

**Rationale**：

- 列表索引天然不稳定，不能作为依赖收敛/冲突合并的基础键。
- 归一化稳定后，trait 的 deps 与 selector deps 才能用同一套 overlap 规则计算影响范围。

**Alternatives considered**：

- 保留索引路径并在 consumers 侧做裁剪：拒绝（会导致 consumers 负担指数级上升且不可对齐）。

## Decision 4：增量调度必须避免“过滤本身负优化”

**Decision**：

- 必须提供降级阀门：当 dirty-set 过粗/过多时，跳过过滤逻辑直接走全量收敛。
- 依赖索引与拓扑顺序属于 build 阶段产物：预编译 `depRoot → affectedSteps`（或等价结构），避免每笔事务对每个 step 做 overlaps 扫描。

**Rationale**：

- “增量调度”常见负优化来源是：每个 step 都扫描 dirtyRoots 与 deps 的字符串集合；小事务反而更慢。
- 把重活下沉到 build 阶段可以在不增加运行期心智的前提下，把开销压到最低。

**Alternatives considered**：

- 运行时按需计算索引并缓存：谨慎（可能引入难以控制的内存增长与失效策略）；优先在 build 固化。

## Decision 5：统一最小 IR 必须分层（Static IR / Dynamic Trace）

**Decision**：

- Static IR 承载“依赖/写入/策略/冲突裁决”，必须可合并与可冲突检测。
- Dynamic Trace 承载“事务/步骤/事件时间线”，必须用稳定标识把因果链串起来，并保持 Slim & 可序列化。

**Rationale**：

- 平台 Full-Duplex 需要 Code↔IR↔Runtime 的闭环：Static IR 用于解析/回写与冲突检测；Dynamic Trace 用于解释与回放。
- 把两者混在一起会导致：静态合并不可控、动态事件臃肿且不可裁剪。

**Alternatives considered**：

- 只做 Dynamic Trace：拒绝（平台无法做安全回写与冲突检测）。
- 只做 Static IR：拒绝（Devtools 只能“猜发生了什么”，无法解释 why）。

## Decision 6：稳定标识（Identity Model）以“可重建”为目标

**Decision**：

- `instanceId` 必须来自外部注入（例如 React key / sandbox runId / host instance key），不得默认随机。
- `txnId` 必须可由 `(instanceId, txnSeq)` 确定重建；时间戳只作为 `startedAt`。
- `opId/stepId/nodeId` 必须可映射到 Static IR 节点（稳定、可序列化）。

**Rationale**：

- 随机 id 会破坏对齐、回放与 diff，导致平台与 Devtools 无法稳定比对“同一条链路”的多次运行。

**Alternatives considered**：

- 保留随机 id 但另加 debugKey：拒绝（会形成双重键并长期漂移）。

