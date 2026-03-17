# 2026-03-20 · R-2 controlplane synergy widening（tier/resolvedBy/effective 一致性）

> worktree: `v4-perf.r2-controlplane-synergy`  
> branch: `agent/v4-perf-r2-controlplane-synergy`  
> baseline: `v4-perf@7929ff55`

## 0. 目标与边界

本刀在 `R2-A / R2-B / rollout-widening` 基线上继续推进 `R-2` 与 core control surface 的下一层协同 widening，优先强化：

- `tier`
- `resolvedBy`
- `effective policy`

约束执行：

- 未回到已禁止失败切口（`p3/p4/p5/p6`）。
- 未回到 queue-side 微调。
- 未改 `logix-react` 与 `StateTransaction.ts`。
- 未扩 public API。

## 1. 实现摘要

### 1.1 resolver：补齐 `resolvedBy.tier` 并固化归因规则

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`

关键改动：

- `TxnLanePolicyFieldKey` 新增 `tier`。
- `collectPatchWrites/applyParsedPatch` 对显式 tier 写入统一记账。
- 新增 `scope` 优先级比较与 `resolveTierSource`：
  - 显式 tier：取 tier 写入来源。
  - `forced_off/forced_sync`：归因到 `overrideMode/enabled` 来源。
  - `enabled=false`：归因到 `enabled` 来源。
  - 无显式 tier 的推导档位：按 `budgetMs/maxLagMs` 的有效来源归因。
- 最终 `explain.resolvedBy` 现在包含 `tier`，并与 `effective.tier` 保持一致可解释链路。

### 1.2 impl：lane evidence 投影改为以 `effective/explain` 为单一事实源

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

关键改动：

- `toTxnLaneEvidencePolicy` 改为从 `policy.effective` 与 `policy.explain.scope` 投影。
- 避免投影层读取平铺快捷字段造成口径漂移。

### 1.3 测试：覆盖 `resolvedBy.tier` 与 legacy 推导场景

文件：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

新增/增强：

- 既有断言补充 `resolvedBy.tier`。
- 新增 `legacy runtime_default txnLanes` 无显式 tier 的 throughput 推导用例，验证：
  - `effective.tier=throughput`
  - `resolvedBy.tier=runtime_default`

## 2. 验证结果

执行命令：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

结果：

- `typecheck:test`：通过。
- 指定 4 个测试文件：`17/17` 通过。
- `probe_next_blocker --json`：`status=clear`，`threshold_anomaly_count=0`。

说明：

- 本 worktree 初始缺依赖，先执行 `pnpm install` 后再跑最小验证。

## 3. 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-controlplane-synergy.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-controlplane-synergy.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-controlplane-synergy.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-controlplane-synergy.summary.md`

## 4. 结论

本刀归类：`accepted_with_evidence`。

结论要点：

- `tier` 与 `resolvedBy/effective` 在 core control surface 已形成一致链路。
- 不依赖 public API 改动即可扩大 `R-2` 诊断可解释性。
- `R-2` 后续若继续扩面，优先进入 public API proposal 论证线（docs/evidence-only）。
