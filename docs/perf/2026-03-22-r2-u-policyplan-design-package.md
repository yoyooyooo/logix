# 2026-03-22 · R2-U PolicyPlan contract reorder（design package）

> 后续状态更新（2026-03-22 同日）：最小 trigger bundle 已补齐，见 `docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`。当前仍 `implementation-ready=false`，唯一阻塞收敛为外部 `SLA-R2` 实值输入。

## 目标与范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.r2-u-policyplan-v2`
- branch：`agent/v4-perf-r2-u-policyplan-v2`
- 本轮目标：把 `R2-U PolicyPlan contract reorder` 从 direction scout 推进到可开线前的 trigger-ready 状态。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=false`
- 结果分类：`discarded_or_pending`

## 结论

`R2-U PolicyPlan contract reorder` 当前仍不能开 implementation line。  
相比上一版 design package，当前进展是 `D1/D2/D3/D4` 已形成最小 trigger bundle；剩余阻塞只剩外部 `SLA-R2` 输入未提供。

## trigger package 状态（已补齐）

### D1 · `SLA-R2-*` 模板

- 已落盘：`docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`（`SLA-R2-TEMPLATE-v1`）
- 占位实例：`SLA-R2-EXT-001`
- 当前状态：`pending_external_input`

### D2 · `Gap-R2-*` 模板

- 已落盘：`docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`（`Gap-R2-TEMPLATE-v1`）
- 草稿实例：`Gap-R2-DRAFT-001`
- 当前状态：`draft_ready_waiting_sla_binding`

### D3 · migration bundle 绑定包

- 已落盘：`docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`（`MigrationBundle-R2U-v1`）
- 当前状态：`bound_to_trigger_bundle_v1`
- 绑定内容：旧入口到 `txnLanePolicyPlan.profiles + binding` 映射草案、诊断字段最小集合、固定验证命令。

### D4 · `Gate-E` 开线裁决草稿

- 已落盘：`docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`（`Gate-E-R2U-DRAFT-v1`）
- 当前状态：`draft_ready_waiting_trigger`
- 关键约束：`override=否`，待 `SLA-R2-EXT-001` 转为 accepted 后再重评。

## 当前唯一阻塞（未满足项）

外部 `SLA-R2-EXT-001` 的实值字段未提供：

- `owner`
- `scope`
- `metric`
- `measurement_anchor`
- `load`
- `why_public_surface`

在该输入缺失期间，`Gate-A/B` 无法从草稿态升级为 accepted，`Gate-E` 不得 override。

## Gate 状态快照（本轮）

- `Gate-A`: `pending_external_sla_input`
- `Gate-B`: `draft_ready_waiting_sla_binding`
- `Gate-C`: `pass(clear_unstable + edge_gate_noise excluded from R-2 semantics)`
- `Gate-D`: `bound_to_trigger_bundle_v1`
- `Gate-E`: `draft_ready_waiting_trigger`

## 实施线最小验证命令（冻结版）

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

口径说明：
- 前两条负责 public surface 与 runtime contract。
- `probe_next_blocker` 负责 non-regression 与 comparability 记录。

## 开线准入条件（implementation-ready 定义）

只有当以下条件同时满足，才可开 `R2-U` 实施线：

- 外部 `SLA-R2-EXT-001` 输入完整并升级为 accepted
- `Gap-R2-DRAFT-001` 与 accepted SLA 绑定后升级为 accepted
- `Gate-E` 草稿重评后转为 `override=是`
- `Gate-C` 继续保持可比

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮不改 `packages/**`。
- 本轮推进 trigger bundle 与 routing 口径对齐。
