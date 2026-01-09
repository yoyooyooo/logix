# Quickstart: 065 txn/recording id-first（心智 + 验收入口）

本 Quickstart 用来快速对齐：

1) id-first 在 txn 侧到底“省掉了什么”；  
2) 如何解释一次提交（dirtyAll/原因码/哪些 roots）；  
3) 如何跑 perf evidence 并让 hard gates 可判定。

## 1) 你将获得什么（可见结果）

- state/update 与 converge 相关证据字段以 **FieldPathId/StepId** 为主（小、稳定、可 diff）。
- diagnostics 分档：
  - `off`：近零成本（不输出反解结果，不输出 patch 序列）；
  - `light`：只输出摘要（`dirty.rootIds` TopK=3 + `rootIdsTruncated`、`patchCount`、必要锚点）；
  - `sampled`：确定性采样；仅在采样命中时允许输出 patch records（默认最多 256 条；超限裁剪并标记 `patchesTruncated`）与 `dirty.rootIds` TopK=32 + `rootIdsTruncated`，未命中时等价于 `light`；
  - `full`：允许输出 patch records（默认最多 256 条；超限裁剪并标记 `patchesTruncated`），并输出 `dirty.rootIds` TopK=32 + `rootIdsTruncated`。
- 任何不可追踪写入都必须显式降级为 `dirtyAll=true` + `DirtyAllReason`（不允许静默回退）。

## 2) 最小记忆法：FieldPathId 是“table index”，不是 hash

- `FieldPathId` 的唯一事实源是 `ConvergeStaticIrExport.fieldPaths`（同一 `staticIrDigest` 下稳定）。
- 需要可读路径时：在 **显示/序列化** 边界做 `id → fieldPaths[id]` 反解（热路径禁止）。

## 3) 如何判断一次事务“有没有退化”（你应该能回答）

给定一笔事务（由 `instanceId/txnSeq/txnId` 锚定），你应该能回答：

- 本次 `dirtyAll` 是 true 还是 false？
- 如果 dirtyAll=true，原因码是什么（`nonTrackablePatch` / `fallbackPolicy` / ...）？
- 如果 dirtyAll=false，`rootIds` 是哪些（可在 Devtools 侧基于 `staticIrDigest` 反解为 rootPaths）？
- diagnostics=off/light/sampled/full 下事件载荷是否符合预算（off 不应携带重字段）？
- 如果 `staticIrDigest` 缺失或不匹配，是否明确“不反解 rootPaths”，只展示 id 与摘要（避免展示错误信息）？

## 4) Perf evidence（Browser matrix + Node bench）

### 4.1 Browser（硬门：comparable=true && regressions==0 && budgetViolations==0）

在仓库根目录：

- collect（before/after）：
  - `pnpm perf collect -- --profile default --out specs/065-core-ng-id-first-txn-recording/perf/browser.<before|after>.<sha>.logix-browser-perf-matrix-v1.default.json --files test/browser/perf-boundaries`
- diff（硬门）：
  - `pnpm perf diff -- --before <before.json> --after <after.json> --out specs/065-core-ng-id-first-txn-recording/perf/diff.browser.before.<sha>__after.<sha>.json`

验收：`diff.meta.comparability.comparable=true` 且 `diff.summary.regressions==0`（并同时要求 `budgetViolations==0`）。

本次 065 证据产物（PASS）：

- before：`specs/065-core-ng-id-first-txn-recording/perf/browser.before.b0a1166c.logix-browser-perf-matrix-v1.default.json`
- after：`specs/065-core-ng-id-first-txn-recording/perf/browser.after.b0a1166c-dirty.logix-browser-perf-matrix-v1.default.json`
- diff：`specs/065-core-ng-id-first-txn-recording/perf/diff.browser.before.b0a1166c__after.b0a1166c-dirty.json`（`comparable=true && regressions=0 && budgetViolations=0`）

失败/复测策略（若 diff FAIL 或 comparable=false）：

- 先确认 before/after 的 `matrixId/profile/env` 完全一致（否则直接视为不可比）。  
- 先缩小 `--files` 到 `test/browser/perf-boundaries`（避免引入非核心 suites 的不稳定性）。  
- 必要时使用更慢但更稳的 profile（例如 `--profile soak`）复测；`diff:triage` 只能用于定位，不能替代 hard gate。  

### 4.2 Node（devtools/txn 基线）

- `OUT_FILE=specs/065-core-ng-id-first-txn-recording/perf/node.after.<sha>.bench027.r1.json pnpm perf bench:027:devtools-txn`

验收：`gate.ok=true`，且关键指标（txnQueue / devtoolsHubRecord）不回退。

本次 065 证据产物（PASS）：

- `specs/065-core-ng-id-first-txn-recording/perf/node.after.b0a1166c-dirty.bench027.r1.json`（`gate.ok=true`）

### 4.3 Node（txn dirty-set microbench）

- `NODE_ENV=production OUT_FILE=specs/065-core-ng-id-first-txn-recording/perf/node.<before|after>.<sha>.bench009.convergeMode=dirty.json RUNS=30 WARMUP_DISCARD=5 STEPS=200 INSTRUMENTATION=light CONVERGE_MODE=dirty pnpm perf bench:009:txn-dirtyset`

验收：before/after 的 `medianMs` 与 `p95Ms` 相对回归都不得超过 15%（两者同时满足）。

本次 065 证据产物（PASS；typical/extreme 两个场景都满足 ≤15%）：

- before：`specs/065-core-ng-id-first-txn-recording/perf/node.before.b0a1166c.bench009.convergeMode=dirty.json`
- after：`specs/065-core-ng-id-first-txn-recording/perf/node.after.b0a1166c-dirty.bench009.convergeMode=dirty.json`

失败/复测策略（若波动不可判定或超阈值）：

- 优先固定 `NODE_ENV=production`（避免 dev 诊断/日志扰动）并保持同一机器/同一电源模式/无后台负载。  
- 提升 `RUNS/WARMUP_DISCARD` 后重复 3 次，取最差值记录（不允许挑最好的一次）。  

## 5) 迁移提醒（只前进）

- 若内部调用方曾传入自定义 `reason` 字符串（例如 `perf:dirty`），需要按 `data-model.md` 收敛到稳定枚举（或归一化为 `unknown`）。
- 若调用方依赖 path-first 的 `dirtySet.paths`，需要迁移为 id-first 的 `dirtySet.rootIds` 并在显示层反解为可读路径。
- string path 的 dot 语义仅作为无歧义边界输入：当 key 含 `.` 导致歧义或无法映射时，必须显式降级为 `dirtyAll=true` + `reason=fallbackPolicy`（建议改用 segments 输入）。
