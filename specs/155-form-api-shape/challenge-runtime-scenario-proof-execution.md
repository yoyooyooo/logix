# Runtime Scenario Proof Execution

**Role**: `TRACE` 的实现期 active residual 子挑战  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)

## Why Now

`TRACE-S1 .. TRACE-S5` 已冻结。  
当前最先需要补齐的，是 executable proof 本身：

- `runtime.trial(mode="scenario")` 真执行出 proof
- `ScenarioCarrierEvidenceFeed` 真发出关键 refs
- `runtime.compare` 真消费三 digest 主轴
- row-heavy 高压场景真能闭环

这一层没有跑通，benchmark evidence 没有可靠输入基底。

当前 executable subset 的长期来源统一看 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的 `SC-*` 主矩阵；[scenario-proof-family.md](./scenario-proof-family.md) 只保留 `WF* / W*` 投影视图。
当前 implementation evidence map 统一看 [trace-i1-evidence-map.md](./trace-i1-evidence-map.md)。

## Challenge Target

在固定 `AC3.3 / S1 / S2 / C003 / TRACE-S1 .. TRACE-S5 / runtime control plane` 的前提下，定义最小实现期 execution substrate：

> 让 `W1 .. W5` proof 能沿 `runtime.trial(mode="scenario") -> ScenarioCarrierEvidenceFeed -> runtime.compare` 路径真实跑通，并冻结后续 benchmark 可复用的 execution inputs

## Current Freeze

- adopted subcandidate：`TRACE-I1 implementation proof execution law`
- current verdict：`freeze-ready`
- frozen law：
  - implementation wiring 固定为：
    - `trialRunModule`
    - `proofKernel`
    - `ScenarioCompiledPlan + ScenarioRunSession`
    - `ScenarioCarrierEvidenceFeed`
    - `runtime.compare`
  - `W1 .. W5` 固定为唯一 canonical scenario proof roster
  - row-heavy hard gate 固定覆盖：
    - `reorder`
    - `replace`
    - `byRowId`
    - `active exit`
  - negative proof 最小集合固定为：
    - `noLiveHead`
    - `noContribution`
    - `staleRef`
    - `reasonSlotMustNotLink`
  - compare hook 固定跑到已冻结 `TRACE-S5` pipeline，并回到单一 `VerificationControlPlaneReport`
  - benchmark handoff 只冻结 execution whitelist，不冻结 perf truth
- current residual：
  - benchmark empirical lane 继续后置
  - actual code implementation 与 benchmark run 仍待实现期验证
  - exact internal type shape 继续 deferred

## Fixed Baseline

下面这些内容在本轮全部冻结：

- `AC3.3` public contract
- `S1 / S2 / C003` 已冻结 law
- `TRACE-S1 .. TRACE-S5` 已冻结 law
- `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession`
- `runtime.compare` 继续只认 `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest`
- benchmark 只复用 execution carrier，不新增 perf-only fixture、steps、expect、report shell
- 不新增第二 diagnostics truth
- 不新增 helper family
- 不重开 public API

## Success Bar

要想本轮通过，至少要同时满足：

1. `W1 .. W5` 都有唯一 canonical scenario plan 映射
2. trial 执行能真实发出 `sourceReceiptRef / derivationReceiptRef / bundlePatchRef / reasonSlotId / transition / retention` 所需 evidence refs
3. 至少一组 pass pair 和一组 fail pair 能进入 compare，产出三 digest 与 `firstProjectableDiff`
4. row-heavy 必须同时覆盖 `reorder / replace / byRowId / active exit` 四项，并证明 `canonicalRowIdChainDigest` 是唯一 row truth 锚点
5. negative proof 至少覆盖：
  - `noLiveHead`
  - `noContribution`
  - `staleRef`
  - `reasonSlotMustNotLink`
6. benchmark handoff 只冻结：
  - `compiledPlanDigest`
  - `fixtureIdentityDigest`
  - scenario read-point map
  - evidence emit-point map
  - `invalidationReason[]`
7. 若任一闭环缺内部钩子，输出 `not-ready blocker`，精确指到缺失模块或缺失 feed

## Required Questions

### Q1. Execution Wiring

- 最小 execution wiring 落在哪些 `internal/verification/**` 模块
- 谁持有 route entry
- 谁持有 run session

### Q2. Scenario Proof Roster Mapping

- `W1 .. W5` 如何映射到 `fixtures/env + steps + expect`
- 如何避免长第二 scenario authoring lane

### Q3. Feed Emit Points

- 哪些 refs 必须在 trial 内发射
- 哪些只允许在 compare 中归一化

### Q4. Compare Hook

- proof pack 要求的最小 compare hook 是什么
- 到什么程度才算闭环

### Q5. Row-Heavy Proof

- `byRowId after reorder` 如何只靠 `canonicalRowIdChainDigest` 站稳
- row-heavy negative proof 放在哪一层最稳

### Q6. Benchmark Admissibility

- 一个 proof case 被判定为 `benchmark-admissible` 的最小条件是什么
- 哪些输入变化会打破 execution comparability

## Candidate Contract Delta

### Implementation Wiring Law

本页暂按下面的 wiring law 收口：

- canonical route entry 固定经 `trialRunModule`
- 共享执行内核固定经 `proofKernel`
- scenario owner 固定为 `ScenarioCompiledPlan + ScenarioRunSession`
- `ScenarioRunSession` 持有本轮 run-local refs、evidence buffer、artifact buffer 与 step results
- `ScenarioCarrierEvidenceFeed` 是唯一 handoff packet
- compare 入口继续只经 `runtime.compare`

本页不重写：

- `trialRunModule` 的 route identity
- `proofKernel` 的共享执行 owner
- `ScenarioExecutionCarrier` 的 owner

### Canonical Scenario Proof Roster

本轮固定的唯一 canonical scenario proof roster 为：

- `W1 source-refresh-multi-lower`
  - 目标：同一 `sourceReceiptRef` 下多次 `lower`
  - 产物：两个 `write bundlePatchRef`、不同 `derivationReceiptRef`
- `W2 clear-while-active`
  - 目标：active owner 下 `lower -> undefined`
  - 产物：`clear` supersede 当前 live head，并安装 empty live head
- `W3 row-reorder-byRowId`
  - 目标：`reorder + byRowId + trackBy missing proof-failure branch`
  - 产物：`reorder` 不造新 head，`byRowId` 继续命中同一 canonical row；缺 `canonicalRowIdChainDigest` 或用 render order 参与 identity 时直接 proof failure
- `W4 row-replace-active-exit`
  - 目标：`replace + active exit + cleanup / retention`
  - 产物：旧 chain `retire/noLiveHead`，新 chain fresh head，cleanup 只作 subordinate backlink
- `W5 rule-submit-backlink`
  - 目标：`rule / submit outcome` 回链当前 live head 或终止 backlink
  - 产物：`reasonSlotId -> bundlePatchRef`

当前不再接受第二套 `W1..W5` 命名。

### Scenario Proof Mapping Table

`W1 .. W5` 当前固定映射如下：

- `W1 source-refresh-multi-lower`
  - canonical scenario plan：`fixtures/env + steps + expect` 下的 source refresh double-hit
  - pass pair：同一 `sourceReceiptRef`、不同 `derivationReceiptRef`、第二个 `write` supersede 第一个
  - fail pair：缺第二次 `derivationReceiptRef` 或 live head 未切到最新 `write`
  - feed refs：`sourceReceiptRef / derivationReceiptRef / bundlePatchRef / transition / retention`
  - compare assertions：三 digest、`firstProjectableDiffRef`、latest live head
- `W2 clear-while-active`
  - canonical scenario plan：active owner 下 `lower -> undefined`
  - pass pair：`clear` supersede 当前 live head，并安装 empty live head
  - fail pair：`clear` 后仍残留旧 live head
  - feed refs：`bundlePatchRef / transition=clear / retention / reasonSlotId?`
  - compare assertions：`noLiveHead` 或 empty-head truth、`reasonSlotMustNotLink`
- `W3 row-reorder-byRowId`
  - canonical scenario plan：`reorder + byRowId + trackBy missing proof-failure branch`
  - pass pair：`reorder` 不造新 head，`byRowId` 继续命中同一 canonical row
  - fail pair：render order 进入 identity，或缺 `canonicalRowIdChainDigest`
  - feed refs：`canonicalRowIdChainDigest / transition / retention / ownerRef`
  - compare assertions：row truth continuity、proof failure branch、`staleRef?`
- `W4 row-replace-active-exit`
  - canonical scenario plan：`replace + active exit + cleanup / retention`
  - pass pair：旧 chain `retire/noLiveHead`，新 chain fresh head，cleanup 只作 subordinate backlink
  - fail pair：旧贡献仍残留 live truth，或新 row 沿用旧 head
  - feed refs：`bundlePatchRef / transition=retire / retention / canonicalRowIdChainDigest`
  - compare assertions：`noLiveHead / noContribution / staleRef`
- `W5 rule-submit-backlink`
  - canonical scenario plan：`rule / submit outcome` 回链当前 live head 或终止 backlink
  - pass pair：`reasonSlotId -> bundlePatchRef`
  - fail pair：`reasonSlotId` 指向 stale head 或无关 head
  - feed refs：`reasonSlotId / bundlePatchRef / transition / retention`
  - compare assertions：`reasonSlotMustNotLink` 与 `firstProjectableDiffRef -> repairHints.focusRef`

这组 `W1 .. W5` 当前就是 `06` 主场景矩阵的 executable subset，并由 `scenario-proof-family.md` 在 `155` 下投影说明。

### Compare Hook Acceptance

本页当前只要求最小 compare hook 跑到下面这一步：

- 沿 `TRACE-S5` 已冻结 pipeline 跑通：
  - `stableAdmissionGate`
  - `digestAssembly`
  - `rowKeyJoinAndDiff`
  - `firstProjectableSelection`
  - `reportProjection`
  - `drillDownLinking`
- compare 必须回到单一 `VerificationControlPlaneReport`
- 一旦存在 `firstProjectableDiffRef`，至少一个 `repairHints.focusRef` 必须绑定到它

### Ref Emit / Admission Matrix

本页暂按下面矩阵收口：

- `sourceReceiptRef`
  - trial emit point：source admission / refresh 完成时
  - compare admission：当前只作 feed / debug / backlink
  - digest participation：默认不参与
  - negative proof landing：可作为 stale / turnover backlink
  - benchmark-admissible：不作为准入条件
- `derivationReceiptRef`
  - trial emit point：每次 `lower` 求值完成时
  - compare admission：debug / backlink only
  - digest participation：默认不参与
  - negative proof landing：可回链 compare drill-down
  - benchmark-admissible：不作为准入条件
- `bundlePatchRef`
  - trial emit point：`write / clear / retire` commit live-head table 时
  - compare admission：当前只作 feed / debug / backlink
  - digest participation：默认不参与
  - negative proof landing：`noLiveHead / noContribution / reasonSlotMustNotLink`
  - benchmark-admissible：不作为准入条件
- `reasonSlotId`
  - trial emit point：rule / submit / pending / blocking outcome materialize 时
  - compare admission：admitted
  - digest participation：可参与
  - negative proof landing：`reasonSlotMustNotLink`
  - benchmark-admissible：需要
- `canonicalRowIdChainDigest`
  - trial emit point：row-scoped proof resolve against current roster + active set 时
  - compare admission：admitted
  - digest participation：必须参与
  - negative proof landing：`noLiveHead / noContribution / staleRef`
  - benchmark-admissible：必须存在
- `transition / retention`
  - trial emit point：evidence feed row materialization 时
  - compare admission：admitted
  - digest participation：必须参与
  - negative proof landing：全部
  - benchmark-admissible：需要

### Benchmark-Admissible Execution Whitelist

本页只冻结 execution whitelist，不冻结 perf truth。

一个 proof case 只有同时满足下面条件，才允许进入 `benchmark-admissible scenario set`：

- 已跑通单一 `runtime.trial -> ScenarioCarrierEvidenceFeed -> runtime.compare` 闭环
- 已产出稳定的 `compiledPlanDigest`
- 已产出稳定的 `fixtureIdentityDigest`
- 已产出 scenario read-point map
- 已产出 evidence emit-point map
- 已给出 `invalidationReason[]`
- 环境漂移当前只记录为 comparability gate 输入，不在本轮转成 perf truth

`invalidationReason[]` 当前固定只允许：

- `declaration-digest-changed`
- `fixture-identity-changed`
- `scenario-read-map-changed`
- `evidence-emit-map-changed`
- `scenario-step-graph-changed`
- `expect-graph-changed`

本页当前不冻结：

- baseline
- compare / budget
- matrix
- perf output contract
- environment comparability verdict

## Expected Outputs

- 一个 executable proof gate design
- 一张 `W1 .. W5 -> scenario plan -> feed refs -> compare assertions` 映射表
- 一份最小 execution wiring 草图
- 一份 compare hook acceptance note
- 一份 `benchmark-admissible scenario set`
- 若未 ready，一份 blocker note

## Writeback Targets

- challenge queue：`discussion.md`
- parent challenge：`challenge-implementation-trace-evidence-pack.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-implementation-proof-execution.md`
