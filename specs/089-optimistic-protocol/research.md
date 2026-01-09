# Research: 089 Optimistic Protocol

## Decision: optimistic 必须绑定到 ActionRun（088）

**Chosen**: optimistic 更新不作为“自由写 state”能力暴露；必须附着在一次 ActionRun 上，继承其取消/覆盖语义与稳定标识传播。

**Rationale**:

- optimistic 的难点是“撤销与解释”，不是“先改一下”；绑定 ActionRun 才能把因果链闭合（触发源→pending→optimistic→IO→confirm/rollback）。

## Decision: 回滚语义优先于“更聪明的合并算法”

**Chosen**: 先把协议做对：有限步可回滚、token 有界、事件可解释；合并/冲突裁决先做保守默认（coalesce/override），复杂算法（OT/CRDT）不在本 spec 范围。

## Decision: optimisticId 从 action `linkId` 派生（稳定且防乱序）

**Chosen**: optimisticId 必须从 ActionRun 的 `linkId` + 单调序号派生（例如 `<linkId>::p<seq>`），confirm/rollback 精确匹配 optimisticId，避免乱序返回误判。

## Decision: 回滚顺序强制 LIFO，变更携带可回滚 inverse

**Chosen**: optimistic token 按栈语义管理（LIFO 回滚）；每个 token 必须携带可回滚的 inverse 记录（before 值或反向 patch），保证 rollback 在有限步内可完成。

**Rationale**:

- 非 LIFO 的选择性回滚会引入不可解释/不可实现的状态组合，且会放大性能与诊断成本；先用可证明的栈语义把闭环跑通。
