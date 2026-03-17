# 2026-03-19 · Identify · R-2 TxnLanePolicy API 收敛（future-only）

实现与设计收口落点：
- `docs/perf/archive/2026-03/2026-03-19-r2-policy-surface-design.md`
- `docs/perf/archive/2026-03/2026-03-20-r2a-policy-surface-impl.md`
- `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`
- `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-impl.md`
- `docs/perf/archive/2026-03/2026-03-20-r2-rollout-widening.md`
- `docs/perf/archive/2026-03/2026-03-20-r2-controlplane-synergy.md`
- `docs/perf/2026-03-20-r2-public-api-proposal.md`
- `docs/perf/2026-03-21-r2-public-api-staging-plan.md`

## 结论

当前结论：`R-2` 已进入“部分吸收 + 协同 widening 已继续吸收 + public API proposal watchlist”状态。  
理由：`R2-A` 最小 tier-first surface、`R2-B` 诊断实现、provider rollout/widening、以及 `r2-controlplane-synergy`（tier/resolvedBy/effective 一致性）都已入母线，当前不再是纯设计阶段。

补充：public API proposal 的触发门、最小形态、收益/风险以 `docs/perf/2026-03-20-r2-public-api-proposal.md` 为准；分阶段 gate、迁移步骤、验收清单与开实施线判定统一以 `docs/perf/2026-03-21-r2-public-api-staging-plan.md` 为准。

证据锚点：
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/09-worktree-open-decision-template.md`
- `docs/perf/2026-03-19-current-probe-stability-v2.md`
- `docs/perf/archive/2026-03/2026-03-19-p0-2plus-hot-context.md`

## Top2 候选题目（仅在 trigger 成立后可开）

### Top1 · `R2-A` 高层 Policy Surface 最小收敛

状态更新：
- 已实现最小版，见 `docs/perf/archive/2026-03/2026-03-20-r2a-policy-surface-impl.md`

题目边界：
- 只收敛 TxnLanePolicy 对外契约命名与语义层级。
- 目标是把“预算旋钮集合”提升成“策略档位 + 可解释覆盖来源”。
- 保持 runtime 内部执行路径不动，先做 API surface 与映射层。

依赖 trigger：
1. 新的产品级 SLA 明确要求把页面外 admission 税纳入预算，且需要对外可配置的策略层。
2. 或者新的 native-anchor 证据要求长期维护多档策略。

正面收益：
- 对外配置从参数组合变成策略语义，降低误配成本。
- 文档、诊断事件、SLA 讨论使用同一套术语，减少解释漂移。
- 后续 lane 调优可以在策略层扩展，不需要反复暴露细粒度旋钮。

反面风险：
- API 变动面较大，影响 `Runtime.stateTransaction.txnLanes` 与相关文档。
- 若 SLA 目标仍不稳定，策略命名可能过早固化，后续会二次改口。

是否需要 API 变动：`需要（必选）`

最小验证命令：
```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

### Top2 · `R2-B` 覆盖优先级与诊断口径收敛（先内核后表层）

题目边界：
- 维持现有 API 输入形态，先统一“provider/runtime_module/runtime_default/builtin”覆盖来源的可解释协议。
- 把 `configScope + overrideMode + queueMode` 的证据字段收敛成稳定诊断契约。
- 只在内部 resolver 与诊断层推进，表面 API 暂不扩。

状态更新：
- `R2-B` contract 与最小实现都已落地，见：
  - `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`
  - `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-impl.md`
- `r2-controlplane-synergy` 已继续吸收，见：
  - `docs/perf/archive/2026-03/2026-03-20-r2-controlplane-synergy.md`

依赖 trigger：
1. 新的 clean/comparable 证据显示 lane 行为解释成本高，排障效率下降。
2. 或者 devtools/diagnostics 链路出现无法判定“谁覆盖了谁”的失真。

正面收益：
- 不先改 public surface，也能提升可诊断性与策略可解释性。
- 可作为 `R2-A` 的前置清障线，降低后续 API 变动风险。

反面风险：
- 对最终产品能力提升有限，单独开线的业务感知弱。
- 若没有明确诊断痛点，容易变成“内部整洁性”驱动，收益不显著。

是否需要 API 变动：`默认不需要（可选）`

最小验证命令：
```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

## 唯一建议下一线

唯一建议：`当前维持 R-2 public API proposal watchlist；按 staging plan 逐门通过后再开实施线。`

触发门：
1. 明确新增产品级 SLA，且该 SLA 需要对外 policy surface。
2. 同时完成一次 clean/comparable `probe_next_blocker --json` 复测，结论可解释且环境正常。
3. 证明仅靠内部 control surface widening 无法满足目标收益。

未触发前动作：
- 维持 docs/evidence-only。
- 不进入 `ModuleRuntime.txnLanePolicy.ts` 与 `Runtime.ts` 的 API 重构。

## 是否建议后续开实施线

当前：`已部分实施`。  
后续：`条件建议`，仅在 trigger 全部满足时推进实现；未满足前保持 docs/evidence-only。
