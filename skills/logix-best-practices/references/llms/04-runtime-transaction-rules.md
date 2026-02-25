---
title: Runtime 与事务窗口规则（LLM 版）
---

# Runtime 与事务窗口规则（LLM 版）

## 1) 事务窗口红线

在同步事务体内禁止：

- IO / await / Promise escape
- dispatch / setState 嵌套调用
- `run*Task`

## 2) 推荐流程（multi-entry）

1. `pending`：同步写入“进行中”。
2. `effect`：事务外执行 IO。
3. `success/failure`：独立事务写回结果。

## 3) 常见诊断码（语义层）

- `logic::invalid_phase`
- `logic::invalid_usage`
- `state_transaction::enqueue_in_transaction`
- `state_transaction::async_escape`
- `state_transaction::dirty_all_fallback`

## 4) 交付要求

- 关键行为可解释（有事件与锚点）。
- 结果可回放（至少关键决策链）。
