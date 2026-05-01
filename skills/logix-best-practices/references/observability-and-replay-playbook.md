---
title: 可观测性与回放手册（Slim 事件链）
---

# 可观测性与回放手册（Slim 事件链）

本页术语只属于观测、回放与对齐消费层，不进入业务 authoring surface，也不要求生成 public scenario/report/evidence 对象。

## 1) 最小目标

- 事件可解释：知道“谁在何时为何触发”。
- 事件可导出：`meta` 可序列化为 `JsonValue`。
- 回放可验证：同时比较最终状态与关键决策链。

## 2) 事件模型边界

- 生产者 `Event` 可以偏宽松（便于发事件）。
- 消费者模型 `RuntimeDebugEventRef` 必须 Slim 且可排序。
- 导出边界统一投影到 `JsonValue`，并记录降级原因。

## 3) 必保留锚点

- `moduleId` / `instanceId`
- `txnSeq` / `txnId`
- `opSeq`
- 需要时保留 `linkId` / `actionTag` / `serviceId` 等语义锚点

## 4) 必保留约束

- 不把 Error 实例、闭包、Fiber 等不可序列化对象塞进导出事件。
- light/full 级别差异是“细节裁剪差异”，不是“语义变更”。
- 诊断降级必须可解释（不要静默丢字段）。

## 5) 回放最小闭环

1. 导出 diagnostic bundle（事件 + metadata + version），只供观测消费层使用。
2. 按稳定锚点重建顺序。
3. 对照静态控制面与规则节点。
4. 输出差异与不可回放原因。

## 6) 验收清单

- 关键 guard 事件（invalid_phase/invalid_usage/enqueue guard）有结论。
- 事件频率与体积满足预算，不拖垮热路径。
- 独立环境可读取 diagnostic bundle 并完成最小回放。
- 差异能回链到模块/流程/事务边界。

## 7) 延伸阅读（Skill 内）

- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/08-builder-ir-basics.md`
