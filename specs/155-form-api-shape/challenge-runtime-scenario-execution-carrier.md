# Runtime Scenario Execution Carrier

**Role**: `TRACE` 的 active residual 子挑战  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-runtime-scenario-compare-substrate.md](./challenge-runtime-scenario-compare-substrate.md)

## Why Now

`TRACE` 父页已经降级成 umbrella router。

当前最先需要补齐的，不是 compare truth，而是 `runtime.trial(mode="scenario")` 的 runtime-owned execution carrier：

- `fixtures/env + steps + expect` 如何进入内部 compiled plan
- scenario read points 如何挂接
- evidence refs 如何发射
- row-heavy fixture identity 如何保持
- benchmark 如何直接复用同一执行载体

这一层没有收口，后续 compare truth 会缺稳定 producer。

## Challenge Target

在固定 `AC3.3 / S1 / S2 / C003 / TRACE-S1 / TRACE-S2 / TRACE-S3 / runtime control plane` 的前提下，定义最小 `runtime.trial(mode="scenario")` execution carrier：

> runtime 如何把 `fixtures/env + steps + expect` 编译成 single-owner scenario carrier，使 scenario read points、evidence refs emit、row-heavy fixture identity、benchmark reuse 落在同一内部载体

## Current Verdict

- adopted subcandidate：`TRACE-S4 scenario execution carrier law`
- current verdict：`freeze-ready`
- frozen law：
  - `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession`
  - owner 固定为 runtime control plane，停在 `internal/verification/**`
  - `ScenarioCompiledPlan` 承载 stable plan、read bindings、emit policy 与 cache key
  - `ScenarioRunSession` 承载 materialized env、live heads、evidence buffer、artifact buffer 与 step results
  - `sourceReceiptRef / derivationReceiptRef / bundlePatchRef` 当前属于 run session，默认 run-local，不跨 run 复用
  - scenario carrier 只输出 `ScenarioCarrierEvidenceFeed`
  - carrier 禁止输出 compare-ready normalized summary、digest、diff、focusRef 或第二 report shell
  - row-heavy identity 以 `ownerRef + canonicalRowIdChainDigest` 为主锚点
  - benchmark 只能复用 compiled plan、fixture identity grammar、scenario read-point map、evidence emit-point map
- current residual：
  - `compare truth substrate` 仍待冻结
  - exact internal type shape 继续 deferred
  - implementation substrate 仍待后续代码落地与 benchmark 验证

## Fixed Baseline

下面这些内容在本轮全部冻结：

- `AC3.3` public contract
- `S1 / S2 / C003` 已冻结 law
- `TRACE-S1 causal-links summary law`
- `TRACE-S2 row-level summary diff substrate law`
- `TRACE-S3 deterministic opaque id admission law`
- `runtime.trial(mode="scenario")` 的公开输入协议仍固定为 `fixtures/env + steps + expect`
- `runtime.compare` owner 不在本轮重开
- 不新增第二 diagnostics truth
- 不把 scenario carrier 推回公开 authoring surface
- 不冻结 exact proof object

## Success Bar

要想本轮通过，必须同时满足：

1. 写清 scenario internal carrier 的唯一 owner
2. 将 `ScenarioExecutionCarrier` 分成 stable `ScenarioCompiledPlan` 与 run-local `ScenarioRunSession`
3. 写清 `fixtures/env + steps + expect` 到 compiled plan 的最小映射
4. 写清 `source / lower / bundle patch / reason backlink` 的 evidence emit points
5. 写清 `ScenarioCarrierEvidenceFeed` 的内部 handoff contract
6. 能覆盖 `implementation trace evidence pack` 的最小 proof pack
7. row-heavy fixture identity 在 `reorder / replace / byRowId / active exit` 下可稳定复用
8. benchmark 只能复用 compiled plan 与 fixture identity grammar，不承接 perf truth
9. 不长第二 report truth、第二 helper family、第二 scenario authoring lane

## Required Questions

### Q1. Carrier Boundary

- scenario execution carrier 的最小内部单元是什么
- compiled plan 由哪些 stable parts 组成
- run session 由哪些 run-local parts 组成
- 哪些运行细节只能停在内部，不进入 report truth

### Q2. Evidence Emit Points

- `sourceReceiptRef / derivationReceiptRef / bundle patch lineage / reason backlink` 在哪一层发射
- 哪些 emit points 必须在 scenario runtime 内固定
- 哪些只允许留给 compare 或 raw drill-down

### Q3. Fixture Identity

- row-heavy fixture 的 identity truth 如何保存
- `reorder / replace / byRowId / active exit` 需要哪些最小 fixture atoms
- compiled plan 如何避免把 render order 当身份

### Q4. Benchmark Reuse

- benchmark 如何复用同一 compiled plan
- 哪些 fixture identity 必须跨验证与 perf 共用
- 哪些输入变化会使 compiled plan 失效

### Q5. Handoff Boundary

- scenario carrier 至少要向 compare 暴露哪些 producer feed
- 哪些输出必须继续停在 raw drill-down
- 哪些字段必须留给 `compare truth substrate`
- 如何避免长第二 report shell

## Candidate Contract Delta

### ScenarioExecutionCarrier

`ScenarioExecutionCarrier` 暂按下面两层继续收口：

- `ScenarioCompiledPlan`
  - stable half
  - runtime control plane 持有
  - 停在 `internal/verification/**`
  - 最小 stable parts：
    - `declarationBindings`
    - `fixtureProgram`
    - `stepProgram`
    - `expectProgram`
    - `scenarioReadBindings`
    - `emitPolicy`
    - `planCacheKey`
- `ScenarioRunSession`
  - run-local half
  - 每次 trial 都新建
  - 最小 run-local parts：
    - `materializedEnv`
    - `fixtureInstanceTable`
    - `liveBundleHeadTable`
    - `evidenceEnvelopeBuffer`
    - `artifactBuffer`
    - `stepResults`

`sourceReceiptRef / derivationReceiptRef / bundlePatchRef` 当前只属于 run session，不得跨 run 复用。

### ScenarioCarrierEvidenceFeed

scenario carrier 不输出 compare-ready normalized summary，也不只输出 raw observations。

最小内部 handoff packet 暂按 `ScenarioCarrierEvidenceFeed` 收口：

- `declarationCoordinate`
  - 透传 `declarationDigest / declSliceId`
  - carrier 不重算 declaration truth
- `scenarioCoordinate`
  - `compiledPlanDigest`
  - `scenarioPlanDigest`
  - `scenarioStepId[]`
  - read-point map
- `fixtureIdentity`
  - `fixtureIdentityDigest`
  - `ownerRef`
  - `canonicalRowIdChainDigest`
  - row lookup atoms
- `evidenceRefs`
  - 按 `source / lower / bundle patch / reason backlink / read point / expect` 发射 typed refs
  - 可携带 `declSliceId / ownerRef / scenarioStepId / reasonSlotId / canonicalRowIdChainDigest / transition / retention`
- `refAdmissionClass`
  - 只标注 `stableCore / candidateStable / runLocalDebug`
  - 最终 admission 交给 `compare truth substrate`
- `rawObservationRefs`
  - 只给 artifact 或 evidence envelope ref
  - 只用于 drill-down
- `environment`
  - `environmentFingerprint`
  - 受控 override digest
  - 用于后续 compare 判定 `INCONCLUSIVE`
- `benchmarkReuse`
  - `compiledPlanDigest`
  - `fixtureIdentityDigest`
  - `invalidationReason[]`

### Fixture Identity Law

row-heavy scenario 通过验收，当且仅当同一个 internal compiled scenario plan 能证明：

- `reorder` 不产生新 lineage
- `replace` 终止旧 row chain，并创建 fresh chain
- `byRowId` 只按 canonical row identity 命中
- `active exit` 只产生 terminal proof 与 no-live-head
- row-scoped proof 或 summary row 缺 `canonicalRowIdChainDigest` 时直接视为 proof failure
- render order、index、run-local ref 不得参与 key、ordering、digest、focusRef

执行含义：

- `compiledScenarioPlan` 内部持有唯一 `FixtureIdentityTable`
- `FixtureIdentityTable` 由 runtime control plane 持有，不进入公开 authoring surface
- row identity 的最小事实锚点是 `ownerRef + canonicalRowIdChainDigest`
- `declSliceId / reasonSlotId / scenarioStepId / stableSourceToken` 只能作为投影或辅助定位
- `reorder` 只能改变观察顺序
- `replace` 必须表现为旧 chain `retire/noLiveHead`，新 chain fresh `write/head`
- `active exit` 必须产生 `retire`
- cleanup 只能作为 subordinate backlink

### Benchmark Reuse Law

benchmark reuse 只归 scenario carrier 的执行载体复用，不归 scenario carrier 的性能真相。

暂定 law：

- benchmark 只能复用 `ScenarioCompiledPlan + FixtureIdentityTable + scenario read-point map + evidence emit-point map`
- benchmark 不得新增 perf-only fixture identity、perf-only steps、perf-only expect、perf-only report shell
- 每次 benchmark run 都新建 `ScenarioRunSession`
- 共享的是 plan 和 row-truth grammar，不共享 live heads、opaque refs、evidence buffers
- perf truth、budget、统计口径、跨 run 可比性后续归 compare truth 或 perf docs

### Compare Boundary

scenario carrier 禁止输出：

- `rowStableKey`
- `rowComparablePayload`
- `evidenceSummaryDigest`
- `firstDiff`
- `firstProjectableDiff`
- `repairHints.focusRef`
- `sourceRef priority`
- 第二 report shell

`compare truth substrate` 继续拥有：

- stable admission
- summary normalization
- digest
- diff
- focusRef
- repair hints

## Expected Outputs

- 一个最小 scenario execution carrier contract
- 一个 scenario read-point / evidence emit-point map
- 一个 `ScenarioCarrierEvidenceFeed` handoff contract
- 一个 row-heavy fixture identity law
- 一个 benchmark reuse law
- 一个清晰 handoff，指向后续 `compare truth substrate`
- 若仍不够，明确 blocker

## Writeback Targets

- challenge queue：`discussion.md`
- parent challenge：`challenge-runtime-scenario-compare-substrate.md`
- related pack：`[challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-execution-carrier.md`
