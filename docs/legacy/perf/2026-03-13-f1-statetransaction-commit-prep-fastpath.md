# 2026-03-13 · F-1：StateTransaction commit prep fastpath

## 目标问题

`externalStore.ingest.tickNotify` 的 node-only 归因已经把主税点稳定压到
`store.commitTick(...)` 之前的提交准备段。

在切刀前，同口径样本显示：

- `phaseCommitMs≈5.45ms`
- `phasePreStoreCommitMs≈5.31ms`
- `phaseStoreCommitInnerMs≈0.066ms`
- `phasePostStoreCommitMs≈0.082ms`
- `topic bump + snapshot flatten + callback fanout ≈ 0.0038ms`

这说明 `commitTick` 内部不是主问题，主税点主要落在 `StateTransaction.buildCommittedTransaction(...)`
一侧的对象构造与复制。

## 切口

本刀只动 `StateTransaction.buildCommittedTransaction(...)` 的纯分配成本：

- `patches.slice()`
- `Array.from(dirtyPathIds)`

具体做法：

- `patches` 不再每次提交都无条件 `slice()`，改为直接把当前 patch array handoff 给 committed transaction，再把 scratch 切到新 array
- `dirtyPathIds` 不再在提交时 `Array.from(...)`，改为事务期维护 `dirtyPathIdSnapshot`

这刀不改变：

- `inferReplaceEvidence` 语义
- dirty evidence 语义
- `RuntimeStore.commitTick(...)` 行为

## 关键样本

### 旧证据

切刀前 node-only 样本：

- `phaseCommitMs≈5.45ms`
- `phasePreStoreCommitMs≈5.31ms`
- `phaseStoreCommitInnerMs≈0.066ms`
- `phasePostStoreCommitMs≈0.082ms`

### 当前证据

切刀后两次样本：

样本 A：

- `phaseCommitMs≈5.14ms`
- `phasePreStoreCommitMs≈5.04ms`
- `phaseStoreCommitInnerMs≈0.057ms`
- `phasePostStoreCommitMs≈0.037ms`

样本 B：

- `phaseCommitMs≈4.46ms`
- `phasePreStoreCommitMs≈4.38ms`
- `phaseStoreCommitInnerMs≈0.055ms`
- `phasePostStoreCommitMs≈0.024ms`

补充拆分证据：

- `phaseCommitWithStateMs≈1.26ms ~ 1.71ms`
- `phaseTickFlushLagMs≈0.99ms ~ 1.87ms`
- `tickDelta=1` 持续成立

## 当前裁决

- 这刀值得保留
- 命中了提交前纯分配成本
- 当前可把 `externalStore ingest` 的主税点表述为：
  - 已从 `StateTransaction` 提交准备段收回一截
  - `commitTick` 内部持续保持亚毫秒级
  - 剩余主税点开始转移到 `tickFlushLag`

## 当前还剩什么

只剩一个下一刀：

- `tickFlushLag`

也就是 `onModuleCommit` 到实际 flush 开始之间的调度延迟。
