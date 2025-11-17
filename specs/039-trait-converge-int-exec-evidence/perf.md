# Perf Evidence: 039 Trait 派生收敛热路径性能与可诊断性达标

> 记录 039 的可复现性能证据（Before/After/Diff），用于裁决“整型优化打穿到执行层”的收益与回归风险。
> browser 跑道统一复用 `$logix-perf-evidence` 的协议与工具（`PerfReport/PerfDiff` schema、`LOGIX_PERF_REPORT`、collect/diff）。

## 环境元信息（必填）

- Date: 2025-12-28T11:22:20Z
- Git branch / commit: dev / 38db2b0525e00e98fb24f696e7332dc9e89bbf40（worktree dirty）
- OS / arch: macOS 15.6.1 / arm64
- CPU / Memory: Apple M2 Max / 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Browser（仅 browser run）: chromium（headless；playwright 1.57.0）
- Notes（电源模式/后台负载/浏览器版本锁定/是否切换 tab 等）: 本仓并行任务存在未提交改动（见 git status）；采集时未切换 tab

## 判门范围（必须包含的 suites）

- 合成（P1）：`converge.txnCommit`（`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`；Node runner 同 suiteId）
- 业务（P1）：`form.listScopeCheck`（`packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`）
- 诊断开销（P3）：`diagnostics.overhead.e2e`（`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`；用于满足 `NFR-002` 的“可测量”要求）

## 扩展证据（建议，用于阻断“负优化中间态”）

> 这些不作为 039 的验收硬门，但强烈建议在关键默认切换/大改动时补齐（尤其是“整型链路打穿”的半成品态风险）。

- 对抗边界（P2）：`negativeBoundaries.dirtyPattern`（`packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`）
- React 宿主抖动护栏（P4）：`react.strictSuspenseJitter`（`packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`）
- “用户感知”端到端护栏（P4）：`watchers.clickToPaint`（`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`）
- Node microbench（拆解 txn/dirty-set 热点）：`pnpm perf bench:009:txn-dirtyset`（对齐 `tasks.md` 的 FieldPath 透传 + light 零分配记录）

## 预算与稳定性判据（SSoT）

- perf budgets / comparisons / runs-warmup-profile / stability 阈值的单一事实源：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- 039 的验收硬门：以 `spec.md` 的 `SC-002/SC-003/SC-005` 为准（本目录的 `perf/` 证据只负责“可复现 + 可对比 + 可解释”）。
- “抖动可解释”的最小判据：若同机同配置下 p95 抖动超过 matrix 的 `stability.maxP95DeltaRatio` 或 `stability.maxP95DeltaMs`，必须能用 `trait:converge` evidence 字段归因（否则视为跑道不可用，需先修复采集/噪声，而非裁决优化好坏）。

## 结论强度（profile）

- `quick`：仅用于迭代探路，不作为 `SC-*` 的判门依据。
- `default`：作为正式结论/对外宣称的最低口径（`collect` / `bench:traitConverge:node` 默认即为 default）。
- `soak`：关键大改动或抖动难解释时使用（collect 支持 `--profile soak`）。

## 运行入口（固定）

- Browser（headless，P1：business+synthetic）：
  - 采集：`pnpm perf collect -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.worktree.json --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/form-list-scope-check.test.tsx`（快速口径：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.worktree.quick.json --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/form-list-scope-check.test.tsx`）
  - 用例：复用 `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`（suiteId=`converge.txnCommit`）+ `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`（suiteId=`form.listScopeCheck`）
- Browser（headless，P3：diagnostics overhead）：
  - 采集：`pnpm perf collect -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.diagnostics-overhead.worktree.json --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx`（快速口径：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.diagnostics-overhead.worktree.quick.json --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx`）
  - 用例：复用 `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`（suiteId=`diagnostics.overhead.e2e`）
- Diff（Before/After 对比：每个 before/after 对各跑一次，落盘到 039 的 `perf/`）：`pnpm perf diff -- --before <before.json> --after <after.json> --out specs/039-trait-converge-int-exec-evidence/perf/diff.worktree.json`
- Node（合成基线 runner；含 time + heap delta）：
  - Before：`pnpm perf bench:traitConverge:node -- --out specs/039-trait-converge-int-exec-evidence/perf/before.node.worktree.json`
  - After：`pnpm perf bench:traitConverge:node -- --out specs/039-trait-converge-int-exec-evidence/perf/after.node.worktree.json`

## 运行入口（扩展证据，建议）

- Browser（headless，P2：negative boundaries，quick 探路）：
  - 采集：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.negative-dirty-pattern.worktree.quick.json --files test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`
  - 用例：复用 `packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`（suiteId=`negativeBoundaries.dirtyPattern`）
- Browser（headless，P4：React strict suspense jitter，quick 探路）：
  - 采集：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.react-strict-suspense-jitter.worktree.quick.json --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`
  - 用例：复用 `packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`（suiteId=`react.strictSuspenseJitter`）
- Browser（headless，P4：watchers click-to-paint，quick 探路）：
  - 采集：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.watchers-click-to-paint.worktree.quick.json --files test/browser/watcher-browser-perf.test.tsx`
  - 用例：复用 `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`（suiteId=`watchers.clickToPaint`）
- Node（microbench：txn/dirty-set 热点拆解）：
  - 采集：`INSTRUMENTATION=light pnpm perf bench:009:txn-dirtyset > specs/039-trait-converge-int-exec-evidence/perf/after.node.txn-dirtyset.json`

> 说明：browser mode 内不直接写文件，默认通过 `LOGIX_PERF_REPORT:<json>` 单行输出 + collect 脚本落盘（复用 perf-evidence collect）。

## Raw Evidence（固化文件）

- Before（Node）：`specs/039-trait-converge-int-exec-evidence/perf/before.node.worktree.json`
- After（Node）：`specs/039-trait-converge-int-exec-evidence/perf/after.node.worktree.json`
- Diff（Node）：`specs/039-trait-converge-int-exec-evidence/perf/diff.node.worktree.json`
- Before（Browser，P1）：`specs/039-trait-converge-int-exec-evidence/perf/before.browser.worktree.json`
- After（Browser，P1）：`specs/039-trait-converge-int-exec-evidence/perf/after.browser.worktree.json`
- Diff（Browser，P1）：`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.worktree.json`
- Before（Browser，P3 diagnostics overhead）：`specs/039-trait-converge-int-exec-evidence/perf/before.browser.diagnostics-overhead.worktree.json`
- After（Browser，P3 diagnostics overhead）：`specs/039-trait-converge-int-exec-evidence/perf/after.browser.diagnostics-overhead.worktree.json`
- Diff（Browser，P3 diagnostics overhead）：`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.diagnostics-overhead.worktree.json`

### Raw Evidence（扩展证据，建议）

- Before/After/Diff（P2 negative boundaries，quick）：`specs/039-trait-converge-int-exec-evidence/perf/*browser.negative-dirty-pattern.worktree.quick.json`
- Before/After/Diff（P4 strict suspense jitter，quick）：`specs/039-trait-converge-int-exec-evidence/perf/*browser.react-strict-suspense-jitter.worktree.quick.json`
- Before/After/Diff（P4 watchers click-to-paint，quick）：`specs/039-trait-converge-int-exec-evidence/perf/*browser.watchers-click-to-paint.worktree.quick.json`
- Before/After（Node txn/dirty-set microbench）：`specs/039-trait-converge-int-exec-evidence/perf/*node.txn-dirtyset.json`

## Sanity（非判门）

- `specs/039-trait-converge-int-exec-evidence/perf/diff.sanity.json` 仅用于同 commit 下的 quick A/B 对照，不可替代真正的“改动前→改动后”基线证据（`SC-001/SC-002/SC-003/SC-005` 仍以 Before/After/Diff 为准）。
- `specs/039-trait-converge-int-exec-evidence/perf/checkpoint.node.<tag>.worktree.quick.json`（以及对应 diff）用于阻断“半成品态默认切换”的回归哨兵（见 `tasks.md` Phase 8）。

## 关键点位（与 `spec.md` 的 `SC-002/SC-003` 对齐）

- 合成 10× / local：`converge.txnCommit` + `convergeMode=auto` + `steps=2000` + `dirtyRootsRatio=0.05`（目标：time p95 ≥ 3× 改善；Node 额外目标：`runtime.heapDeltaBytes.p95` ≥ 5× 改善）
- 合成 10× / near-full：`converge.txnCommit` + `convergeMode=auto` + `steps=2000` + `dirtyRootsRatio=0.75`（目标：time p95 ≥ 1.5× 改善）
- 业务护栏（最大档位）：`form.listScopeCheck` + `requestedMode=auto` + `rows=300` + `diagnosticsLevel=off`（time：`runtime.txnCommitMs.p95`；同时保留 `diagnosticsLevel=light/full` 用于观察开销曲线）

## heap delta 判定（Node-only）

> 说明：当前 heap delta 以 point evidence（`runtime.heapDeltaBytes.{median,p95}`）形态出现在 Node report 中；browser report 不要求该指标。

- 对 `SC-003` 的最小检查：对比 Before/After 在同一关键点位（`convergeMode=auto&steps=2000&dirtyRootsRatio=0.05`）的 `runtime.heapDeltaBytes.p95` 值（目标：after ≤ before / 5）。
- 提取命令（把 `<report.json>` 替换为 before/after 文件）：
  - `jq '.suites[] | select(.id==\"converge.txnCommit\") | .points[] | select(.params.convergeMode==\"auto\" and .params.steps==2000 and .params.dirtyRootsRatio==0.05) | .evidence[] | select(.name==\"runtime.heapDeltaBytes.p95\") | .value' <report.json>`

## 对照规则（最小）

- 同机同配置（runs/warmup/profile/浏览器版本/headless）才可判定 Before/After。
- 至少保留一组 browser run：用于覆盖宿主特定 JIT/GC 差异，避免“只在 Node 优化有效”的偏差。
- `*.browser.worktree*.json`（P1）若缺少 `converge.txnCommit` 或 `form.listScopeCheck`，视为采集入口/用例选择错误（优先检查 collect 的 `--files`）。
- `*.browser.diagnostics-overhead.worktree*.json`（P3）若缺少 `diagnostics.overhead.e2e`，视为采集入口/用例选择错误（优先检查 collect 的 `--files`）。

## 本次结果（worktree）

- Browser（`converge.txnCommit`，auto，steps=2000，dirtyRootsRatio=0.05）：p95 51.6ms → 0.8ms（≈64.5×）
- Browser（`converge.txnCommit`，auto，steps=2000，dirtyRootsRatio=0.05）：p95 51.6ms → 0.8ms（≈64.5×）
- Browser（`converge.txnCommit`，auto，steps=2000，dirtyRootsRatio=0.75）：p95 203.2ms → 2.6ms（≈78.2×）
- Node（`converge.txnCommit`，auto，steps=2000，dirtyRootsRatio=0.05）：heap p95 6,652,912B → 1,235,568B（≈5.38×；`SC-003` 达标）
