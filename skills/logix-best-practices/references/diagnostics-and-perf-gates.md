---
title: 核心路径改动的诊断与性能证据闭环
---

# 核心路径改动的诊断与性能证据闭环

## 1) 触发条件（命中任一即执行）

- 改动 `StateTransaction` / `TaskRunner` / `ProcessRuntime` / `DevtoolsHub` / `EffectOp` / `DebugSink`。
- 改动事务窗口规则、协作语义（`link`/`linkDeclarative`）、诊断协议字段。
- 改动影响 IR/Trace 解释链或稳定锚点（`instanceId/txnSeq/opSeq`）。

## 2) 最小质量门（先过再谈优化）

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test:turbo`（默认）
4. 疑难场景再补 `pnpm test`（全量对照）

> 一律用非 watch 命令，避免阻塞与假阳性。

## 3) 性能证据闭环

1. 固定采样条件：机器、Node、warmup、样本数、输入规模。
2. 采集 before/after 数据（同 profile）。
3. 生成 diff，并给出结论（p50/p95、回归阈值、显著性说明）。
4. 报告必须附可复现命令与参数。

## 4) 诊断证据闭环

至少覆盖以下行为结论（触发或不触发都要有说明）：

- `logic::invalid_phase`
- `logic::invalid_usage`
- `state_transaction::enqueue_in_transaction`
- `state_transaction::async_escape`
- `state_transaction::dirty_all_fallback`
- `process_link::blackbox_best_effort`

同时确认：

- 事件载荷 Slim + JsonValue 可导出。
- 事件链可读取稳定锚点（`instanceId/txnSeq/opSeq`）。
- 未引入并行真相源（Static IR 与 Dynamic Trace 分层仍成立）。

## 5) 常见错误结论（拒绝）

- “单测都绿了，所以性能没问题”。
- “只看体感快了，不给 before/after/diff”。
- “诊断开关关掉就没成本，不需要解释降级”。

## 6) 延伸阅读（Skill 内）

- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/07-testing-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
