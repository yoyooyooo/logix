# Quickstart: 098 O-008 Scheduling Surface

本 quickstart 用于实现后的验收与迁移检查；执行任务见 `specs/098-o008-scheduling-surface/tasks.md`。

## 1) 最小验收（策略同源）

- 运行调度一致性测试（以新增测试文件为准）。
- 断言同一事务窗口中：queue/tick/concurrency 读到同一 `configScope` 与关键策略字段。

## 2) 诊断对齐验收（backlog/degrade/recover）

- 构造积压与退化场景：
  - backlog（容量阈值触发）
  - degrade（tick 预算/饥饿保护触发）
  - recover（系统恢复）
- 断言：每条事件都可回链到唯一行为事实（等待/边界变更/恢复），无孤立事件。

## 3) 迁移验收（forward-only）

- 按文档将旧分散配置入口迁移到统一 scheduling surface。
- 断言迁移后：
  - 运行行为与新策略一致；
  - 不依赖兼容层；
  - 诊断字段口径不变。

## 4) 质量门（必须）

在仓库根目录执行：

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`

## 5) 性能证据（必须）

按 `plan.md#Perf Evidence Plan` 执行 before/after/diff，落盘到：

- `specs/098-o008-scheduling-surface/perf/before.*.json`
- `specs/098-o008-scheduling-surface/perf/after.*.json`
- `specs/098-o008-scheduling-surface/perf/diff.*.json`
