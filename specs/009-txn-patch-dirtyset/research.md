# Research: 009 事务 IR + Patch/Dirty-set 一等公民

> 本文用于把 `docs/reviews/03-transactions-and-traits.md`、`docs/reviews/04-diagnostics-and-devtools.md`、`docs/reviews/07-platform-full-duplex-and-alignment-lab.md` 与 `docs/reviews/99-roadmap-and-breaking-changes.md` 的结论，收敛为可落地的裁决与取舍。

## Decision 1：Dirty-set 永远是调度输入；Patch 是可选的证据载荷

**Decision**：

- 每次事务必须产出 `dirty-set`，且它是增量调度的硬输入（不依赖诊断开关）。
- `patch` 作为“证据载荷”，在 `full` 诊断级别下记录更完整的 `from/to/reason/stepId/opSeq/...`；在 `light` 下可只保留 `dirty-set` 与必要摘要（例如 `patchCount`）；在 `off` 下不记录 trace/patch（但仍必须产出 `dirty-set` 以驱动增量调度）。

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

- dirty-set 内部采用“根级/字段级路径”而非具体索引路径；列表内的 `items.3.name`/`items[].name` 必须归一化为 `items.name`；插入/删除/重排等结构变更归一化为 `items` 根。
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
- `opId` 必须可由 `(txnId, opSeq)` 确定重建；`stepId/nodeId` 必须可映射到 Static IR 节点（稳定、可序列化）。

**Rationale**：

- 随机 id 会破坏对齐、回放与 diff，导致平台与 Devtools 无法稳定比对“同一条链路”的多次运行。

**Alternatives considered**：

- 保留随机 id 但另加 debugKey：拒绝（会形成双重键并长期漂移）。

## Decision 7: 列表性能悖论（Why Normalized Path?）

**Context**: 用户常问“为什么不用稳定的 `rowId` 做精确 dirty-set？难道改一个通过 rowId 索引的字段，要重跑所有行吗？”

**Decision**:

- **Dirty-Set (调度层)**：必须归一化为 `items.name`。因为大多数逻辑（聚合、排序、唯一性校验）本质上依赖“整个列表的 name 集合”，而非特定 rowId。
- **Scope Filtering (执行层)**：对于“只关心当前行”的逻辑（如 Feature 010 Row-Scoped Rule），Runtime 必须结合 `Patch.affectedKeys` / `Patch.affectedIndices` 进行**二级过滤**（009 先定义字段与可序列化契约；row-scope 执行模型由 Spec 010 负责端到端验收）。
  - 调度器看到 `items.name` 变了 → 唤醒所有监听 `items.name` 的规则。
  - 规则执行前检查：我是 Row-Scoped 吗？如果是，变更的 RowId 在我的 Scope 里吗？-不在 → 跳过执行 (Fast Skip)。-在 → 执行。
  - 若本次 patch 缺少 `affectedKeys/affectedIndices`，Row-Scoped 逻辑只能退化为 coarse 执行（无法 Fast Skip），但语义必须保持正确（只是不够快）。

**Rationale**:

- 如果 dirty-set 包含 millions of rowIds，调度器匹配成本会爆炸。
- “Coarse Trigger (Dirty-set) + Fine Filter (Scope)” 是处理集合依赖的标准解法。

## Decision 8：Transaction Queueing Semantics（单实例内事务排队语义）

**Decision**：

- 同一 `instanceId` 内事务必须 **串行**：任意时刻最多存在一个“活动事务窗口”（同步窗口）。
- 在事务窗口内再次触发 `dispatch`（包括嵌套调用、React `flushSync` 等同步重入）不得开启新事务；必须 **合并到当前事务** 并继续递增同一事务的 `opSeq`（保证顺序确定性与原子性）。
- 若在 **commit 收尾阶段**（例如正在生成 meta/trace、执行 post-commit hooks）又触发新的 `dispatch`，必须 **排队到下一笔事务**（`txnSeq+1`），以 FIFO 顺序执行；不得采用“覆盖式开启新事务”导致丢失/顺序不确定。

**Rationale**：

- “覆盖式新事务”会破坏确定性与可解释链路（丢失 `txnSeq/opSeq` 的单调性），并在嵌套 dispatch 场景产生顺序相关的幽灵 bug。
- 串行 + 重入合并能让事务保持最小心智：同步窗口内永远只有一个 txn；所有写入在同一条 `opSeq` 序列上可重放/可比对。

**Alternatives considered**：

- 允许并发事务：拒绝（同步事务窗口禁止 IO 的前提下没有收益，且会引入大量竞态语义与不可解释状态）。
- 允许嵌套事务栈（txn stack）：谨慎（会引入“内层 commit 何时可见/是否可回滚”等复杂语义）；本特性先以“重入合并 + commit 阶段排队”作为最小可落地裁决。

---

## Appendix A：Review 2025-12-16 可采纳项（差距清单 → 任务落点）

> 目的：把“规范 ↔ 现状”差距固化为可执行的修复面，避免在实现阶段反复翻 review 文本。

### A1. 去随机化（NFR-003 / FR-006）

已完成去随机化/去时间化（NFR-003）：所有默认唯一标识均为确定性派生或单调序号（避免回放/对比漂移）。

- `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`：`txnSeq/opSeq` 单调；`txnId/opId` 由 `instanceId` + 序号确定性派生（并对 `TxnOrigin.details`/snapshots 做序列化收敛）。
- `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.ts`：`instanceId` 外部注入（提供进程内单调 fallback）；`linkId` 基于 `instanceId` + 单调序号派生。
- `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/EffectOp.ts`：`effectop.id` 默认使用进程内单调序号（如需跨实例对齐由 Runtime/meta 提供锚点）。
- `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/rowid.ts`：RowId 使用 `listPath` 前缀 + 单调序号（仍仅作为内部映射；如未来外泄到 IR/协议需再次评审预算与稳定性）。

对应任务：T006/T011/T012（RowId 是否需要去随机化视其是否进入导出链路，默认先限制“不外泄”）。

### A2. 路径与降级表达（FR-001 / Decision 2）

已修复：路径统一使用 FieldPath 段数组作为 canonical；拒绝 `path="*"` 哨兵语义（未知写入以 `dirtyAll: true` 表达降级）。

- `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/converge.ts`：dirty roots 归一化与 `*` 处理
- `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`：patch/path 形态需要迁移到 FieldPath 段数组

对应任务：T004/T005/T016/T017。

### A3. 诊断分档 off/light/sampled/full（NFR-005）

已实现 `off`/`light`/`full` 分档：`off` 不写入诊断缓冲区；`light` 仅 txn 摘要；`full` 才采集 `trace:effectop` SlimOp 与完整 patch 序列。

对应任务：T007（并要求 `light` 不产生 `trace:effectop`，`full` 才采集 SlimOp）。

### A4. 事务排队语义（FR-011 / Decision 8）

已落实事务队列与重入合并（ModuleRuntime `txnQueue` + `inTxnQueueWorker`）。

对应任务：T010。

### A5. Patch/Trace 字段缺口（IR 对齐）

已补齐 patch/trace 关键字段（`opSeq`、`affectedKeys/affectedIndices`、`nodeId`、`eventSeq/eventId`），并新增 Static IR / Dynamic Trace 的导出能力以对齐 schema。

对应任务：T009/T019（以及后续按 US1/US2/US3 渐进补齐）。
