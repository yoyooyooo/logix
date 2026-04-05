# 01 · 架构边界（保留 vs 必改）

本文件是性能改造的第一裁决：哪些地方不要动，哪些地方必须动。

## 不建议改（继续保留）

1. 主链路拓扑保留：
`Module -> Runtime -> TickScheduler -> RuntimeStore -> React ExternalStore`
- 这条链路已经支持高性能 cutover，当前问题不是拓扑错误，而是个别热段开销过高。

2. 事务窗口语义保留：
`runWithStateTransaction` 内禁止 IO / await。
- 这是性能和可解释性共同前提，不能为“局部方便”破坏。

3. 稳定标识保留：
`instanceId/txnSeq/opSeq` 作为跨层锚点。
- 这是 perf 证据可比和诊断回放的基础。

4. dirty-set 的“根级主模型”保留：
- 当前 root-level dirtySet 仍是调度和解释的主语义。
- 后续可以扩展 index-level 证据，但不能破坏 root-level 契约。

## 必须改（继续压榨性能的主轴）

1. full 诊断事件构造方式必须改：
从“提交时重构造”改为“懒构造（消费时 materialize）”。

2. externalStore 写回策略必须改：
从“每 callback 一笔 txn”升级为“批处理 txn（至少支持 microtask 窗口）”。

3. list-scope 增量证据必须改：
`Ref.list(...)` 要默认能自动拿到 `changedIndices`，不再依赖调用方拆成 `Ref.item(...)`。

## 为什么是这三条

1. 当前 P1 阻塞是 `externalStore.ingest.tickNotify` 的 `full/off` 相对预算，而非绝对吞吐。
2. 这三条分别对应：
- full 附加成本来源（诊断构造/投影）
- per-txn 固定成本过高（写回粒度）
- 增量化适用面不够（仍依赖调用方姿势）

## 明确反模式（后续 agent 禁止）

1. 只做阈值放宽或测试参数微调，回避热路径改造。
2. 为了过 perf gate 去掉诊断锚点，导致不可解释。
3. 把语义问题推给业务层（要求业务必须手工拆 `Ref.item`）。

