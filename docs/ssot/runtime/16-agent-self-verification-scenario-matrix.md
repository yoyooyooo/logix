---
title: Agent Self Verification Terminal Pressure Matrix
status: living
version: 4
---

# Agent Self Verification Terminal Pressure Matrix

## 目标

本页冻结 Agent 日常 AI coding 自验证闭环的终局压力矩阵。目标是用更少的不变量逼出 CLI route/transport 与 core/kernel 的真实缺口，避免退化成错误样例清单。

本页只持有：

- terminal invariants
- pressure rows
- proof axes
- proof refs
- derived pressure index

本页不持有：

- canonical stage vocabulary
- `VerificationControlPlaneReport` exact schema
- errorCode registry
- environment exact shape
- CLI command/flag exact contract
- DVTools evidence exact schema

这些权威继续归 owner page。

## Owner 边界

| 主题 | Authority |
| --- | --- |
| canonical stage、mode、`VerificationControlPlaneReport` shell、`focusRef` keys、`nextRecommendedStage` | [09-verification-control-plane.md](./09-verification-control-plane.md) |
| `Program.capabilities.services / imports` | [04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md) |
| CLI command surface、`CommandResult` transport、entry/input gate、static command schema | [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md) |
| DVTools evidence export 与 selection manifest | [14-dvtools-internal-workbench.md](./14-dvtools-internal-workbench.md) |

硬规则：

- 本页不得定义新的 stage vocabulary。
- 本页不得定义 `VerificationControlPlaneReport` 子 schema、errorCode registry 或 environment exact shape。
- 本页不得把 `CommandResult.error` 升格为 machine report authority。
- 本页不得让 future scenario、host deep trial 或 compare 变成默认门禁。
- 本页不得把 pre-control-plane transport gate 写成 canonical stage。
- 本页不得因为当前实现能抛错，就把该 pressure 视为终局已覆盖。
- 本页的 pressure index 只是 derived index；owner adoption bar 必须回到 `09 / 15 / 04 / 14`。

## Loop Closure Target

Agent 日常闭环的最小成功标准：

```text
edit
  -> check
  -> trial startup
  -> repair edit
  -> exact rerun
  -> compare closure
```

进入 `covered` 的 cluster 必须至少证明一条端到端 proof pack：

- before report 可机读。
- repair target 可由 `repairHints.focusRef`、artifact outputKey 或 owner-defined locator 找到。
- rerun 坐标可从 `CommandResult` 和 artifact refs 复原。
- after report 可比较。
- compare 给出 `PASS / FAIL / INCONCLUSIVE` 中可调度的结果。
- `nextRecommendedStage` 是唯一 top-level scheduling authority。

只证明单个 row 会失败不等于闭环成立。

## Terminal Invariants

| id | invariant | pressure |
| --- | --- | --- |
| `INV-REPORT` | 单一 machine report authority | 所有机器判断回到 `VerificationControlPlaneReport`；CLI、DVTools、scenario carrier 都不能形成第二 report truth |
| `INV-ROUTE` | route 与 stage 分层 | `check / trial / compare` 属于 runtime control plane；entry/evidence/selection/compare-input/stdout 属于 pre-control-plane gate |
| `INV-ENTRY` | Program entry authority | CLI entry 最终只能定位真实 `Program`，且必须能拒绝 Module、Logic、fake Program、missing blueprint |
| `INV-SOURCE` | source -> declaration freshness | source/typecheck/package resolver 只能产 derived source artifact；`runtime.check` 消费 declaration coordinate、digest 与 `sourceRef` pressure |
| `INV-STATIC` | static pressure without boot | `runtime.check` 必须能表达 Program blueprint、Program-only imports、duplicate imports、declaration freshness 等静态失败，且不能代跑 startup |
| `INV-DEPENDENCY` | dependency localization | service、config、Program import、child dependency、phase、provider source 进入统一 dependency pressure，Agent 不解析自由文本 |
| `INV-LIFECYCLE` | boot/close dual summary | boot failure 与 close failure 不互相覆盖；close evidence 通过 artifact linking 暴露 |
| `INV-ARTIFACT` | artifact outputKey linking | CLI、report、DVTools selection、repair hint 之间只用 `artifacts[].outputKey` 连接 |
| `INV-RERUN` | exact rerun and repeatability | 同一 normalized rerun coordinate 应稳定产出 verdict、errorCode、artifact keys、digest 与 next stage；不稳定时给可解释的 inconclusive pressure |
| `INV-SCHED` | PASS semantics and unique next stage | PASS 只能表示当前 stage 覆盖范围内通过；future/scenario/host 未跑时不能被暗示为通过；top-level `nextRecommendedStage` 唯一 |
| `INV-COMPARE` | compare admissibility | compare 以 declaration、scenario plan、evidence summary、environment fingerprint 的 admissibility 为主轴 |
| `INV-FUTURE` | future escalation is explicit | scenario executor 与 host deep trial 只有满足 owner precondition 后才进入成功路径 |

## Route Vocabulary

`control_plane_stage` 只能写：

- `check`
- `trial startup`
- `compare`
- `trial scenario future`
- `host deep future`
- `none`

`pre_control_plane_gate` 只能写：

- `entry`
- `source artifact`
- `evidence`
- `selection`
- `compare input`
- `stdout`
- `none`

`pre_control_plane_gate` 不得进入 `nextRecommendedStage`。

## Status Vocabulary

| status | 含义 |
| --- | --- |
| `covered` | 已有 proof ref，且 proof 覆盖该 row 的 primary axes |
| `partial` | 有局部 proof 或当前可失败，但缺 proof ref、缺闭环、缺稳定坐标、缺 repeatability、缺 provider source 或仍依赖自由文本 |
| `gap` | 目标明确，当前默认 control plane 尚不能覆盖，或当前只能在 control-plane 之外抛错 |
| `future` | 依赖 future scenario executor、host deep trial 或其他后续能力 |

`covered` 行必须带 `proof_ref`。没有 proof ref 的行不能标 `covered`。

## Proof Axes

| axis | proof requirement |
| --- | --- |
| `PA-REPORT` | primary machine result 是 `VerificationControlPlaneReport`，或明确属于 pre-control-plane transport failure |
| `PA-STAGE` | 不新增 canonical stage；pre-control-plane gate 不进入 `nextRecommendedStage` |
| `PA-FOCUS` | localized failure 有稳定 `focusRef`、owner-defined locator 或 artifact link |
| `PA-RERUN` | rerun coordinate 足以复原同一验证输入，敏感或大输入可通过 artifact ref/digest 承接 |
| `PA-ARTIFACT` | all links use `artifacts[].outputKey` |
| `PA-COMPARE` | before/after reports 可进入 compare closure 或给出 admissibility failure |
| `PA-PASS` | PASS 的停止理由可追溯，且不暗示 future layer 已通过 |
| `PA-REPEAT` | 同一 normalized input 的 verdict、errorCode、artifact keys、digest、next stage 稳定 |
| `PA-SURFACE` | 不新增 public authoring surface、CLI report truth、DVTools evidence truth、scenario public facade |

## Terminal Pressure Matrix

| id | invariant | pressure | control_plane_stage | pre_control_plane_gate | status | gap_tags | proof_axes | proof_ref |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TP-LOOP-01` | `INV-REPORT`, `INV-RERUN`, `INV-COMPARE` | Program 装配缺陷、source/typecheck 缺陷、dependency 缺陷至少各有一条 before -> repair -> rerun -> compare closure proof pack | `check / trial startup / compare` | `none` | `covered` | none | `PA-REPORT`, `PA-RERUN`, `PA-COMPARE`, `PA-SURFACE` | `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`; `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`; `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts`; `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts` |
| `TP-ENTRY-01` | `INV-ENTRY`, `INV-ROUTE` | entry 必须拒绝 Module、Logic、fake Program、missing blueprint；locator failure 不伪造 next stage | `check` | `entry` | `partial` | `GAP-ENTRY-BLUEPRINT`, `GAP-CHECK-STATIC` | `PA-REPORT`, `PA-STAGE`, `PA-SURFACE` | `packages/logix-cli/test/Integration/program-entry.contract.test.ts` |
| `TP-SOURCE-01` | `INV-SOURCE`, `INV-STATIC` | source/package/typecheck 只能产 derived source artifact；`runtime.check` 验 declaration freshness、declaration digest 与 `sourceRef` pressure | `check` | `source artifact` | `covered` | none | `PA-REPORT`, `PA-FOCUS`, `PA-PASS`, `PA-SURFACE` | `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts` |
| `TP-STATIC-01` | `INV-STATIC` | Program-only imports、duplicate import、missing blueprint、invalid declaration 在 check 阶段给结构化 pressure，且不启动 runtime | `check` | `none` | `covered` | none | `PA-REPORT`, `PA-PASS`, `PA-SURFACE` | `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`; `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts` |
| `TP-DEPENDENCY-01` | `INV-DEPENDENCY` | missing service、missing config、missing Program import、imported child dependency 进入统一 dependency localization；必须包含 kind、phase、provider source、child identity pressure | `trial startup` | `none` | `covered` | none | `PA-REPORT`, `PA-FOCUS`, `PA-RERUN`, `PA-SURFACE` | `packages/logix-core/test/observability/Observability.trialRunModule.missingService.test.ts`; `packages/logix-core/test/observability/Observability.trialRunModule.missingConfig.test.ts`; `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts` |
| `TP-LIFECYCLE-01` | `INV-LIFECYCLE`, `INV-ARTIFACT` | boot 与 close failure 同时存在时保留 primary failure 和 close summary；close summary 通过 artifact linking 承接 | `trial startup` | `none` | `covered` | none | `PA-REPORT`, `PA-ARTIFACT`, `PA-RERUN`, `PA-SURFACE` | `packages/logix-core/test/observability/Observability.trialRunModule.disposeTimeout.test.ts`; `packages/logix-core/test/observability/Observability.trialRunModule.scopeDispose.test.ts` |
| `TP-SCHED-01` | `INV-SCHED`, `INV-REPORT` | 多个 hint-local upgrade 必须收敛为唯一 top-level `nextRecommendedStage`；PASS 必须说明当前 stage 覆盖范围和 future layer 未跑边界 | `check / trial startup / compare` | `none` | `covered` | none | `PA-REPORT`, `PA-STAGE`, `PA-PASS`, `PA-SURFACE` | `packages/logix-cli/test/Integration/next-stage-precedence.contract.test.ts`; `packages/logix-cli/test/Integration/output-contract.test.ts`; `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`; `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` |
| `TP-EVIDENCE-01` | `INV-ARTIFACT`, `INV-REPORT` | canonical evidence package 和 selection manifest 只作 provenance / hint；selected finding 必须能进入 report focus/artifact outputKey/Agent repair roundtrip | `check / trial startup / compare` | `evidence / selection` | `covered` | none | `PA-REPORT`, `PA-FOCUS`, `PA-ARTIFACT`, `PA-SURFACE` | `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`; `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts` |
| `TP-TRANSPORT-01` | `INV-ARTIFACT`, `INV-RERUN` | `CommandResult` 只作 stdout envelope；primary report、artifact order、budget/truncation、error report 和 exact rerun manifest 必须稳定 | `none` | `stdout` | `covered` | none | `PA-STAGE`, `PA-RERUN`, `PA-ARTIFACT`, `PA-REPEAT`, `PA-SURFACE` | `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`; `packages/logix-cli/test/Integration/output-contract.test.ts`; `packages/logix-cli/test/Integration/output-budget.contract.test.ts`; `packages/logix-cli/test/Integration/transport-gate-error.contract.test.ts`; `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`; `packages/logix-cli/test/Integration/command-schema.guard.test.ts` |
| `TP-COMPARE-01` | `INV-COMPARE`, `INV-RERUN` | compare 对 environment、declaration、scenario plan、evidence summary mismatch 返回 admissibility result；same-stage repair closure 必须可判定 | `compare` | `compare input` | `covered` | none | `PA-REPORT`, `PA-COMPARE`, `PA-REPEAT`, `PA-SURFACE` | `packages/logix-cli/test/Integration/compare.command.test.ts`; `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`; `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` |
| `TP-FUTURE-01` | `INV-FUTURE`, `INV-DEPENDENCY` | scenario dependency branch 与 host wiring 只能在 owner precondition 满足后进入成功路径；当前只保留 promotion pressure | `trial scenario future / host deep future` | `none` | `future` | `GAP-SCENARIO-EXECUTOR`, `GAP-HOST-DEEP` | `PA-STAGE`, `PA-FOCUS`, `PA-SURFACE` | `packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts`; `packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts` |

## Derived Pressure Index

本表只是 derived index，用来把 16 的 pressure rows 路由回 owner page。具体 adoption bar、exact schema、实现路径和 public contract 必须回到 owner page。

状态口径：

- `closed`：owner page 已采纳，且 terminal matrix row 有可运行 proof ref。
- `split`：同一 pressure family 内，core/kernel 子项已关闭，但 CLI、DVTools、transport 或 future host 子项仍开放。
- `open`：仍缺 owner 决策、transport proof、roundtrip proof 或端到端 proof。
- `future`：依赖 future scenario executor、host deep trial 或明确后续 owner precondition。

需求落点：

- core/kernel pressure 实施需求：[../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)
- CLI transport / roundtrip 实施需求：[../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)
- DVTools workbench 主线：[../../../specs/159-dvtools-internal-workbench-cutover/spec.md](../../../specs/159-dvtools-internal-workbench-cutover/spec.md)
- CLI mainline cutover：[../../../specs/160-cli-agent-first-control-plane-cutover/spec.md](../../../specs/160-cli-agent-first-control-plane-cutover/spec.md)

| pressure_id | owner page | rows | status | owner disposition |
| --- | --- | --- | --- | --- |
| `GAP-LOOP-CLOSURE` | `09 + 15` | `TP-LOOP-01`, `TP-COMPARE-01` | `closed` | core report-level compare closure 已由 `161` 覆盖；CLI exact rerun、before/after report refs 与三类 repair closure proof pack 已由 `162` 覆盖 |
| `GAP-ENTRY-BLUEPRINT` | `15 + 09` | `TP-ENTRY-01` | `open` | fake Program、Module、Logic 与 locator failure 仍归 CLI entry proof；missing blueprint 的 core check pressure 已由 `161` 覆盖 |
| `GAP-SOURCE-DECLARATION` | `15 + 09` | `TP-SOURCE-01` | `closed` | `runtime.check` declaration gate、derived source artifact digest 与 `sourceRef` pressure 已由 `161` 覆盖 |
| `GAP-CHECK-STATIC` | `09` | `TP-ENTRY-01`, `TP-SOURCE-01`, `TP-STATIC-01` | `split` | `Runtime.check` static pressure 已由 `161` 覆盖；CLI entry boundary 仍看 `TP-ENTRY-01` |
| `GAP-PROGRAM-ONLY-IMPORTS` | `04 + 09` | `TP-STATIC-01` | `closed` | `Program.capabilities.imports` public type、normalizer、invalid import 与 duplicate import static finding 已由 `161` 覆盖 |
| `GAP-DEPENDENCY-PARSER` | `09` | `TP-DEPENDENCY-01` | `closed` | startup typed dependency cause IR 已由 `161` 覆盖 service、config、Program import 与 child dependency |
| `GAP-FOCUS-PROVIDER` | `04 + 09` | `TP-DEPENDENCY-01` | `closed` | provider source、owner coordinate 与 `focusRef` projection 已由 `161` 覆盖；future host layer 仍按 host owner 升级 |
| `GAP-CONFIG-SHAPE` | `09` | `TP-DEPENDENCY-01` | `closed` | config missing 与 invalid pressure 分流已由 `161` 纳入 startup dependency cause |
| `GAP-LIFECYCLE-CLOSE` | `09` | `TP-LIFECYCLE-01` | `closed` | boot/close dual summary 与 close artifact linking 已由 `161` 覆盖 |
| `GAP-PASS-SEMANTICS` | `09` | `TP-SCHED-01`, `TP-SOURCE-01`, `TP-STATIC-01` | `closed` | current-stage PASS boundary 与 future layer 未执行边界已由 `161` 覆盖 |
| `GAP-NEXT-STAGE` | `09 + 15` | `TP-SCHED-01` | `closed` | top-level `nextRecommendedStage` 的唯一调度权威已由 `09` 固定，并由 core/CLI proof refs 覆盖 |
| `GAP-DVTOOLS-ROUNDTRIP` | `14 + 15 + 09` | `TP-EVIDENCE-01` | `closed` | canonical evidence package + selection manifest 的 CLI import、hint-only selection、artifactOutputKey namespace 校验与 repair locator roundtrip 已由 `162` 覆盖；DVTools UI/export 体验继续归 `159` 自身主线 |
| `GAP-ARTIFACT-LINKING` | `09 + 15 + 14` | `TP-LIFECYCLE-01`, `TP-EVIDENCE-01`, `TP-TRANSPORT-01` | `closed` | lifecycle artifact link 已由 `161` 覆盖；evidence selection、transport artifact order、primaryReportOutputKey 与 compare before/after report ref artifacts 已由 `162` 覆盖 |
| `GAP-EXACT-RERUN` | `15` | `TP-TRANSPORT-01`, `TP-LOOP-01` | `closed` | CLI rerun coordinate 已覆盖 `argvSnapshot`、Program entry、evidence/selection refs、trial options、compare before/after refs 与 inherited evidence refs |
| `GAP-STDOUT-BUDGET` | `15` | `TP-TRANSPORT-01` | `closed` | stdout budget、oversized inline preview、file fallback、truncation metadata、artifact order 与 error report transport gate 已由 `162` 覆盖 |
| `GAP-REPEATABILITY` | `15 + 09` | `TP-TRANSPORT-01`, `TP-COMPARE-01` | `closed` | core report repeatability normalizer 与 compare digest 已由 `161` 覆盖；CLI normalized argv rerun 与 stable transport comparison 已由 `162` 覆盖 |
| `GAP-COMPARE-DIGESTS` | `09` | `TP-COMPARE-01` | `closed` | declaration、scenario plan、evidence summary、environment fingerprint admissibility 已由 `161` 覆盖 |
| `GAP-SCENARIO-EXECUTOR` | `09` | `TP-FUTURE-01` | `future` | scenario executor 复用 startup dependency parser，满足 owner precondition 后再进入成功路径 |
| `GAP-HOST-DEEP` | `09 + React host owner` | `TP-FUTURE-01` | `future` | host deep trial 只作为专项升级层，输出回到统一 report/evidence |

## Kernel Demand Points

这些是由矩阵压出的 core/kernel 需求点。`161` 已把本段需求采纳到 `09 / 04` 并落到 core contract tests：

- `Runtime.check` 需要 static pressure lane：Program blueprint guard、Program-only imports、duplicate imports、declaration freshness、sourceRef link、PASS coverage boundary。
- dependency parser 需要 typed dependency cause IR：service、config、Program import、child dependency、phase、provider source、owner coordinate，避免 regex/free-text 解析。
- trial report materializer 需要 focus coordinate projection：module declaration slice、scenario step、sourceRef、reason slot，只投影稳定坐标。
- lifecycle proof kernel 需要 boot/close dual summary：close failure 作为 artifact-linked summary，不吞掉 primary boot failure。
- compare substrate 需要 admissibility digest：declaration digest、scenario plan digest、evidence summary digest、environment fingerprint。
- repeatability normalizer 需要明确可忽略字段：runId、允许的 file path/outDir 差异；其余 verdict、errorCode、artifact keys、digest、next stage 必须稳定。

## CLI Demand Points

这些是由矩阵压出的 CLI 需求点，具体 contract 归 [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md)：

- source artifact producer 与 `runtime.check` declaration gate 分层；CLI 不获得 declaration truth。
- exact rerun coordinate 保存 owner-defined locator/ref/argv snapshot；check、startup trial 与 compare refs 已有 proof。
- CLI v1 不新增 raw provider overlay public input；provider source 分类由 core report 或 future host layer 表达。
- stdout budget、oversized preview、truncation、file fallback、artifact ordering、error report 都有 deterministic proof。
- canonical evidence package 与 selection manifest 已通过 CLI import roundtrip proof；selection 继续 hint-only，artifact key 对齐 `artifacts[].outputKey`。
- compare 输出保留 `beforeReportRef / afterReportRef` artifact，Agent 可从 stdout envelope 继续解引用 before/after report。
- `CommandResult` 继续只作 transport；machine report authority 仍是 `VerificationControlPlaneReport`。

## Closure Proof Obligations

每个进入 `covered` 的 row 必须满足：

- `proof_ref` 指向可运行 test、proof command 或 artifact proof。
- proof 覆盖该 row 的全部 primary proof axes。
- proof 断言 primary `VerificationControlPlaneReport` 或明确的 pre-control-plane transport failure。
- proof 断言 pre-control-plane gate 不进入 `nextRecommendedStage`。
- proof 断言 artifact links 只通过 `artifacts[].outputKey`。
- proof 断言 exact rerun 或 repeatability 需求在该 row 范围内成立；如果该 row 不涉及 rerun，必须明确说明。
- proof 断言没有新增 public authoring surface、CLI report truth、DVTools evidence truth 或 scenario public facade。

每个 `partial` row 必须写明 gap_tags。不能只写“当前能失败”。

每个 `future` row 必须写明 owner precondition。不能把它描述成当前 CLI 成功路径。

## Agent Reading Rule

Agent 读本页时只能得到终局不变量、pressure rows、gap tags 和 proof obligation。实际命令、stage、report 字段和 artifact transport 要回到 owner page：

- 执行 CLI：读 [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md)
- 判断 stage 与 report：读 [09-verification-control-plane.md](./09-verification-control-plane.md)
- 修 Program capabilities：读 [04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- 使用 DVTools evidence：读 [14-dvtools-internal-workbench.md](./14-dvtools-internal-workbench.md)

## 不接受的方向

- 为装配检测新增公开 authoring API。
- 为 imports 检测重新接受 Module entry fallback。
- 让 CLI 自己定义 dependency truth、import truth 或第二 report shape。
- 让 DVTools selection manifest 改变 evidence truth。
- 默认门禁常开 scenario、browser、raw trace 或 replay。
- 把 pre-control-plane transport gate、host deep trial 或 future scenario 当作新的 canonical stage。
- 把当前 import-time throw、自由文本 error message 或 `CommandResult.error` 当成终局覆盖证明。

## 当前一句话结论

Agent 自验证闭环的终局压力已经从 failure catalog 收敛为 invariant-first matrix：`161` 已关闭 core/kernel pressure，`162` 已关闭 CLI transport、exact rerun、stdout budget、DVTools selection import 与 before/after compare closure 的 proof 缺口。剩余明确 future 项只指向 scenario executor 与 host deep trial。
