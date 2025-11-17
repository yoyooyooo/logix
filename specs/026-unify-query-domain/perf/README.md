# 026 · Query Perf Evidence（基线口径与归档约定）

本目录用于存放 `026-unify-query-domain` 的性能证据（Before/After/Diff），用于满足：

- **NFR-001**：Query 自动触发/刷新热路径 p95 ≤ baseline +5%
- **NFR-002**：diagnostics off 额外开销 ≤ baseline +1%

并为后续 “引擎接管点（Engine.middleware）/类型收敛/入口收口” 的改动提供可回归基线。

## 1) 测什么（热路径）

- **自动触发**：`deps` 变化 →（可选 debounce）→ `source.refresh` → keyHash 门控 → snapshot 写回
- **并发策略**：`switch`（只认最新）与 `exhaust`（trailing）在高频输入下的竞态正确性与开销
- **key 可用性切换**：`key(state) => undefined ↔ defined` 的门控成本与快照回收语义（idle/no-op）
- **引擎接管点**：`Query.Engine.middleware()` 拦截 `EffectOp(kind="trait-source")` 的决策与委托开销
- **诊断分档**：`off` vs `light/full`（同一 workload 的时间/分配差异）

## 2) 场景（最小集）

以 `pnpm perf bench:026:query-auto-trigger` 为唯一采样入口，覆盖至少：

- `switch + debounce=0`（高频输入、持续刷新）
- `switch + debounce>0`（去抖收敛、减少无意义刷新）
- `key` 在输入过程中 “可用/不可用” 来回切换（门控 + 快照回收）
- diagnostics：`off` 与 `full`（或 `light`）两档对照

> 说明：是否启用外部引擎（TanStack）由 `Runtime.layer` + `Runtime.middleware` 组合决定；本特性以“四种组合语义”中的推荐路径为主对比口径。

## 3) 报告字段口径（对齐 `logix-perf-evidence`）

脚本输出建议为 JSON（可直接落盘），最小结构对齐本仓 `logix-perf-evidence` 的通用风格：

- `meta`：至少包含 `node`、`platform`、`runs`、`warmupDiscard`、`diagnosticsLevel`
- `cases[]`：每个 case 表示一个参数组合（concurrency/debounce/keyMode/engineMode）
  - `stats.timeMs.p50/p95`：每次运行的耗时分位数（ms）
  - `stats.heapDeltaBytes.p50/p95`（可选）：单次运行前后 heap delta（bytes）
  - `evidence`（可选）：用于解释结果的计数/标记（例如 refresh 次数、stale 丢弃次数、key 不可用跳过次数）

diff 报告（`diff.worktree.*.json`）最小字段：

- `before/after.p95Ms`：时间 p95（预算门槛的主要依据）
- `before/after.p95HeapDeltaBytes`：分配粗估 p95（用于守住“分配不回退”的趋势）
- `before/after.p95LoadCalls`：实际 `ResourceSpec.load` 调用次数
- `before/after.p95EngineFetchCalls`：引擎接管点的 fetch 次数（middleware on 时存在）

## 4) 归档命名（建议）

- `before.worktree.quick.<diagnostics>.json`
- `after.worktree.quick.<diagnostics>.json`
- `diff.worktree.<diagnostics>.json`

其中 `<diagnostics>` 推荐为 `off|full`（或 `off|light|full`）。

## 4.1) 运行入口（命令模板）

> 说明：此处的 before/after 口径用于度量「Query.Engine.middleware 接管点」下，从“passthrough engine（仅透传 load，不做缓存/去重）”切换到 “TanStack engine（缓存/失效对接）”的额外开销；
> 它不是“历史提交前后”的对照（避免误读为 git baseline）。

- Before（passthrough engine + middleware，diagnostics=off）：
  - `NODE_OPTIONS=--expose-gc pnpm perf bench:026:query-auto-trigger -- --engine passthrough --middleware on --diagnostics off --out specs/026-unify-query-domain/perf/before.worktree.quick.off.json`
- After（TanStack engine + middleware，diagnostics=off）：
  - `NODE_OPTIONS=--expose-gc pnpm perf bench:026:query-auto-trigger -- --engine tanstack --middleware on --diagnostics off --out specs/026-unify-query-domain/perf/after.worktree.quick.off.json`
- Diff（diagnostics=off）：
  - `pnpm perf bench:026:query-auto-trigger -- --diff --before specs/026-unify-query-domain/perf/before.worktree.quick.off.json --after specs/026-unify-query-domain/perf/after.worktree.quick.off.json --out specs/026-unify-query-domain/perf/diff.worktree.off.json`

- Before（passthrough engine + middleware，diagnostics=full）：
  - `NODE_OPTIONS=--expose-gc pnpm perf bench:026:query-auto-trigger -- --engine passthrough --middleware on --diagnostics full --out specs/026-unify-query-domain/perf/before.worktree.quick.full.json`
- After（TanStack engine + middleware，diagnostics=full）：
  - `NODE_OPTIONS=--expose-gc pnpm perf bench:026:query-auto-trigger -- --engine tanstack --middleware on --diagnostics full --out specs/026-unify-query-domain/perf/after.worktree.quick.full.json`
- Diff（diagnostics=full）：
  - `pnpm perf bench:026:query-auto-trigger -- --diff --before specs/026-unify-query-domain/perf/before.worktree.quick.full.json --after specs/026-unify-query-domain/perf/after.worktree.quick.full.json --out specs/026-unify-query-domain/perf/diff.worktree.full.json`

## 5) 判定口径（PASS / FAIL）

以同机同配置下的 Before/After 对照为准（同 `runs/warmupDiscard` 与同一 workload）：

- `diagnostics=off`：`after.p95 ≤ before.p95 * 1.01`（NFR-002）且 `≤ *1.05`（NFR-001 上限）
- `diagnostics=full/light`：`after.p95 ≤ before.p95 * 1.05`（避免诊断开销回退过大）

补充（分配/分配趋势）：

- 对齐 spec 表述“延迟与分配”：优先以 `p95Ms` 作为硬门槛；`p95HeapDeltaBytes` 作为趋势监控与回归信号（避免隐性抖动）。
