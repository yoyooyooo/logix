# Runtime Benchmark Evidence

**Role**: `TRACE` 的实现期 next residual 子挑战  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)

## Why Next

`benchmark evidence` 只能在 executable proof 之后推进。  
当前它只承接一件事：

> 复用已通过 proof gate 的 scenario inputs，建立 baseline / compare / budget / environment comparability 的性能证据

当前 whitelist 的长期来源统一看 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的 `WF6 / W*` projection。
当前 empirical lane 明确后置，直到 `TRACE-I1` 的 executable proof 路线真实跑通。

## Current Freeze

- adopted subcandidate：`TRACE-I2 benchmark evidence law`
- current verdict：`freeze-ready`
- frozen law：
  - benchmark lane 严格绑定到上游 `TRACE-I1` 的 execution whitelist
  - 非 whitelist case 不得进入 perf lane
  - comparability hard gate 固定为：
    - 同一 whitelist case
    - `compiledPlanDigest` 全等
    - `fixtureIdentityDigest` 全等
    - scenario read-point map 全等
    - evidence emit-point map 全等
    - `environmentFingerprint` 全等
    - controlled override digest 全等
    - `invalidationReason[]` 不命中 disallowed 变化
  - benchmark matrix 固定为：
    - `scenarioCaseId`
    - `runRole`
    - `profileId`
    - `environmentFingerprint`
  - benchmark-specific machine-readable outputs 只允许通过 `artifacts[] + outputKey` 暴露
  - benchmark 继续只回到单一 `VerificationControlPlaneReport`
  - budget / environment / scenario / invalidation 都已有唯一 `verdict / errorCode / nextRecommendedStage`
  - benchmark 不新增 `mode="benchmark"`、第二 stage、第二 report shell、第二 truth channel
- current residual：
  - actual benchmark runs 与 empirical budget evidence 仍待实现期验证
  - exact perf profile catalog 继续 deferred
  - implementation code 仍待落地

## Fixed Baseline

下面这些内容在本轮预先冻结：

- `AC3.3` public contract
- `S1 / S2 / C003` 已冻结 law
- `TRACE-S1 .. TRACE-S5` 已冻结 law
- 上游 `implementation proof execution` 收口结果
- benchmark 只允许复用 execution carrier
- benchmark 不得创建第二验证 lane
- benchmark 不得重写 truth contract
- benchmark 继续只回到单一 `VerificationControlPlaneReport`
- benchmark 不新增 `mode="benchmark"` 或第二 report shell
- top-level `verdict` 继续只认 `PASS / FAIL / INCONCLUSIVE`
- `errorCode / nextRecommendedStage` 继续是必填壳层字段
- benchmark-specific machine-readable outputs 只允许通过 `artifacts[] + outputKey` 暴露

## Success Bar

要想本轮通过，至少要同时满足：

1. 复用同一 compiled plan、fixture identity grammar、scenario proof roster
2. baseline、compare、environment fingerprint、invalidation reason 可稳定记录
3. correctness truth 与 perf evidence 分开落盘
4. 至少形成一组可复跑 baseline 和一组 compare / budget 结果
5. 非 whitelist case 不得进入 perf lane
6. budget fail、environment drift、scenario drift 都有唯一 verdict / errorCode / nextRecommendedStage

## Required Questions

### Q1. Benchmark Matrix

- benchmark matrix 的最小维度是什么

### Q2. Comparability Gate

- 什么条件下 baseline / compare 才可比

### Q3. Failure Policy

- budget fail、environment drift、scenario drift 分别如何处理

### Q4. Output Contract

- perf evidence 至少要输出哪些 machine-readable fields

## Candidate Contract Delta

### Scenario Whitelist Law

benchmark 当前只允许消费上游 `TRACE-I1` 已冻结的 `benchmark-admissible scenario set`。

非 whitelist case 当前一律不得进入 perf lane。

这条 whitelist 当前也是 `06` 主场景矩阵的 benchmark side projection，并由 `scenario-proof-family.md` 在 `155` 下投影说明。

whitelist 至少固定为：

- `compiledPlanDigest`
- `fixtureIdentityDigest`
- scenario proof roster id
- scenario read-point map
- evidence emit-point map
- `invalidationReason[]`

### Comparability Gate

两个 benchmark runs 只有同时满足下面条件，才允许进入 compare / budget：

- 命中同一 scenario whitelist case
- `compiledPlanDigest` 相同
- `fixtureIdentityDigest` 相同
- scenario read-point map 相同
- evidence emit-point map 相同
- `environmentFingerprint` 全等
- 受控 override digest 全等
- `invalidationReason[]` 不命中 disallowed 变化

当前 disallowed invalidation 至少包括：

- `declaration-digest-changed`
- `fixture-identity-changed`
- `scenario-read-map-changed`
- `evidence-emit-map-changed`
- `scenario-step-graph-changed`
- `expect-graph-changed`

### Environment Gate

`environmentFingerprint` 当前只作为 comparability gate 输入，不回流成 correctness truth。

environment drift 当前默认走：

- `verdict = INCONCLUSIVE`
- `errorCode = "environment_drift"`
- `nextRecommendedStage = "trial"`

### Budget / Scenario Failure Policy

benchmark 当前只固定下面三类 failure policy：

- `budget fail`
  - `verdict = FAIL`
  - `errorCode = "budget_exceeded"`
  - `nextRecommendedStage = null`
- `scenario drift`
  - `verdict = INCONCLUSIVE`
  - `errorCode = "scenario_invalidated"`
  - `nextRecommendedStage = "trial"`
- `missing comparable baseline`
  - `verdict = INCONCLUSIVE`
  - `errorCode = "baseline_missing"`
  - `nextRecommendedStage = "trial"`

下面两类当前也固定为唯一 policy：

- `non-whitelist case`
  - `verdict = INCONCLUSIVE`
  - `errorCode = "scenario_not_whitelisted"`
  - `nextRecommendedStage = null`
- `disallowed invalidation`
  - `verdict = INCONCLUSIVE`
  - `errorCode = "benchmark_input_invalidated"`
  - `nextRecommendedStage = "trial"`

### Output Contract

benchmark 继续只回到单一 `VerificationControlPlaneReport`。

top-level mandatory fields 继续固定为：

- `kind="VerificationControlPlaneReport"`
- `stage="compare"`
- `mode="compare"`
- `verdict`
- `errorCode`
- `summary`
- `environment`
- `artifacts`
- `repairHints`
- `nextRecommendedStage`

benchmark-specific machine-readable outputs 只允许通过 `artifacts[]` 暴露。

当前允许的 artifact-backed outputs 至少包括：

- `benchmark-baseline`
- `benchmark-compare`
- `benchmark-budget`
- `benchmark-comparability`

每个 artifact 必须带 `outputKey`。  
若 `repairHints[].relatedArtifactOutputKeys` 存在，只允许引用 `artifacts[]` 中的 `outputKey`。

当前最小 machine-readable fields 固定为：

- `benchmark-baseline`
  - `scenarioCaseId`
  - `profileId`
  - `compiledPlanDigest`
  - `fixtureIdentityDigest`
  - `environmentFingerprint`
  - `sampleCount`
  - `aggregate`
  - `unit`
- `benchmark-compare`
  - `baselineOutputKey`
  - `candidateOutputKey`
  - `delta`
  - `deltaPct`
  - `comparable`
- `benchmark-budget`
  - `budgetId`
  - `metric`
  - `threshold`
  - `actual`
  - `pass`
- `benchmark-comparability`
  - `comparable`
  - `reasons`
  - `invalidationReason[]`

### Benchmark Matrix Law

当前最小 benchmark matrix 固定为：

- `scenarioCaseId`
- `runRole`
  - `baseline`
  - `candidate`
- `profileId`
- `environmentFingerprint`

至少要求：

- 每个 whitelist case 至少一组 baseline runs
- 每个 whitelist case 至少一组 candidate runs
- 只有命中同一 `scenarioCaseId + profileId` 且通过 comparability gate 的 baseline/candidate 配对，才允许进入 budget

### No Perf-Truth Inflation

benchmark 当前禁止：

- 长第二 stage
- 长第二 report shell
- 改写 correctness verdict
- 改写 compare truth contract
- 把 perf metrics 回流成 companion / source / submit / diagnostics owner truth

## Expected Outputs

- 一个 benchmark evidence gate contract
- 一份 scenario whitelist
- 一份 comparability hard gate
- 一份 baseline / compare / budget 输出合同

## Writeback Targets

- challenge queue：`discussion.md`
- parent challenge：`challenge-implementation-trace-evidence-pack.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-benchmark-evidence.md`
