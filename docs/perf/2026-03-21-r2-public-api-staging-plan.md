# 2026-03-21 · R-2 public API staging plan（docs/evidence-only）

> 后续状态更新（2026-03-22 同日）：`R2-U` 已补齐 dated design package。当前状态仍是 `Gate-A/B/E pending`、`implementation-ready=false`，见 `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`。

> 本文是 `docs/perf/2026-03-20-r2-public-api-proposal.md` 的执行续篇，只负责 gate、迁移准备、验收清单与开线判定。public API 的动机、收益/风险、最小 schema 与迁移映射表以 proposal 为准。

## 0. 目标与边界

- 目标：把“何时值得改 TxnLanePolicy public API”收敛成可执行 gate，避免在缺少 SLA 与缺口证据时进入 `packages/**` 改口。
- 范围：只允许在 `docs/perf/**` 与 `specs/103-effect-v4-forward-cutover/perf/**` 落盘；实现工作只在 Gate 全部通过后另开 worktree 推进。

## 1. 交叉引用（必须一致）

- identify 总览：`docs/perf/2026-03-19-identify-txnlane-api.md`
- proposal 主口径：`docs/perf/2026-03-20-r2-public-api-proposal.md`
- Gate-A/B 触发细化：`docs/perf/2026-03-21-r2-gate-ab-trigger-scout.md`
- current-head 证据锚点：`docs/perf/06-current-head-triage.md`
- backlog 真相源：`docs/perf/07-optimization-backlog-and-routing.md`
- 开线模板：`docs/perf/09-worktree-open-decision-template.md`
- `v4-perf@fc0b3e3e` 基线工件：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-public-api-staging-plan.probe-next-blocker.json`
- 本轮独立复核 wave 工件：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json` ~ `r7.json`

## 2. Gate-A..E：定义与通过标准

1. Gate-A（产品级 SLA 触发）
   - 通过标准：存在可引用的产品目标，且该目标要求“对外可配置的 TxnLanePolicy 策略语义”。

2. Gate-B（证据缺口触发）
   - 通过标准：有可复述的证据证明当前内部 widening 与诊断链路不足以解释目标，继续靠 widening 会引入反复改口或显著排障成本。

3. Gate-C（可比性与相关性硬门）
   - 通过标准：至少一次 `python3 fabfile.py probe_next_blocker --json` 满足：
     - `failure_kind` 不为 `environment`。
     - 若 `status=blocked`，阻塞原因与 `txnLanes/TxnLanePolicy` 的策略语义直接相关。
     - 更强标准：`status=clear` 且 `threshold_anomalies=[]`，作为“可对比基线清空”的优先形态。

4. Gate-D（迁移就绪冻结）
   - 通过标准：迁移材料冻结，至少包含：
     - 旧字段到新 tier/tuning 的机械映射表。
     - 一次性迁移说明与验收清单。
     - 诊断字段族的最小稳定集合与解释口径。

5. Gate-E（开线裁决与单提交收口）
   - 通过标准：按 `09` 模板完成 `override=是` 的开线裁决，且明确：
     - 新 worktree 的目标、验证命令、成功门与失败门。
     - 交付物以单个最终 HEAD commit 收口（实现 + 文档 + 证据）。

## 3. 当前 Gate 状态（2026-03-21）

- Gate-A：未触发，当前没有新产品级 SLA。
- Gate-B：未触发，当前缺口证据不足以推动改 public API。
- Gate-C：通过（`clear_unstable`）。独立复核 7 轮结果为 `4 clear + 3 blocked`，且 `blocked` 全部来自 `externalStore.ingest.tickNotify / full/off<=1.25` 的阈值摆动，与 `TxnLanePolicy` public surface 无直接相关；该漂移不足以单独阻塞 `R-2` 实施线。
- Gate-D：已具备。tier/tuning 映射、迁移步骤与验收命令已在 proposal 中冻结。
- Gate-E：未执行，当前仍维持 docs/evidence-only 收口。

## 4. Probe 证据摘要（Gate-C）

- 基线（`v4-perf@fc0b3e3e`）：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-public-api-staging-plan.probe-next-blocker.json`
  - 结果：`status=blocked`，`failure_kind=threshold`，阻塞点 `externalStore.ingest.tickNotify / full/off<=1.25`
- 独立复核 wave（`2026-03-21`，7 轮）：
  - `r1/r3/r6/r7 = clear`
  - `r2/r4/r5 = blocked`，`failure_kind=threshold`
  - `threshold_anomalies[].budget_id` 全部是 `full/off<=1.25`
  - `first_fail_level` 只出现在 `128` 或 `256`
- 相对基线裁决：单点 `blocked` 已被多轮可比样本覆盖，当前应按 `clear_unstable + edge_gate_noise` 解读；该阈值漂移不作为 `R-2` 的阻塞门。

## 5. 迁移步骤（forward-only）

迁移原则与最小映射口径以 proposal 为准，这里只固化可执行步骤：

1. 以 proposal 的映射表为输入，冻结最终 public surface 的 `tier` 与 `tuning` 字段集合。
2. 盘点受影响调用点与文档入口，迁移只允许一次性完成，不引入兼容层与弃用期。
3. 诊断事件字段族冻结，至少保留 `effective.tier` 与 `explain.resolvedBy.tier`，解释链以 `trace:txn-lane` 为唯一对外真相源。
4. 在新 worktree 内完成实现与回写，且同一提交内完成：
   - 代码变更
   - 文档更新（含 `06/07/identify/proposal/README` 的交叉引用核对）
   - 证据工件（PerfReport/PerfDiff 或 probe JSON）

## 6. 验收清单（开线后必须全部通过）

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- `python3 fabfile.py probe_next_blocker --json`
- `docs/perf/09-worktree-open-decision-template.md` 的单提交收口门满足

## 7. 开线判定（Go/No-Go）

- Go：Gate-A..E 全部通过。
- No-Go：当前因 `Gate-A/B` 未触发且 `Gate-E` 未执行，维持 docs/evidence-only，并在 `docs/perf/07-optimization-backlog-and-routing.md` 保持 watchlist 状态，不进入实现线。
