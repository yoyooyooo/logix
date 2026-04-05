---
title: 长链路正交分解（A–K）与“分贝”指针
status: draft
version: 1
---

# 长链路正交分解（A–K）与“分贝”指针

> **目标**：把仓库的“需要探索很久才能掌握”的长链路，按互斥互补的维度拆成 A–K；并用“分贝”作为观测强度的速记（对应真实 API：`off/light/full`）。

## 1) A–K 是什么（为什么要用字母）

A–K 不是“模块列表”，而是 **正交的链路平面（Plane）**：每个字母都有自己的主产物与入口文件群。

- **A｜状态数据面（Data Plane）**：事务窗口、patch/dirty、StateTrait converge/validate（state 如何原子写入、为何能增量、为何禁 IO）。
- **B｜执行面（Execution Plane）**：LogicPlan/setup&run、FlowRuntime、Logic middleware（logic/flow 如何调度与守卫、并发与任务边界）。
- **C｜模块图谱（Module Graph Plane）**：imports(strict)/`$.use`、Root 单例、Link（跨模块解析与实例绑定的确定性语义）。
- **D｜副作用总线（Effect Plane）**：EffectOp pipeline、platform bridge（业务只产出 Op，平台负责落地 IO）。
- **E/F/G｜观测/证据/回放（Observability / Evidence / Replay）**：
  - **E 观测**：DebugSink → DevtoolsHub（Slim、可序列化、事件分级）。
  - **F 证据**：Static IR（去重导出）+ Dynamic events（Maps + Traces）。
  - **G 回放**：ReplayLog/time travel（dev/test 冷路径，按 txn 回放）。
  - **合并说明**：文档侧只维护单文件 `docs/ssot/handbook/reading-room/long-chain/long-chain-efg-observability-evidence-replay.md`，不要再拆成独立的 E/F/G 文件。
- **H｜宿主生命周期（Host/Program Plane）**：open/run/close scope、signals、exit code、onError（一次性程序入口与可交接资源语义）。
- **I｜Sandbox / Alignment Lab**：compiler → worker → protocol → client/service（可解释执行底座，不只是 runner）。
- **J｜测试面（Test Plane）**：Scenario/TestRuntime，用“证据/trace”做可回归断言。
- **K｜业务能力包（Feature Kits Plane）**：form/query/i18n/domain 等上层 DX（DSL/约束/默认策略）如何落到 trait/logic/adapter。

对应落地文档（每个平面都有 “三跳入口 + 不变量 + auggie 模板”）：

- `docs/ssot/handbook/reading-room/long-chain/long-chain-a-data-plane.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-b-execution-plane.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-c-module-graph-plane.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-d-effect-plane.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-efg-observability-evidence-replay.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-h-program-runner.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-i-sandbox-alignment-lab.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-j-test-plane.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-k-feature-kits.md`

## 2) 分贝是什么（对应什么旋钮）

“分贝”是记忆辅助：描述 **观测/证据的成本与强度**，避免讨论时只说“多打点/少打点”。

- **0 dB（≈ off）**：生产默认冷路径；尽量不记录 timeline，仅保留必要错误。
- **10 dB（≈ light）**：生产可用的低成本诊断；保留事务摘要/关键计数器/必要字段裁剪。
- **20 dB（≈ full）**：开发/测试态；允许更完整的 trace、time travel、更多结构化字段（仍必须 Slim 且可序列化）。

真实 API/配置以 Runtime 为准：

- 事务/trait 观测级别：`Runtime.make(...,{ stateTransaction:{ instrumentation:"off"|"light"|"full" } })`
- Devtools 注入：`Runtime.make(...,{ devtools:true })`（会自动注入 observer 与 hub layer）

## 3) 你应该怎么用（最短工作流）

1. 先把需求/问题归到 **一个主维度**（必要时再标注次维度）。
2. 打开对应 `docs/ssot/handbook/reading-room/long-chain/long-chain-*.md`，按“三跳入口（public → internal → tests）”进场。
3. 需要补基线时先看 `docs/ssot/handbook/playbooks/diagnostics-perf-baseline.md`，再按需走 perf evidence 工作流。
