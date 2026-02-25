---
title: 任务路线图（L0-L3）
---

# 任务路线图（L0-L3）

目标：按任务强度提供最小必要信息，先解决当前问题，再按需深入，不把 runtime/platform 细节一次塞满。

## L0（5 分钟）先做对，不做全

适用：你要快速判断当前任务会不会踩 Logix 红线。

只看这三份：

1. `references/north-star.md`：项目硬约束与违约信号。
2. `references/workflow.md`：你所在任务类型的默认路径。
3. `references/logix-core-notes.md`：两阶段、事务窗口、Task 写法、订阅边界。

L0 产物：

- 能明确你当前任务属于 L1/L2/L3 的哪一层。
- 能说清本次改动是否触及核心路径。

## L1（业务功能交付）

适用：新增/重构业务 feature，不改 runtime 内核。

先后顺序：

1. `references/workflow.md` 的「路径 A」。
2. `references/feature-first-minimal-example.md`（需要脚手架时）。
3. `references/logix-core-notes.md`（遇到 setup/run、watcher、run*Task 问题时）。

你要注意：

- 默认 `Process.linkDeclarative`，不要无故 blackbox。
- 同步事务体内不做 IO、不 dispatch、不调用 `run*Task`。
- 跨模块只走只读句柄 + dispatch，不直接写他库 state。

## L2（核心路径与质量门）

适用：改 `StateTransaction` / `TaskRunner` / `ProcessRuntime` / `DebugSink` / `EffectOp` 等。

先后顺序：

1. `references/diagnostics-and-perf-gates.md`
2. `references/observability-and-replay-playbook.md`
3. `references/north-star.md`

你要注意：

- 必须给 before/after 可复现证据，且同环境可比较。
- 诊断输出必须保持 Slim + JsonValue。
- 稳定锚点（`instanceId/txnSeq/opSeq`）不能被随机化破坏。

## L3（Playground / Sandbox / Alignment Lab）

适用：平台对齐、Sandbox Runtime、RunResult/Alignment Report。

先后顺序：

1. `references/platform-integration-playbook.md`
2. `references/observability-and-replay-playbook.md`
3. `references/north-star.md`

你要注意：

- Playground 不是“能跑代码就行”，而是 Alignment Lab 的前端形态。
- 输出要可用于对齐：结构化 RunResult + anchors + 可回链证据。
- 仅日志/截图不是合格交付物。

## 升级规则（何时从 L1 升到 L2/L3）

- 改动触及事务语义、并发策略、诊断协议、IR/Trace 锚点：立即升 L2。
- 改动触及 Sandbox/Playground 的 RunResult 契约或对齐报告：升 L3。
- 无法确定层级时，按更高层级执行（宁严勿松）。
