# Quickstart: 090 Suspense Resource/Query

本 quickstart 用于实现后的验收与回归；实现任务见 `specs/090-suspense-resource-query/tasks.md`。

## 1) 快/慢网 fallback 验收

- 示例路径：`examples/logix/src/scenarios/resource-suspense/*`（按 tasks 落地路径为准）
- 覆盖路径：
  - preload + 快网：不触发 fallback
  - 无 preload + 慢网：触发 fallback 且不闪烁

## 2) 去重/取消验收

- 同一 resourceKey 多处消费：同一时刻只发生一次实际请求
- 条件切换/路由切换：旧请求被取消，乱序返回不污染新状态

## 3) 诊断链路验收（可选但推荐）

- 断言诊断事件能解释：去重命中/取消原因/失效原因，并能关联到 action run（若由交互触发）

## 4) 性能证据（必须）

- 按 `specs/090-suspense-resource-query/plan.md#Perf Evidence Plan` 产出 Node + Browser before/after/diff，落盘到 `specs/090-suspense-resource-query/perf/*`
