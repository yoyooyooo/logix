---
title: 测试策略手册（分层 + 命令闭环）
---

# 测试策略手册（分层 + 命令闭环）

## 1) 五层矩阵

- L1 模块语义：state/actions/setup-run 合约。
- L2 并发协作：watcher/task/process 行为。
- L3 事务与时间：事务窗口、异步边界、顺序与锚点。
- L4 宿主集成：React/CLI/Worker 入口与生命周期。
- L5 回归门：类型、lint、测试、性能/诊断证据。

## 2) 每层最低断言

- L1：相位约束正确，纯更新路径不退化。
- L2：latest/exhaust/parallel 的接受与拒绝分支可预测。
- L3：事务窗口 guard（enqueue/run*Task/async escape）有明确结论。
- L4：provider/scope/imports 边界明确，不串实例。
- L5：核心改动具备 before/after 证据与可复现命令。

## 3) 命令闭环（目标项目）

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test:turbo`（默认）
4. 需要全量对照时 `pnpm test`

补充：

- 浏览器场景：`pnpm test:browser`
- 自动化里禁止 watch 模式。

## 4) 风格约束

- 优先 `@effect/vitest` 风格（`it.effect/it.scoped/it.layer`）覆盖 Effect-heavy 场景。
- 断言优先行为与语义，不只快照。
- 并发用例至少包含 happy path + 取消/中断 + 失败路径。

## 5) 典型反模式

- 一个“大集成测试”替代分层验证。
- 在事务语义测试里引入不受控定时器。
- 只测成功路径，不测 guard/降级/错误通道。
- 在 CI/Agent 会话里跑 watch 导致驻留阻塞。

## 6) 交付门槛

- 新增语义必须有可回归测试锚点。
- 核心路径改动必须附诊断与性能结论。
- 结果可被下一位维护者复现，不依赖口头记忆。

## 7) 延伸阅读（Skill 内）

- `references/llms/07-testing-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
