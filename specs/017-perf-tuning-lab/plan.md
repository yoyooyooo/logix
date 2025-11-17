# Implementation Plan: 017 调参实验场（Perf Tuning Lab）

**Branch**: `[017-perf-tuning-lab]` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)

## Summary

017 的目标是把“最佳默认值”做成一条可复现的流水线：

- **013** 负责定义 converge 控制面语义与证据字段（事实源）。
- **014** 负责提供性能跑道、矩阵口径与 Before/After 对比（事实源）。
- **017** 只做“基于 014 跑道的参数 sweep + 推荐默认值”，不再创造第二套语义。

## Scope（当前实现范围）

当前版本只做一件事：**在同机同配置下，对 converge 控制面的候选参数跑 sweep，并输出推荐默认值**。

- Sweep 旋钮：
  - `stateTransaction.traitConvergeBudgetMs`（013 控制面）
  - `stateTransaction.traitConvergeDecisionBudgetMs`（013 控制面）
- Suite：`converge.txnCommit`（014 跑道）
- 推荐评分口径：
  - 只看 budget：`commit.p95<=50ms`
  - 只看 `convergeMode=auto` 的 whereSlice（按 `dirtyRootsRatio` 切分）
  - Winner 规则：先最大化 `worstMaxLevel`，再最大化 `sumMaxLevel`（详见 `specs/017-perf-tuning-lab/quickstart.md`）
- 硬门：`auto<=full*1.05` 由 `converge.txnCommit` 用例自身断言；失败会导致该候选采集失败，进入 sweep 的 error（不参与推荐）

## Non-goals（明确不做）

- 不在 017 内产出 Before/After diff（统一走 014 的 `pnpm perf diff`）。
- 不把“隐藏魔法值/内部常量”直接塞进 sweep；进入 017 之前必须先显式化 + 可观测化（见 `specs/017-perf-tuning-lab/knobs.md` 的候选项）。

## Entrypoints（命令入口）

- 一键跑（quick）：`pnpm perf tuning:best`
- 自定义：`pnpm perf tuning:recommend -- --profile default --retries 2 --files <path> --candidates <json>`
- 稳定性确认（可选）：`pnpm perf tuning:recommend -- --confirm --confirm-profile default --confirm-top 2`

## Artifacts（产物）

写入目录：`specs/014-browser-perf-boundaries/perf/tuning/`

- 稳定入口（给人看）：`recommendation.latest.md`
- 稳定入口（给机器/LLM）：`recommendation.latest.json`
- 每个候选的原始报告：`sweep.017.*.json`

## Implementation Map（代码落点）

- Sweep + 推荐生成器：`pnpm perf tuning:recommend`
- 复现实验的控制面注入（env → Runtime config）：`packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts`
- 跑道采集与落盘：`pnpm perf collect`
- Diff（Before/After）：`pnpm perf diff`

## Constitution Check（质量门槛）

- 事实源单一：013 只定义控制面语义；014 只定义跑道与 PerfReport/thresholds 口径；017 只消费两者并产出 sweep/recommendation（不复制/发明新口径）。
- 可复现输入：`recommendation.latest.json` 必须写入 `matrixId/matrixFile/profile/files/candidates` 等复现必要信息；不能依赖“人记得当时怎么跑的”。
- 可解释输出：必须同时输出 `winner`（可复制配置）、`hardGate` 结论、以及每个切片的 `firstFailLevel/reason`（无需打开原始 report 也能审计）。
- 扩展不改代码：新增跑道时优先通过 `--files` 透传给 014 collect，而不是改 017 脚本源码（避免“每加一条跑道就改一处逻辑”）。

## Validation（最小验证）

- `pnpm perf tuning:best` 能生成 `specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md|json`
- 单测覆盖控制面优先级：`packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`

## Next Actions（下一批收口）

1. **提升推荐稳定性**：当 winner 贴近阈值或波动大时，默认用 `profile=default` 或对关键候选做重复采样，再给出结论。
2. **扩证据**：把 `traitConvergeBudgetMs` 触发降级/止损的证据字段纳入 014/017 的可解释输出（避免只能从耗时侧推）。
3. **补齐“模拟旧状态/回退基线”**：用可枚举参数组合表达“旧默认”，并把它作为 sweep 的对照项（不通过隐藏兼容层）。
4. **纳入更多 suite**：当 converge 侧旋钮稳定后，再逐步引入 watchers/diagnostics/devtools 等旋钮与跑道（以 `knobs.md` 为迭代入口）。
