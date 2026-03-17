# 2026-03-20 · R-2 public API proposal（docs/evidence-only）

> 后续状态更新（2026-03-22 同日）：方向已收敛为 `R2-U PolicyPlan contract reorder`，且已补齐 dated design package。当前仍 `implementation-ready=false`，见 `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`。

> worktree: `v4-perf.r2-api-proposal`  
> branch: `agent/v4-perf-r2-api-proposal`  
> 范围：只做 proposal 收益论证与口径收口；不实施 public API 改动。
> staging plan：`docs/perf/2026-03-21-r2-public-api-staging-plan.md`

## 0. 目标与边界

本文件只回答四件事：

1. 什么触发门成立时值得改 API。
2. 最小 proposal 应该长什么样。
3. 收益面与风险面如何对齐。
4. forward-only 前提下的迁移口径是什么。

执行边界：

- 仅允许 `docs/perf/**` 与 `specs/103-effect-v4-forward-cutover/perf/**` 落盘。
- 不进入 `packages/**`，不做 `Runtime.ts` / `ModuleRuntime.txnLanePolicy.ts` 实装。
- 不回到 queue-side 微调线。

## 1. 当前吸收状态（避免口径冲突）

`R-2` 在母线已吸收的事实：

- `R2-A` 最小 surface 实现：`docs/perf/archive/2026-03/2026-03-20-r2a-policy-surface-impl.md`
- `R2-B` contract 与实现：`docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`、`docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-impl.md`
- widening：`docs/perf/archive/2026-03/2026-03-20-r2-rollout-widening.md`
- synergy：`docs/perf/archive/2026-03/2026-03-20-r2-controlplane-synergy.md`

因此本轮定位是“public API proposal watchlist 收口”，不重做已吸收实现。

## 2. 触发门（全部满足才开 API 实施线）

Gate-A/B 的“最低触发形态”与开线流程细化见：
- `docs/perf/2026-03-21-r2-gate-ab-trigger-scout.md`

### Gate-A · 产品级 SLA 触发

需要有明确、可引用的产品目标，且目标要求“策略语义可配置”，示例：

- 把页面外 admission 税纳入正式预算。
- 需要对外暴露多档策略，供业务按场景切换。

没有该类目标时，维持 docs/evidence-only。

### Gate-B · 证据缺口触发

需要证明“仅靠现有内部 widening 无法满足目标”：

- 现有 `tier/resolvedBy/effective` 诊断链路已不足以支撑目标解释。
- 继续只改内部 contract 会导致重复改口或高排障成本。

没有该类证据时，不开 public API 实施线。

### Gate-C · 可比性触发（硬门）

开线前必须有一次环境健康、结论可比的 `probe_next_blocker --json`：

- `failure_kind` 不能是 `environment`。
- 结果可用于 current-head 裁决。

本轮口径分两段：

- `2026-03-20` 首轮证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-public-api-proposal.probe-next-blocker.json`（`failure_kind=environment`，只用于记录环境阻塞）。
- `2026-03-21` 独立复核证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json` ~ `r7.json`，结果为 `4 clear + 3 blocked`，且 `blocked` 全部集中在 `externalStore.ingest.tickNotify / full/off<=1.25`。

当前判定：`Gate-C` 的可比性触发已满足，阈值摆动继续归入 `edge_gate_noise`，不单独阻塞 `R-2`。

### Gate-D · 迁移就绪触发

需要预先冻结迁移材料：

- 旧字段到新字段的机械映射表。
- 一次性迁移说明与验收清单。
- 受影响调用点范围盘点。

未完成时，只能继续 proposal 收口。

## 3. 最小 proposal 形态（implementation-ready 草案）

最小 public surface：

```ts
type TxnLanePolicyTier = 'off' | 'sync' | 'interactive' | 'throughput'

type TxnLanePolicyInput = {
  readonly tier: TxnLanePolicyTier
  readonly tuning?: {
    readonly budgetMs?: number
    readonly debounceMs?: number
    readonly maxLagMs?: number
    readonly allowCoalesce?: boolean
    readonly yieldStrategy?: 'baseline' | 'inputPending'
  }
}

stateTransaction: {
  txnLanePolicy?: TxnLanePolicyInput
  txnLanePolicyOverridesByModuleId?: Readonly<Record<string, TxnLanePolicyInput>>
}
```

最小 contract 约束：

- `tier` 是对外语义主键，`tuning` 只做有限覆盖。
- 诊断事件继续沿用 `R2-B` 字段族，至少保留：
  - `effective.tier`
  - `explain.resolvedBy.tier`
  - `explain.scope`
- 不引入第二真相源，策略解释以 `trace:txn-lane` 为单一对外口径。

最小验证命令（供触发后实施线使用）：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

## 4. 收益面 / 风险面

| 维度 | 收益面 | 风险面 |
| --- | --- | --- |
| 语义统一 | SLA、配置、诊断共享同一策略术语 | tier 命名过早冻结后可能二次改口 |
| 运维与排障 | `effective + resolvedBy` 可直接解释“谁生效” | API 面扩大后，排障需要覆盖新旧调用点 |
| 演进效率 | 后续策略扩展聚焦在 tier/tuning 层 | 一旦触发实现，文档与调用点需要同步重写 |
| 证据治理 | 触发门把“可比性”前置，减少误判 | 环境不健康时容易卡在“无法下硬结论” |

## 5. 迁移口径（forward-only）

迁移原则：

- 采用 forward-only：不提供兼容层，不设置弃用期。
- 用“一次迁移说明 + 一次验证闭环”替代向后兼容。

最小映射口径：

- `overrideMode=forced_off` -> `tier='off'`
- `overrideMode=forced_sync` -> `tier='sync'`
- `enabled=true` 且显式参数 -> `tier='interactive' + tuning`
- 吞吐取向配置 -> `tier='throughput' + tuning`

迁移步骤：

1. 冻结 proposal 与迁移映射表。
2. 独立 worktree 实施，单提交收口（实现 + 证据 + 文档）。
3. 用统一验证命令跑通后，再把结果回写 `06/07/README`。

## 6. 本轮裁决

- 结论：`本轮不启动 public API 实施线`。
- 原因：`Gate-A/B` 仍未触发；虽然 `Gate-C` 已拿到可比样本，但不足以单独推动开线。
- watchlist 状态：`R-2 public API proposal watchlist（保留）`。
- reopen 条件：
  1. 满足 Gate-A + Gate-B。
  2. 按 staging plan 完成 Gate-E 开线裁决并进入独立实施线。

## 7. 与现有文档的关系

- 本文件是 `R-2 public API proposal` 的主口径。
- 从 proposal 升级到实施线的阶段 gate、迁移步骤、验收清单，统一以 `docs/perf/2026-03-21-r2-public-api-staging-plan.md` 为执行口径。
- `docs/perf/2026-03-19-identify-txnlane-api.md` 保留为 identify 总览，并路由到本文。
- `docs/perf/07-optimization-backlog-and-routing.md` 继续作为 backlog 真相源，只保留路由与触发纪律。
