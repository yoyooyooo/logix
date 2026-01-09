# Quickstart: 092 E2E Latency Trace

本 quickstart 用于实现后的验收与回归；实现任务见 `specs/092-e2e-latency-trace/tasks.md`。

## 1) 端到端时间线验收

- 示例路径：`examples/logix/src/scenarios/e2e-trace/*`（按 tasks 落地路径为准）
- 覆盖四类瓶颈注入：
  - IO 慢
  - 事务收敛慢（converge/commit）
  - notify 延后/合并（低优先级）
  - render/commit 慢（模拟大渲染）

## 2) 采样与成本验收

- 采样关闭：不产出 trace 事件（或只保留极少高价值错误事件），且 perf evidence 显示开销在预算内
- 采样开启：事件数量/体积可控（按比例/白名单），且 ring buffer 有界

## 3) 性能证据（必须）

- 按 `specs/092-e2e-latency-trace/plan.md#Perf Evidence Plan` 产出 Node + Browser before/after/diff，落盘到 `specs/092-e2e-latency-trace/perf/*`
