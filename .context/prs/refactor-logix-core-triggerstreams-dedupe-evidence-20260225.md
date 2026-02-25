# PR Draft: refactor-logix-core-triggerstreams-dedupe-evidence-20260225

- Branch: `perf/cr88-triggerstreams-perf-evidence`
- PR: 待创建

## 目标
- 为 `triggerStreams` 中 `moduleStateChange` 去重热路径补充可复现性能证据（Diagnostics=off）。
- 不改 API，保持行为语义不变。

## 本轮改动
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts`
  - 新增可执行 perf evidence 测试：同一数据集对比 `legacy (Ref.get + Ref.set)` 与 `optimized (Ref.modify)`。
  - 输出 `legacy/optimized` 的 p50/p95 指标。
  - 断言行为不回归：`expectedAccepted == legacyAccepted == optimizedAccepted`。
- `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/module-statechange-dedupe.perf-evidence.off.json`
  - 结构化 perf 证据（来源于测试输出的 `[perf:evidence]`）。
- `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/vitest.module-statechange-dedupe-perf.log`
  - 定向测试执行日志（含指标输出）。
- `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/summary.md`
  - 证据说明与命令复现入口。

## 定向测试
- `pnpm -C packages/logix-core exec vitest run test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts`

## 证据摘要（本地一次运行）
- dataset: `events=120000`, `duplicateRatio=0.9`, `seed=20260225`
- iterations: `30`（warmup `5`）
- `legacy.p95=20.177ms`
- `optimized.p95=21.363ms`
- `p95 ratio (optimized/legacy)=1.059`
- behavior invariant: `11968 == 11968 == 11968`

## 备注
- 已清理无效失败产物：`after.local.default.json`（原文件仅包含 missing-script 错误）。

## 机器人 Review 消化
- Gemini Code Assist：仅 PR summary，无 actionable inline 建议。
- CodeRabbit：本轮仅 rate-limit 提示，无 actionable 代码建议。
