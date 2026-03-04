# 03 · 下一阶段定向大改（A/B/C/D）

本文件是执行裁决，不是讨论稿。默认目标：不计代价，优先性能上限与稳定性。

## 状态（作为任务清单维护）

说明：每一刀必须独立提交；做完一刀就把对应条目勾上，并在 `docs/perf/05-forward-only-vnext-plan.md` 同步状态。

- [x] A-1：Devtools full 懒构造（lazy materialization）+ Trace gate（`traceMode`）。
- [x] A-2：externalStore full/off 方差收敛（`traceMode=off` 时提前 `onCommit`，避免 full 延迟 notify）。
- [ ] B-1：externalStore 批处理写回（窗口合并 txn）。
- [ ] C-1：`Ref.list(...)` 自动增量（txn evidence -> `changedIndices`）。
- [ ] D-1：DirtySet v2（统一索引证据协议）。

## A 刀（优先级 P0）：full 诊断懒构造

目标：
- 把 full 诊断从“提交时重构造”改成“消费时构造”。

核心做法：
1. `state:update` 提交路径只保留 slim anchor：
- `moduleId/instanceId/txnSeq/txnId/opSeq/dirtySet摘要/hash`
2. 重 payload（state/traitSummary/replay）改为按需 materialize。
3. DevtoolsHub 只存可序列化轻对象和定位锚点。

收益预期：
- 直接降低 `externalStore.ingest.tickNotify` 的 `full/off`。

风险：
- Devtools 回放/时间旅行协议需要同步调整。

## B 刀（优先级 P0）：externalStore 批处理写回

目标：
- 从“每 callback 一笔 txn”改为“同窗口批处理 txn”。

核心做法：
1. 对同 module 的 externalStore 更新做 microtask/tick 合并。
2. 合并窗口内多次写回为一次 transaction + 一次 notify。
3. 保留 `sync` 兼容模式，但默认切到 `batched`。

收益预期：
- 降低 per-txn 固定成本，显著减少高频输入下抖动。

风险：
- 写回可见时序从“同步即刻”变成“窗口最终一致”。

## C 刀（优先级 P1）：Ref.list 自动增量

目标：
- `Ref.list(...)` 默认吃到 `changedIndices`，不依赖调用方拆 `Ref.item(...)`。

核心做法：
1. 在 transaction 里沉淀 index-level hint（来自 patch path/valuePath）。
2. validate list-scope 默认读取该 hint 走增量分支。
3. 无法推导时显式降级 full（并产出可解释 degrade reason）。

收益预期：
- list/form 场景普遍减少 O(n) 扫描，降低 p95。

风险：
- patch 语义与 validate 证据结构要扩展。

## D 刀（优先级 P1/P2）：DirtySet v2（统一索引证据协议）

目标：
- 把 index-level 脏证据升级为内核统一协议，供 converge/validate/selector 共用。

核心做法：
1. 在 root-level dirtySet 之外增加 list-index delta 通道。
2. 统一消费接口，去掉各子系统重复路径解析。

收益预期：
- 最大化长期上限，减少重复计算与多处漂移。

风险：
- 破坏性重构面较广，需要分阶段切换。

## 推荐执行顺序

1. A 刀
2. B 刀
3. C 刀
4. D 刀

顺序理由：
- A/B 直击当前 P1 阻塞；
- C 提升适用面；
- D 作为统一内核基础设施收口。

## API forward-only 演进建议

1. `RuntimeOptions.stateTransaction`
- 新增：`diagnosticsMaterialization: 'eager' | 'lazy'`
- 建议默认：`lazy`

2. `StateTrait.externalStore`
- 新增：`writebackMode: 'sync' | 'batched'`
- 新增：`writebackWindow: 'microtask' | { budgetMs: number }`
- 建议默认：`batched + microtask`

3. validate 调用语义
- `Ref.list(...)` 默认自动增量化（由 txn evidence 驱动）
