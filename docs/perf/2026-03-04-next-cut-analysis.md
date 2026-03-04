# 2026-03-04 · 下一刀分析（不计代价 / 可推翻 API）

目标：继续打 `externalStore.ingest.tickNotify` 的 `full/off<=1.25`，并把 list-scope 增量化从“调用方配合”推进到“内核自动推导”。

## 状态更新（同日后续已完成）

- `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 已稳定通过到 `watchers=512`：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw52.diag-early-onCommit-trace-off.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw53.diag-early-onCommit-trace-off.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw54.diag-early-onCommit-trace-off.json`
- 对应切刀已落盘：
  - A-1：诊断 lazy materialization + trace gate
  - A-2：`traceMode=off` 时提前 `onCommit`（对齐 notify 启动时机）
- 后续切刀已推进：
  - B-1：externalStore 写回批处理（in-flight batching）：`docs/perf/2026-03-04-b1-externalStore-batched-writeback.md`
-  - C-1：`Ref.list(...)` 自动增量（txn evidence -> changedIndices）：`docs/perf/2026-03-04-c1-ref-list-auto-incremental.md`
- 下一刀建议：直接转入 D-1（DirtySet v2，统一索引证据协议）。

## 历史卡点（以 ULW31 快照为锚；现已解决）

- 证据：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw31.json`
- `externalStore.ingest.tickNotify`：
  - `p95<=3ms {off/full}`：通过到 `watchers=512`
  - `full/off<=1.25`：`firstFailLevel=256`（非单调，`512` 有时能过）
- 解释：这是“full 额外开销 + 抖动”问题，不是绝对吞吐问题。

## 关键事实（代码热路径）

1. `diagnostics=full` 时，`state:update` 在 `onCommit` 之前记录，`off` 则相反。  
   位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts:251`

2. `state:update` 在 full/light 都会 `Debug.record`；full 还会构造 dirty evidence、走 DevtoolsHub 投影。  
   位置：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts:266`

3. DevtoolsHub 在 `level !== off` 时对每个事件执行 `toRuntimeDebugEventRef` 投影与 ring 写入。  
   位置：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts:621`

4. `externalStore` 每次 source callback 都开一个独立 transaction（当前是“每次 set 一次提交”）。  
   位置：`packages/logix-core/src/internal/state-trait/external-store.ts:239`

## 值得做的方案（按收益/风险排序）

### A. Devtools Full 改为“懒重构造 + 轻事件常驻”（建议先做）

思路：

- full 模式下，把 `state:update` 的重 payload（完整 state / traitSummary / replayEvent）从“提交时构造”改为“消费时构造”。
- 提交时只保留 slim anchor：`moduleId/instanceId/txnSeq/txnId/opSeq/dirtySet摘要/hash`。
- Devtools 真正需要状态快照时，通过 runtimeStore / txnHistory / on-demand resolver 拉取。

为什么值得做：

- 直接命中 full 相对开销来源（事件投影与 JSON 化）。
- 对 `externalStore` 这类高频、小事务场景收益最大。
- 可横向收益所有 full 诊断路径，不只 externalStore。

风险：

- Devtools 时间旅行/回放链路需要补“按需还原”协议。
- 需要同步更新 `Debug`/`DevtoolsHub`/Devtools UI 的事件契约。

预期收益：

- `full/off` 相对预算显著收敛（优先目标：在 `watchers=512` 稳定过线）。

### B. externalStore 写回由“每 callback 一笔 txn”升级为“同 tick 批处理 txn”（建议第二刀）

思路：

- 对同 module 的 externalStore 写回引入短窗口聚合（微任务或 tick 窗口）。
- 同窗口内多个 field 更新合并为一次 transaction + 一次 notify。

为什么值得做：

- 把 per-txn 固定成本（full 下更高）按批次摊薄。
- 对 source 高频突发输入（websocket/stream）适配性更好。

风险（也是 API 语义变更点）：

- 从“同步即刻可见”变为“窗口内最终一致”，会改变少数用户依赖的同步时序。
- 需要新增 runtime 级策略开关（例如 `externalStore.writebackMode = sync | batched`），并将 `batched` 设为新默认。

预期收益：

- `externalStore.ingest.tickNotify` 的绝对值与相对值都下降，且抖动减少。

### C. list-scope 自动推导 changedIndices（不依赖调用方 Ref.item）

思路：

- 当前已支持从 `field` target 的 `valuePath` 推导增量 hint；
- 下一步在 transaction 层把 “patch path -> list index evidence” 固化为标准证据。
- validate 处理 `Ref.list(...)` 时直接读取 txn 内 index evidence，自动生成 `changedIndices`。

为什么值得做：

- 把增量能力从“调用方自觉拆 item validate”变成“内核默认能力”。
- 适用面最广（业务层几乎不用改写法）。

风险：

- 需要扩展 `StateTransaction` patch 语义与 dirty evidence schema。
- 需处理 list reorder / splice / trackBy 缺失时的降级策略一致性。

预期收益：

- form/list 类规则链路普遍降 O(n) 扫描概率，降低 p95 抖动。

### D. 统一“索引级脏证据”协议（DirtySet v2）

思路：

- 在现有 root-level dirtySet 之外，新增 list-index delta 通道（例如 `listPathId -> changedIndices bitset/range`）。
- converge/validate/readQuery/selectorGraph 统一消费该证据，彻底避免重复路径解析。

为什么值得做：

- 这是从局部补丁转为内核层“统一增量 IR”的关键一步。
- 能同时提速 converge + validate + selector invalidation。

风险：

- 破坏性重构，涉及多个子系统契约同步。

预期收益：

- 大规模表单/列表场景稳定收益最高，且长期维护成本下降。

## 建议执行顺序（最现实的“激进路线”）

1. 先做 A（Devtools full 懒重构造）。  
   原因：最直接打中 `full/off`，且不先改变业务语义。

2. 再做 B（externalStore 批处理写回）。  
   原因：吞吐与抖动双收益，能把 externalStore 这条线打穿。

3. 并行推进 C（Ref.list 自动增量）。  
   原因：这是 form/list 适用面最广的一刀，能减少调用方姿势依赖。

4. 最后上 D（DirtySet v2 统一协议）。  
   原因：工程量最大，但它是未来 perf 上限的基础设施。

## API 可推翻建议（forward-only）

- `RuntimeOptions.stateTransaction` 扩展：
  - `diagnosticsMaterialization: 'eager' | 'lazy'`（建议新默认 `lazy`）
- `StateTrait.externalStore` 扩展：
  - `writebackMode: 'sync' | 'batched'`
  - `writebackWindow: 'microtask' | { budgetMs: number }`
- `ScopedValidate` 目标语义：
  - `Ref.list(...)` 默认自动吃 txn index evidence，不再要求业务侧显式拆 `Ref.item(...)` 才有增量。

## 验收门（不降级）

- 性能门：
  - `externalStore.ingest.tickNotify`：`full/off<=1.25` 至少稳定过 `watchers=512`（3~5 轮 quick 中位通过）
- 语义门：
  - 事务窗口仍禁止 IO；
  - 稳定标识（instanceId/txnSeq/opSeq）不漂移；
  - 诊断事件保持 slim + 可序列化；
  - list reorder + 无 trackBy 场景仍正确（允许降级，但不可错）。
