---
title: 核心路径改动的诊断与性能证据闭环
---

# 核心路径改动的诊断与性能证据闭环

## 1) 触发条件（命中任一即执行）

- 改动 `StateTransaction` / `TaskRunner` / `ProcessRuntime` / `DevtoolsHub` / `EffectOpCore` / `ProgramRunner`。
- 改动事务窗口规则、Process 协作语义（`link` / `linkDeclarative`）、或诊断协议字段。
- 改动会影响 IR/Trace 可解释链路或稳定标识（`instanceId` / `txnSeq` / `opSeq`）。

## 2) 最小质量门（先过再谈性能）

1. 执行项目的类型检查命令（例如：`<pkg-manager> run typecheck`）。
2. 执行项目的 lint 命令（例如：`<pkg-manager> run lint`）。
3. 执行非 watch 的测试命令（例如：`<pkg-manager> run test` 或项目约定的快速回归命令）。
4. 若改动的是 runtime 核心路径，再补一次全量测试作为对照。

## 3) 性能证据最小闭环

1. 先固定采样条件：机器/Node 版本/运行次数/warmup/输入规模。
2. 采集 `after` 基线（示例命令）：

```bash
<pkg-manager> run perf:collect -- --out <perf-output-dir>/after.quick.json
```

3. 与 `before` 对比并产出 diff（示例命令）：

```bash
<pkg-manager> run perf:diff -- --before <before.json> --after <perf-output-dir>/after.quick.json --out <perf-output-dir>/diff.quick.json
```

4. 报告里至少保留：样本参数、关键指标（如 p50/p95）、回归结论与可复现命令。

## 4) 诊断证据最小闭环

至少验证以下诊断码在预期场景可解释（触发或不触发都要有结论）：

- `logic::invalid_phase`
- `logic::invalid_usage`
- `state_transaction::enqueue_in_transaction`
- `state_transaction::dirty_all_fallback`
- `process_link::blackbox_best_effort`

同时确认：

- 诊断/trace 载荷保持 slim 且可序列化（JsonValue 友好）。
- 事件链中可读到稳定标识（`instanceId/txnSeq/opSeq`，按场景适用）。
- 统一最小 IR（Static IR + Dynamic Trace）未漂移为并行真相源。

## 5) 代码锚点（通用检索）

- 事务边界实现：`runWithStateTransaction` 与提交路径。
- 事务内 guard：`run*Task` guard、enqueue guard、async escape 检测。
- Process 协作边界：`Process.link`（best-effort）与 `Process.linkDeclarative`（强一致前提）。
- 诊断聚合/导出：Debug/Devtools Hub 与事件裁剪策略。
- React 适配（若适用）：selector 订阅、imported module 解析、dispatch 稳定性。
