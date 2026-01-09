# Contract: Replay（re-emit）× Diagnostics（txn 聚合）

## 1. Replay Mode

- 回放时不得触发真实网络请求；
- 资源/查询结果必须以事件日志中记录的 Success/Failure 结果与其 payload “重赛（re-emit）”；
- 回放必须可复现资源状态变化顺序与关键 payload。

## 2. 事件口径（最小字段集）

事件必须能用于：

- stale 丢弃解释（resourceId + keyHash + 当前 keyHash）
- 触发来源解释（mount/depsChange/manual）
- txn 聚合（txnId）
- 失效/刷新重赛（InvalidateRequest）

并且对每一次派生/刷新/丢弃，诊断信号必须包含（或可追溯到）：

- 稳定标识（ruleId/stepId 等）与所属层级（Form/StateTrait/Trait）；
- 触发原因（变更来源、触发策略、并发策略）；
- 输入快照（用于复现与因果分析的最小必要输入视图）；
- 状态变更记录（patch 列表，至少包含 path/from/to/reason）。

## 3. 诊断等级与保留窗口

- 至少四档（off/light/sampled/full），并明确各自的开销边界；
- 默认保留窗口 60s（允许配置）；
- 必须能回答：本次窗口触发了哪些规则、哪些跳过、最高成本规则是谁、以及降级/失败原因。
- 开发/调试模式应提供 deps 一致性诊断：当规则的实际读取范围与声明 deps 不一致时，必须给出可操作提示，避免“漏写 deps 导致静默不更新”的隐蔽问题。
