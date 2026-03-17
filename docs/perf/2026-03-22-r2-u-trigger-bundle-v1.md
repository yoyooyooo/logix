# 2026-03-22 · R2-U trigger bundle v1（SLA/Gap/migration/Gate-E）

## 目标与范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.r2-u-policyplan-v2`
- branch：`agent/v4-perf-r2-u-policyplan-v2`
- 写入范围：`docs/perf/**`、`specs/103-effect-v4-forward-cutover/perf/**`
- 禁区：`packages/**`

## 结论类型

- `docs/evidence-only`
- `implementation-ready=false`
- 结果分类：`discarded_or_pending`

## 核心结论

`R2-U` 的最小 trigger bundle 已落盘并完成交叉引用回写。当前剩余阻塞收敛为一项：外部 `SLA-R2` 实值输入尚未提供。  
在该输入到位前，`Gate-E` 仅保持草稿态，实施线继续不开。

## 1. Bundle 索引（v1）

- `SLA-R2-TEMPLATE-v1`：`Gate-A` 权威输入模板
- `Gap-R2-TEMPLATE-v1`：`Gate-B` 缺口证据模板
- `MigrationBundle-R2U-v1`：`Gate-D` 绑定包
- `Gate-E-R2U-DRAFT-v1`：开线裁决草稿

## 2. `SLA-R2-*` 模板（`SLA-R2-TEMPLATE-v1`）

### 2.1 模板

```md
## SLA-R2-<id>

- status: <draft | accepted>
- owner: <product or platform owner>
- scope: <user journey / business scope>
- metric:
  - <metric name>.<p95|p99> <= <budgetMs>ms
- measurement_anchor:
  - <capture -> handler -> domStable> 或等价分段
- load:
  - watchers: <range or fixed>
  - steps: <range or fixed>
- policy_requirement:
  - need multi-tier semantic selection: <yes/no>
  - need module overrides: <yes/no>
- why_public_surface:
  - <one sentence with business accountability>
- evidence_anchor:
  - <ssot/prd link or id>
```

### 2.2 当前占位实例（待外部输入）

```md
## SLA-R2-EXT-001

- status: pending_external_input
- owner: <待外部提供>
- scope: <待外部提供>
- metric: <待外部提供>
- measurement_anchor: <待外部提供>
- load: <待外部提供>
- policy_requirement:
  - need multi-tier semantic selection: yes
  - need module overrides: pending
- why_public_surface: <待外部提供>
- evidence_anchor: <待外部提供>
```

## 3. `Gap-R2-*` 模板（`Gap-R2-TEMPLATE-v1`）

### 3.1 模板

```md
## Gap-R2-<id>

- status: <draft | accepted>
- related_sla: <SLA-R2-id>
- symptom:
  - <what cannot be explained today>
- why_existing_widening_insufficient:
  - <one sentence>
- evidence:
  - <probe json / perf diff / trace export file>
- exclusion:
  - environment: <passed>
  - edge_gate_noise: <not this case>
- decision:
  - require public semantic tier: <yes/no>
```

### 3.2 当前草稿实例（待绑定外部 SLA）

```md
## Gap-R2-DRAFT-001

- status: draft_waiting_related_sla
- related_sla: SLA-R2-EXT-001
- symptom:
  - 运行期仍需双族输入 normalize 与字段级覆盖归因，热路径和解释链维护成本偏高
- why_existing_widening_insufficient:
  - widening 继续扩字段后仍无法给出稳定、可复用的策略语义入口
- evidence:
  - docs/perf/2026-03-22-r2-api-unify-direction-scout.md
  - docs/perf/2026-03-22-r2-u-policyplan-design-package.md
  - specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json ~ r7.json
- exclusion:
  - environment: passed
  - edge_gate_noise: excluded (Gate-C only)
- decision:
  - require public semantic tier: yes
```

## 4. migration bundle 绑定包（`MigrationBundle-R2U-v1`）

### 4.1 绑定目标

- proposal 基线：`docs/perf/2026-03-20-r2-public-api-proposal.md`
- staging 基线：`docs/perf/2026-03-21-r2-public-api-staging-plan.md`
- direction 基线：`docs/perf/2026-03-22-r2-api-unify-direction-scout.md`
- trigger 基线：本文件 + `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`

### 4.2 旧入口到新入口映射草案

| 旧入口 | 新入口（`txnLanePolicyPlan`） | 绑定说明 |
| --- | --- | --- |
| `stateTransaction.txnLanes` | `profiles.<runtime-default>` | 生成 runtime 默认 profile，并回写 `binding.runtimeDefault` |
| `stateTransaction.txnLanesOverridesByModuleId` | `profiles.<runtime-override-*>` + `binding.runtimeByModuleId` | 每个 moduleId 绑定到明确 profileId |
| `stateTransaction.txnLanePolicy` | `profiles.<provider-default>` | 生成 provider 默认 profile，并回写 `binding.providerDefault` |
| `stateTransaction.txnLanePolicyOverridesByModuleId` | `profiles.<provider-override-*>` + `binding.providerByModuleId` | 每个 moduleId 绑定到明确 profileId |

### 4.3 迁移包固定字段

- migration id：`R2U-MIGRATION-BUNDLE-v1`
- apply mode：`forward-only`
- compatibility layer：`none`
- diagnostics minimal set：
  - `trace:txn-lane.effective`
  - `trace:txn-lane.scope`
  - `trace:txn-lane.profileId`
  - `trace:txn-lane.fingerprint`
- verify baseline：
  - `pnpm -C packages/logix-core typecheck:test`
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
  - `python3 fabfile.py probe_next_blocker --json`

## 5. `Gate-E` 开线裁决草稿（`Gate-E-R2U-DRAFT-v1`）

```md
## Perf Worktree 开线裁决（R2-U 草稿）

- Date: 2026-03-22
- Base branch: `v4-perf`
- Current-head triage: `R-2 维持 watchlist，Gate-C 可比`
- Current routing: `R2-U 为唯一候选，先补 trigger bundle`

### Trigger

- Status: `不成立`
- Type: `new SLA (pending external input)`
- Evidence:
  - `docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`
  - `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json ~ r7.json`

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`否`
- 原因：`SLA-R2-EXT-001` 外部输入未完成，Gate-A/B 无法转为 accepted

### If Open（预填参数，仅供触发成立后复用）

- Worktree: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.r2-u-policyplan-impl`
- Branch: `agent/v4-perf-r2-u-policyplan-impl`
- Cut: `R2-U PolicyPlan contract reorder`
- Scope:
  - 改：`packages/logix-core/**`、`docs/perf/**`、`specs/103-effect-v4-forward-cutover/perf/**`
  - 不改：`packages/logix-react/**`、`packages/logix-sandbox/**`
- Verify:
  - `pnpm -C packages/logix-core typecheck:test`
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
  - `python3 fabfile.py probe_next_blocker --json`

### If Not Open

- 结论：`本轮不开新的 perf worktree`
- Watchlist only:
  - `R2-U PolicyPlan contract reorder`
- Reopen conditions:
  1. `SLA-R2-EXT-001` 补齐外部输入并升级为 accepted
  2. `Gap-R2-DRAFT-001` 绑定 accepted SLA 并升级为 accepted
```

## 6. Gate 快照（bundle 落盘后）

- `Gate-A`: `pending_external_sla_input`
- `Gate-B`: `draft_ready_waiting_sla_binding`
- `Gate-C`: `pass(clear_unstable + edge_gate_noise excluded from R-2 semantics)`
- `Gate-D`: `bound_to_trigger_bundle_v1`
- `Gate-E`: `draft_ready_waiting_trigger`

## 7. 当前唯一阻塞

外部输入 `SLA-R2-EXT-001` 的实值字段尚未提供（owner/scope/metric/measurement_anchor/load/why_public_surface）。  
其余 trigger 工件已具备模板、绑定关系和开线草稿。
