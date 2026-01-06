# 073 · Perf Evidence

本目录用于归档可对比的 `PerfReport` / `PerfDiff`（before/after/diff），作为本特性性能预算与回归门禁的证据落点。

> 口径：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

## 环境元信息（硬结论必填）

- Date：2026-01-06
- Branch / commit（working tree 是否 dirty）：`073` / `d8756502829cb1f047ba4aec5bf5f213b766b8e1`（dirty=false）
- OS / arch / CPU / Memory：darwin / arm64 / Apple M2 Max / 64GB
- Node.js / pnpm：v22.21.1 / 9.15.9
- Browser（name/version/headless）：chromium / 143.0.7499.4 / headless
- Matrix（matrixId/matrixHash）：`logix-browser-perf-matrix-v1` / `35a9ede8…`
- Profile（quick/default/soak）：default
- Sampling（runs/warmupDiscard/timeoutMs）：
  - `diagnostics.overhead.e2e`：10 / 0 / 20000
  - `runtimeStore.noTearing.tickNotify`：10 / 2 / 30000（metric stats n=8）
- Notes：N/A

## 证据文件

- Before（adapter=perModule）：`specs/073-logix-external-store-tick/perf/browser.before.d8756502.darwin-arm64.logix-browser-perf-matrix-v1.default.adapter=perModule.json`
- After（adapter=runtimeStore）：`specs/073-logix-external-store-tick/perf/browser.after.d8756502.darwin-arm64.logix-browser-perf-matrix-v1.default.adapter=runtimeStore.json`
- Diff：`specs/073-logix-external-store-tick/perf/diff.browser.adapter=perModule__runtimeStore.d8756502.darwin-arm64.logix-browser-perf-matrix-v1.default.json`

### 历史证据（dirty，已废弃）

- Before（adapter=perModule）：`specs/073-logix-external-store-tick/perf/browser.before.1d0b0a28-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.adapter=perModule.json`
- After（adapter=runtimeStore）：`specs/073-logix-external-store-tick/perf/browser.after.1d0b0a28-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.adapter=runtimeStore.json`
- Diff：`specs/073-logix-external-store-tick/perf/diff.browser.adapter=perModule__runtimeStore.1d0b0a28-dirty.darwin-arm64.logix-browser-perf-matrix-v1.default.json`

## CI（quick）协作

- Workflow：`.github/workflows/logix-perf-quick.yml`（默认 `profile=quick` + `diff_mode=triage`，结论只作线索）
- 采集范围：对本特性建议用 `perf_files=test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`（相对 `packages/logix-react`）
- 产物：CI 默认写入 `perf/ci/*` 并作为 artifact 上传；需要长期留档时，手动拷贝/重命名到本目录并更新上面的“证据文件/结论”

## 结论（可交接摘要）

- Gate：PASS（`meta.comparability.comparable=true` 且 `summary.regressions==0`）
- 关键指标：
  - `runtimeStore.noTearing.tickNotify`（watchers=256）：
    - Before（perModule）：`timePerTickMs.p95` off=2.10ms / full=2.00ms
    - After（runtimeStore）：`timePerTickMs.p95` off=1.90ms / full=1.80ms
  - `diagnostics.overhead.e2e`（watchers.clickToPaint）：仅作观测口径（matrix 目前无 budgets；定义见下文“click→paint”）
  - `retainedHeapDeltaBytesAfterGc`：N/A（matrix v1 的该 suite 未纳入此指标）

## 解读（前后差异）

### 1) before/after 的语义

- 本次 before/after 不是“旧代码 vs 新代码”，而是 **同一份代码**下的策略 A/B：
  - `VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER=perModule`（before）
  - `VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER=runtimeStore`（after）
- 这避免了“需要旧版本代码/独立 worktree”才能采集 before 的问题，且 diff 的可比性约束更容易满足。

### 2) `runtimeStore.noTearing.tickNotify` 的度量边界

- 指标：`timePerTickMs`（ms）
- 度量窗口：只覆盖 **tick flush → notify**（所有 watcher 的“通知已到达”屏障），不含：
  - dispatch 本身（dispatch 在度量窗口外同步触发）
  - React render/commit（这是另一个维度）
- workload（固定）：modules=10、watchers=256、ticksPerRun=1；runs/warmup/timeout 由 matrix+profile 决定（本次 stats n=8）

### 3) tick→notify：runtimeStore adapter 更快（本 workload 下）

- diagnostics=off：
  - median：1.60ms → 1.40ms（-0.20ms，-12.5%）
  - p95：2.10ms → 1.90ms（-0.20ms，-9.5%）
- diagnostics=full：
  - median：1.90ms → 1.50ms（-0.40ms，-21.1%）
  - p95：2.00ms → 1.80ms（-0.20ms，-10.0%）
- 解读：在“同等 watcher 压力”下，`runtimeStore` 的 flush→notify 端到端窗口更短，对高频 tick 的稳定性与 no-tearing 目标更友好。

### 4) 为什么 diff 的 improvements=0 但数值变好？

- `PerfDiff` 的 `summary.regressions/improvements` 是“预算/阈值跃迁”视角；本次 `runtimeStore.noTearing.tickNotify` 的 absolute budget（`p95<=0.30ms`）在 before/after 都未满足，因此阈值结论未发生变化，表现为 `improvements=0`。
- 073 的交付口径采用“先固化实测 baseline，再用 +20% 做回归阈值”（已回写到 `specs/073-logix-external-store-tick/plan.md`）。

### 5) click→paint：仅观测点（不宜硬下结论）

- 定义（当前 test 口径）：从触发 click（用户输入）开始计时，等待 React commit 生效（断言 DOM 更新），再额外等待至少一帧（`requestAnimationFrame`）作为 “commit 后 paint” 的近似，取 end 计时。

- suite：`diagnostics.overhead.e2e`，本次 runs=10，matrix v1 未设 budgets（因此只作观测口径）。
- 结果（p95）：
  - off：79.9ms → 76.9ms（-3.0ms，-3.8%）
  - light：69.1ms → 68.2ms（-0.9ms，-1.3%）
  - sampled：69.7ms → 68.9ms（-0.8ms，-1.1%）
  - full：66.1ms → 69.3ms（+3.2ms，+4.8%）
- 解读：方向不一致且仍有噪声；如需把 click→paint 作为硬门禁，建议进一步提高 runs 或用 `profile=soak` 复测，并在 matrix 里补 budgets。
