# Quickstart: 088 Async Action Coordinator

本 quickstart 用于实现后的验收与回归；实现任务见 `specs/088-async-action-coordinator/tasks.md`。

## 1) 基本验收（示例场景）

- 运行示例：`examples/logix/src/scenarios/async-action/*`（按 tasks 落地路径为准）
- 覆盖路径：
  - success：pending → settle(success) → state 回写
  - failure：pending → settle(failure)（可序列化错误摘要）
  - cancel：pending → settle(cancelled)（覆盖/路由切换等触发）

## 2) 诊断链路验收

- 开启 devtools/diagnostics（按实现入口）
- 断言：
  - 每个 action run 都有稳定标识，可与模块 `instanceId` 关联
  - 产生的事务（txnSeq/txnId）能被关联到同一 action run
  - 事件 payload Slim 且可序列化（不可序列化字段必须 downgrade 并标注原因）

## 3) 事务边界验收

- 断言 pending 与回写均通过事务提交表达
- 断言事务窗口内无 IO/await（通过代码审查 + 诊断事件/测试兜底）

## 4) 性能证据（必须）

- 按 `specs/088-async-action-coordinator/plan.md#Perf Evidence Plan` 产出 Node + Browser before/after/diff，落盘到 `specs/088-async-action-coordinator/perf/*`
