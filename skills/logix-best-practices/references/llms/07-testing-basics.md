---
title: 测试基线（LLM 版）
---

# 测试基线（LLM 版）

## 1) 最小测试矩阵

- 模块语义：setup/run、state/actions。
- 并发协作：latest/exhaust/parallel + 失败分支。
- 事务语义：enqueue guard、async escape、task 边界。
- 宿主集成：React/CLI/Worker 入口行为。
- 核心路径：诊断与性能证据。

## 2) 命令策略

- 统一使用非 watch 命令。
- 默认顺序：typecheck -> lint -> test。
- 对 Effect-heavy 场景优先 effect-native 测试风格。

## 3) 断言策略

- 断言行为语义，不只 snapshot。
- 新语义必须有失败路径断言。
- 结果能回链到模块/事务/流程边界。
