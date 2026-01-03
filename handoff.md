# Handoff：logix-perf-quick / converge-steps hard gate 偶发失败

## 背景

- GitHub Action：`.github/workflows/logix-perf-quick.yml`
- 失败用例：`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
- 报错特征（示例）：
  - `Error: perf hard gate failed: auto<=full*1.05 expected maxLevel=2000`
  - `where={"dirtyRootsRatio":0.25} maxLevel=200 firstFail=800 reason=budgetExceeded`

## 本机执行结论

- 该 hard gate 在本机可通过也可失败（非确定性 flake），且失败点会在不同 `dirtyRootsRatio/steps` 上漂移。
- 失败截图文件存在，但目前内容基本是空白画面（对定位帮助不大）。

## 复现命令（与 CI 等价的 collect）

- 单次采集：
  - `pnpm perf collect:quick -- --files test/browser/perf-boundaries/converge-steps.test.tsx --out perf/local/<name>.json`
- 关闭 hard gate（用于拿到 report 做后续分析；不会在用例内 throw）：
  - `VITE_LOGIX_PERF_HARD_GATES=off pnpm perf collect:quick -- --files test/browser/perf-boundaries/converge-steps.test.tsx --out perf/local/<name>.json`

## 证据（本机落盘）

- 一次通过的 report：`perf/local/before.local.quick.json`
- 一次失败日志（示例）：`perf/local/flaky/run3.log`
  - `where={"dirtyRootsRatio":0.05} maxLevel=null firstFail=200 reason=budgetExceeded`
- 一次“二次确认后仍失败”的日志：`perf/local/stability/run1.log`
  - `where={"dirtyRootsRatio":0.75} maxLevel=200 firstFail=800 reason=budgetExceeded p95(auto/full)=0.6079999999701977/0.565 ratio=1.076106194637518`
- 失败截图（路径固定、文件名会随重跑覆盖）：  
  - `packages/logix-react/test/browser/perf-boundaries/__screenshots__/converge-steps.test.tsx/browser-converge-baseline--txnCommit-derive-under-steps---dirty-roots-distributions-1.png`

## 关键发现（为什么会 flaky）

- 预算是相对门槛：`auto<=full*1.05`，而 `runtime.txnCommitMs` 的 p95 量级在 `~0.4–0.9ms`，5% 的容差只剩几十微秒，容易被浏览器/机器噪声击穿。
- 原 `runMatrixSuite` 的点位顺序会让 relative budget 的 numerator/denominator（如 `auto` vs `full`）在同一 `steps/dirtyRootsRatio` 下**不相邻采样**，容易发生 time drift（后台负载、CPU governor、浏览器 jitter 等）；此问题已在下文“最新进展”中修复。
- `ModuleRuntime.transaction.ts` 里 `state:update` 的 `Debug.record` 是否执行取决于 sinks（不是 diagnosticsLevel）。本用例对各 convergeMode 都装了自定义 sink（silent/capture），因此即使 `diagnostics=off` 也会走 Debug 事件路径，引入额外微秒级抖动源。

## 代码指针（继续定位/修复时的入口）

- hard gate/测量：`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
- suite 执行/阈值计算：`packages/logix-react/test/browser/perf-boundaries/harness.ts`
- auto 决策（near_full / plan cache / budget cutoff）：`packages/logix-core/src/internal/state-trait/converge-in-transaction.ts`
  - `NEAR_FULL_ROOT_RATIO_THRESHOLD = 0.75`
  - `NEAR_FULL_PLAN_RATIO_THRESHOLD = 0.9`
- state:update 记录条件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `shouldRecordStateUpdate = debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)`
- Debug sink 快路径判定：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - `isErrorOnlyOnlySinks` 仅对内置 `errorOnlySink` 生效

## 我做的改动（历史尝试，已回收）

- `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
  - 曾短暂加入“失败后二次确认”用于判断是否单次抖动；但确认后仍可能失败（见 `perf/local/stability/run1.log`），说明它不能根治 flake，现已移除。

## 待决问题 / 下一步建议（供下一轮继续）

- 短期让 CI quick 不被 hard gate 卡死：
  - 在 `.github/workflows/logix-perf-quick.yml` 的 `Collect (base/head)` step 增加 `VITE_LOGIX_PERF_HARD_GATES=off`，让 quick 专注采集 + diff(triage)；
  - 硬门禁放到 `default/soak` profile 或单独 workflow（避免 micro-bench 抖动直接打断采集）。
- 从根上稳定 hard gate（更理想，但需要改测量口径）：
  - 方案 A：在同一条测量链路里“成对”测量 `full` 与 `auto`（相邻采样），用 ratio 的分布做门槛，降低 drift。
  - 方案 B：提高 workload/采样强度（更大 batch、更大 runs、更强 warmup），让单点耗时上升、相对噪声下降。
  - 方案 C：针对 `quick` profile 放宽 ratio 或改用 median（需要一起裁决其门禁语义）。

## 并行改动提醒

- 当前工作区存在其它并行任务的未提交改动与新文件（`git status --porcelain` 可见）；本次改动范围：`packages/logix-react/test/browser/perf-boundaries/harness.ts`、`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`，新增 `handoff.md`；未做任何清理/回滚操作。

## 最新进展（已止血：降低 relative budget drift）

- **修复点**：`packages/logix-react/test/browser/perf-boundaries/harness.ts` 的 `runMatrixSuite`
  - 识别 suite 里的 `relative` budgets，把涉及的 ref axes（如 `convergeMode` / `requestedMode` / `yieldStrategy` 等）从“where 维度”里抽出来，**改为在每个 primary level 内层迭代**，让 numerator/denominator 尽量相邻采样，降低 time drift。
  - 对 ref axis 的 levels 做“denominator → numerator → 其余”的优先排序（来自 budgets 的 `numeratorRef/denominatorRef`），例如 `convergeMode` 会变成 `full → auto → dirty`。
  - cutOff 语义保持不变：仍按“非 primary axes 组合”独立维护 cutOff，并统一写入 `budget.cutOffCount` evidence。

- **本机验证（hard gate 稳定性）**
  - 复现前：`pnpm perf collect:quick -- --files test/browser/perf-boundaries/converge-steps.test.tsx --out ...` 同机同用例可通过也可失败（见上文证据）。
  - 修复后：连续 8 次 collect:quick 均通过并产出 report：
    - `perf/local/repro2/*.json`（3 次）
    - `perf/local/repro3/*.json`（5 次）
  - 这 8 次里观测到的最大 `p95(auto/full)` 约为 `~1.048`（仍贴近 1.05，但未越线）。

- **收尾**
  - 已移除 `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx` 的“失败后二次确认”临时逻辑并修复缩进；hard gate 失败时仍会输出 `p95(auto/full)` 与 ratio 便于定位。
