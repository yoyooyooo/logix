---
title: 工作流与交接清单（渐进式）
---

# 工作流与交接清单（渐进式）

## 路径 A：业务 feature（L1 默认）

适用：不改 runtime 内核，只交付业务功能。

1. 建 feature 骨架：`src/features/<feature>/`（model/service/module/logic/processes）。
2. 在 `logic` 中遵守两阶段：setup 仅注册，run 才挂 watcher/flow。
3. 跨模块协作默认 `Process.linkDeclarative`；bridge 场景才用 `Process.link`。
4. 状态写入优先 `mutate/immerReducers`，避免 dirtyAll 退化。
5. 组合根 `src/runtime/*` 只做 imports/processes/layer。
6. 提供可运行入口 `src/scenarios/*` 并确保释放资源。
7. 若要把私有 pattern 升级到全局 `src/patterns/*`，运行 `scripts/check-pattern-reuse.mjs` 验证复用门槛。

交付物：

- 可运行场景 + 可解释协作边界 + 通过基础质量门。

## 路径 B：跨模块协作语义（L1.5）

适用：你主要在调整协作链路，而不是改 runtime 内核实现。

1. 先判断是否可静态表达 `read -> dispatch`。
2. 可静态表达：使用 `linkDeclarative` 并满足 static ReadQuery 条件。
3. 需要 async/external side-effect：保留 `link`，并显式写明 best-effort 边界。
4. 用场景对照验证 same-tick 与 bridge-after 差异。

交付物：

- 每条协作链路都有“为何 declarative / 为何 blackbox”的说明。

## 路径 C：核心路径改造（L2）

适用：改 `StateTransaction` / `TaskRunner` / `ProcessRuntime` / `DebugSink` / `EffectOp`。

1. 先过语义门：事务边界、锚点稳定、诊断可导出。
2. 再过证据门：before/after/diff 的可复现性能证据。
3. 核验关键诊断码与 guard 行为。
4. 回看事件投影：Slim + JsonValue + downgrade 可解释。

交付物：

- 结论必须附带证据，不接受“只看体感更快”。

## 路径 D：Sandbox/Playground/Alignment Lab（L3）

适用：平台侧对齐链路与实验室能力。

1. 明确输入：Spec/Scenario + IntentRule + Logix/Effect 实现。
2. 结构化输出：RunResult（events/snapshots/anchors，必要时 tape）。
3. 确保对齐消费可回链：事件 → IntentRule/LogicGraph 节点。
4. 交付 Alignment Report，而非仅日志。

交付物：

- 可被平台消费的对齐证据链路。

## Definition of Done（统一）

- 目录职责清晰：feature / runtime / scenarios 分工明确。
- 协作边界显式：不是模块间私下耦合。
- 事务边界守住：同步窗口无 IO/dispatch/`run*Task`。
- 事件可解释：稳定锚点 + Slim JsonValue。
- 质量门通过：类型检查 → lint → 非 watch 测试。
- 若触及核心路径：性能与诊断证据可复现。
