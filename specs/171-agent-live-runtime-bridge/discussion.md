# 讨论记录：Agent Live Runtime Bridge

本文件不持有 authority。接受后的裁决必须回写到 [spec.md](./spec.md)、后续 `plan.md` / `tasks.md`，或对应 SSoT：

- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)
- [../168-kernel-to-playground-verification-parity/spec.md](../168-kernel-to-playground-verification-parity/spec.md)

## 用途

本文件保存 `171` 后续使用 `$plan-optimality-loop` 的审查素材。素材按批次与主题拆组，避免 reviewer 一次性审完整篇后遗漏局部细节。

## 历史 Plan-Optimality-Loop 审查合同草稿

本段记录 Batch 2 前的 challenge input。当前 authority 以已采纳的 Batch 1 到 Batch 7 ledger 及其回写产物为准。

- `artifact_kind`: `ssot-contract`
- `review_goal`: `design-closure`
- `target_claim`: Logix 应建立 Agent-first live runtime bridge；public CLI live lane 只能在 `15` rewrite 与 proof gate 之后重开；DevTools 面板退为 Workbench/evidence viewer；reflection 只保留高价值静态事实，实时上下文交给 live bridge；所有输出最终回到 canonical evidence 与 verification control plane；内核应通过这条链路提前具备 Agent-researchable 的透明性、可采集性、可测量性和可比较性。
- `target_refs`:
  - [spec.md](./spec.md)
  - [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
  - [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
  - [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
  - [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
  - [../159-dvtools-internal-workbench-cutover/spec.md](../159-dvtools-internal-workbench-cutover/spec.md)
  - [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md)
  - [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md)
  - [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)
  - [../168-kernel-to-playground-verification-parity/spec.md](../168-kernel-to-playground-verification-parity/spec.md)
- `challenge_scope`: `open`
- `scope_fence`: 允许挑战 CLI live command surface、runtime hook 形态、DevTools 定位、reflection/live evidence 分工、SSoT 改写范围；不允许开始实现代码。
- `stop_condition`: first pass 为 `user-checkpoint`，用户要求继续后改为 `consensus`。
- `write_policy`: first pass 只能写 review ledger 和 planning artifacts proposed edits。
- `suggested_reviewer_count`: First batch `3`，后续 batches 每轮 `3`。
- `suggested_model`: `gpt-5.5 xhigh`.

## AutoResearch 参考压力

Reference: [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

观察到的 core loop：

```text
fixed harness
  -> mutable candidate file
    -> fixed time budget run
      -> single primary metric
        -> keep / discard / crash
          -> ledger
            -> next candidate
```

只作为 pressure 保留的设计细节，不直接照搬：

- Human edits `program.md`, Agent edits only `train.py`.
- `prepare.py` owns data, dataloader, tokenizer, fixed constants, and evaluation.
- Training budget is fixed at 5 minutes.
- Primary metric is `val_bpb`; lower is better.
- The result summary also records memory, steps, params, throughput, and runtime.
- Failed experiments are logged, not silently forgotten.
- Candidate adoption is local and mechanical: keep if metric improves, discard otherwise.
- Simplicity is part of adoption judgment, not only score.
- The method is intentionally platform-local; results compare within one hardware/runtime environment.

Logix future-loop translation：

```text
immutable evaluation harness
  -> bounded Agent-authored candidate
    -> fixed proof + metric budget
      -> hard gates + metric comparison
        -> adopt / discard / crash / escalate
          -> adoption ledger
            -> next candidate
```

`171` translation:

```text
researchable kernel
  -> live bridge / CLI / Workbench evidence
    -> comparable baseline and candidate evidence
      -> evidence headers, metric refs, gaps, budgets, environment refs
        -> future experiment and adoption loop inputs
```

重要边界：

- `171` 准备 future continuous self-evolution 的 substrate。
- `171` 应让 runtime internals 足够透明，使 Agent 能 collect、compare、explain behavior deltas。
- `171` 不拥有 autonomous candidate mutation、adoption policy、merge、publish、release 或完整 24h loop orchestration。
- Future loop design 可在 `171` evidence 稳定后复用 AutoResearch 的 fixed harness、fixed budget、metric comparison、failed-run ledger 和 simplicity pressure。

对 Logix 有价值的新增压力是 researchability requirement。只要 internal runtime decisions、costs、evidence gaps 成为 first-class 且 comparable，后续 Agent-authored improvements 就能被机械判断。本轮应让 kernel shape 朝这个方向倾斜，但不引入完整 automation system。

## Review Batch 计划

### Batch 1: North Star And Owner Law

目标：挑战 core claim，并决定 live bridge 是否应成为主导 Agent-first route。

已采纳 Batch 1 candidate：

```text
Core live bridge first, conditional CLI live =
  core-owned runtime attachment semantics
    -> LiveTarget / ControlledOperation / EvidenceWindow
      -> canonical evidence envelope
        -> Workbench projection
          -> runtime.check / runtime.trial / runtime.compare closure

CLI live route:
  conditional public surface after `15` rewrite + dogfood proof
```

Batch 1 拒绝把 unconditional public CLI live 作为首个冻结目标。已接受目标是 core live bridge substrate；只有当它证明 public CLI live commands 优于 repo-internal transport 时，后者才能在未来被证明。

Reviewer focus：

- 该方向是否严格改善 Agent self-verification 与 repair closure。
- 相比 panel-first DevTools 加 static reflection，它减少还是增加 concept count。
- CLI live lane 是否能与 `check / trial / compare` 共存且不创建 second control plane。
- DevTools panel demotion 是改善还是削弱 human/Agent workflow。
- 若采纳，哪些 SSoT pages 必须先更新。
- 哪些 concept 可以删除，同时不损失 Agent discover、target、act、capture、export、close 能力。

预期输出：

- adopted 或 rejected target function
- CLI、runtime core、reflection、Workbench、DevTools、Playground 的 owner map
- 全系统 smallest concept set

已采纳 owner map：

| Topic | Owner | Batch 1 pressure |
| --- | --- | --- |
| machine verdict | `09` | live bridge cannot create verdict truth |
| verification route | `15` + `09` | `check / trial / compare` remain stage routes |
| live runtime route | `171` | live bridge owns attach / observe / act / capture / export |
| public CLI live route | future `15` update | conditional only after command-count, misuse, authority, and dogfood proof |
| runtime attachment | runtime core | attachment semantics must be core-owned; names and DTOs wait for Batch 3 |
| browser hook | browser adapter | hook can exist only as attachment vocabulary |
| Workbench projection | `165` + `14` | one projection law across CLI, DevTools, Playground |
| static reflection | `167` | keep static facts and payload/action contracts |
| live evidence | `171` + `09/165` | carry active topology, host facts, profile, selector route observation through canonical evidence |
| DVTools panel | `14` | repo-internal Workbench host, capture surface, viewer, and explainer; no product truth |
| Playground | `168` | dogfood host only |
| researchability | `171`, future spec | only evidence header now; metric families and adoption loop deferred |

Batch 1 采纳的最小 planning vocabulary：

1. `RuntimeAttachment`
2. `LiveTarget`
3. `ControlledOperation`
4. `EvidenceWindow`
5. `CanonicalEvidenceExport`

Concept cut pressure：

- `BridgeAdapter` 是 implementation category，不是 primary concept。
- `RuntimeAgentPort` 只是 Batch 1 history-only 候选名，不是 Batch 1 frozen noun；Batch 3 已拒绝 DTO-first 冻结。
- `BridgeEvidenceGap` 是 canonical evidence gap subtype，不是 primary concept。
- `EvidenceWindow` 是 bounded capture capability 与 metadata shape。
- `CanonicalEvidenceExport` 是 canonical evidence handoff capability。
- `ResearchabilitySignal`、`MetricBaseline`、`ComparableEvidenceRef`、`KernelDecisionTrace` 不进入 Batch 1 primary concepts。
- DevTools-specific session/finding/artifact nouns 不应作为 separate concepts 存活，必须使用 Workbench projection vocabulary。
- Browser global hook 不应成为 top-level mental model，除非 Batch 3 证明它改善 attachment 且不增加 cloud 或 Node 成本。

Batch 1 已采纳裁决：

- 采纳 Agent-first live bridge 作为真实 171 north-star extension。
- 采纳 core live bridge first, conditional CLI live。
- 拒绝 unconditional public CLI live 作为 Batch 1 frozen surface。
- 采纳 DVTools 作为 repo-internal Workbench host、capture surface、viewer、explainer。
- 采纳带 digest 与 evidence-gap connection law 的 reflection/live split。
- 只采纳 researchability-compatible evidence header；metric families、decision traces、candidate comparison、adoption policy deferred。

Round 1 reviewer convergence：

| reviewer | disposition |
| --- | --- |
| A1 structure purity | reject `C171-B`; require CLI condition, canonical evidence single exit, digest connection law |
| A2 compression | reject hub-spec expansion; require delta-only Batch 1 and five concepts |
| A3 dominance search | propose `C171-E Core Live Bridge First, Conditional CLI Live` |
| A4 target challenge | reject overwide target; require live evidence substrate first |

### Batch 2: CLI Live Surface And Command Shape _(historical batch label)_

目标：挑战 proposed CLI expansion，并决定当前 surface 是否应包含任何 public live command。

Reviewer focus：

- `logix live ...` 是否是正确 namespace。
- live commands 是否应使用 `list / inspect / snapshot / events / profile / dispatch / export` 等 verbs。
- 哪些 commands 是 P1，哪些必须等待。
- command output 应使用 `CommandResult`、new live transport envelope，还是 distinct authority 的 shared transport envelope。
- live command discovery 应是 executable、static schema 或两者兼有。
- exact rerun coordinates 如何与 live session coordinates 交互。

被拒 candidate command family：

```text
logix live status
logix live list runtimes
logix live list modules
logix live list instances
logix live inspect runtime <runtimeId>
logix live inspect instance <instanceId>
logix live events --runtime <runtimeId>
logix live snapshot --runtime <runtimeId>
logix live wait --instance <instanceId> --ready
logix live profile start|stop|report
logix live dispatch --instance <instanceId> --action <tag> --payload <json>
logix live export evidence --session <sessionId>
```

已采纳 Batch 2 candidate：

```text
C171-G Zero Public Live Commands, Internal Bridge Handoff =
  repo-internal live bridge transport
    -> LiveTarget / EvidenceWindow / ControlledOperation / CanonicalEvidenceExport capabilities
      -> canonical evidence package + target coordinates + artifact refs
        -> existing logix check / trial / compare
          -> VerificationControlPlaneReport repair closure
```

Batch 2 当时冻结的历史结论，已被后续 CLI owner rewrite supersede：

- 当时 public `logix live ...` command set 为空。
- 当时 Public CLI 只保持 `logix check / trial / compare`。
- Candidate `status/list/inspect` shapes 下沉为 `LiveTarget` discovery capabilities。
- Candidate `events/snapshot/profile` shapes 下沉为 `EvidenceWindow` capture capabilities。
- Candidate `wait/dispatch` shapes 下沉为 `ControlledOperation` variants；final allowlist 已由 Batch 6 关闭。
- Candidate `export evidence` 当时下沉为 repo-internal canonical evidence export handoff；该结论已被后续 `logix live export evidence` 重开并替换。
- Repo-internal live transport 可以使用 internal envelope，但该 envelope 只是 derived mirror，不拥有 report、evidence、session 或 verdict truth。
- `CommandResult` 继续作为 `logix check / trial / compare` 的 stdout envelope；它不是 live session envelope。
- Live transport durable output 只能是 canonical evidence package、selection 或 target coordinates、artifact refs、evidence gaps、budget markers。
- Public live commands 已通过 `15` rewrite 重开，当前形态固定为 `logix live <task>`，并受 dogfood、command-count、misuse、authority、output-protocol、no-second-truth proof 约束。

Batch 2 deferred 的历史项，当前状态：

- public `logix live ...` namespace：已采纳为受限 public namespace。
- public `logix live export`：已采纳为 `logix live export evidence`。
- executable live command discovery：已归位为 `logix live targets / inspect`。
- live output protocol for public CLI：已归位为 `LiveCommandResult`。
- public dispatch/profile/wait command shapes：已归位为 `logix live dispatch / profile / wait`，且必须通过 core-owned admission 与 safety gate。

预期输出：

- minimal command set
- command authority law
- transport and schema direction
- rejected command shapes

### Batch 3: Runtime Hook, Agent Port, And Attachment Model _(historical batch label)_

目标：冻结 controlled、auditable、disabled-near-zero 的 runtime attachment substrate。Browser hook、Node daemon、Playground wiring、cloud registration、CLI/daemon transport 都是 adapter conformance 问题，不是模型中心。

Reviewer focus：

- browser global hook 是否应存在。
- `globalThis.__LOGIX_AGENT_RUNTIME_HOOK__` 是否可作为 browser dev attachment vocabulary。
- core 是否应只暴露 `RuntimeAgentPort`，并把 global hook 留给 adapters。
- Node、browser、Playground、cloud attachment 如何共享同一 semantic contract。
- permission、auth、tenant、session、bridge lifecycle 如何建模。
- 如何保持 disabled bridge overhead near zero。

被拒 candidate split：

```text
core: RuntimeAgentPort DTO and internal service
browser adapter: optional global hook
Node adapter: explicit local daemon registration
cloud adapter: explicit authenticated bridge registration
CLI/daemon: transport and session management
```

已采纳 Batch 3 candidate：

```text
C171-F Core Attachment Authority, Adapter Offer Only =
  core-owned runtime attachment substrate
    -> adapter attach offer
      -> transport / auth / host lifecycle metadata
        -> core admission
          -> canonical evidence producer feed
            -> Workbench projection
              -> runtime.check / runtime.trial / runtime.compare verdict authority
```

Batch 3 冻结：

- `RuntimeAttachment` 仅作为 core-owned attachment substrate semantics 的 planning label。
- Core 拥有 attachment authority、identity coordinate、lifecycle state、capability gate、operation admission、audit/evidence producer feed、canonical evidence handoff、budget/redaction constraints、cleanup invariant、post-commit IO boundary。
- Browser hook 只能作为 dev-only、opt-in、discovery / attach-offer adapter 存在。Exact global name 不冻结。
- Node daemon、Playground wiring、cloud registration、CLI/daemon transport 都是 adapter projections。它们不拥有 runtime identity、session truth、operation authority、evidence envelope、Workbench projection 或 verification verdict。
- Cloud attachment 只通过 safety constraints 进入 shared semantic contract：explicit auth、tenant/session boundary、revocation、audit、redaction、no `globalThis` authority、canonical evidence only。Full cloud registration protocol 保持 deferred。
- Disabled path 必须是 structurally no-op 或 static-empty capability。禁止 per-transaction adapter discovery、transport allocation、listener fanout、buffer allocation、serialization 或 IO。
- Active operation flow 必须是 admission -> runtime scheduling -> post-commit evidence drain -> adapter transport。Synchronous transaction windows 不能执行 IO。

Batch 3 deferred：

- exact internal attachment service name、DTO、schema；`RuntimeAgentPort` 只能作为 rejected/history vocabulary，不是 active authority
- exact browser global hook name
- Node daemon wire framing；host / transport / attachment / runtime coordinate topology 已由 `spec.md` 与 `plan.md` 冻结
- cloud registration protocol
- active-operation payload shape
- public CLI live command shape

预期输出：

- attachment owner law
- accepted hook shape 或 no-hook alternative
- cloud-safety constraints
- lifecycle 与 cleanup requirements

### Batch 4: Reflection Versus Live Evidence

目标：降低 static reflection burden，并决定哪些 facts 移到 live evidence。

已采纳 Batch 4 candidate：

```text
C171-H Static Reflection Contract, Canonical Live Evidence Facets =
  167 static reflection contract spine
    -> static-live binding header
      -> canonical live evidence event / artifact facets
        -> Workbench projection
          -> runtime.check / runtime.trial / runtime.compare closure
```

Batch 4 冻结：

- Reflection 只拥有 static declaration、Program/module contract、action tag、payload schema summary、validator availability and issue shape、sourceRef、manifest digest、manifest diff facts。
- Reflection 不拥有 active runtime/session/operation truth、event emission、operation admission、selector route runtime observation、host commit、profile、snapshot 或 capture result truth。
- Live operation、selector-route、host-commit、profile、snapshot、budget、drop、redaction、degraded、capture facts 只能作为 event 或 artifact facets 进入 canonical evidence。
- 不采纳 durable live evidence sidecar、second manifest family、live-owned validator、second operation event law 或 Workbench-owned fact。
- Static-live binding 使用 minimal header：manifest digest、action tag、payload schema ref 或 validator availability ref、binding status、gap 或 denial reason、runtime coordinate。`actionContractDigest` 在后续 proof 前只保持 internal-derived。
- Mutation-capable live operations 面对 stale manifest、digest mismatch、unavailable action contract、unauthorized target、missing validator for non-void dispatch 时产出 structured denial，且 no runtime mutation。Observation-only missing data 产出 evidence gap。
- Selector-route observation、host commit、profile、snapshot evidence 不能产出 `runtime.check` 或 startup-trial verdicts，除非存在 explicit scenario evidence 或 repo-internal host-harness artifact authority。
- `EvidenceWindow` 是 capture metadata。`CanonicalEvidenceExport` 是 handoff capability。两者都不是 second envelope 或 durable sidecar。

Reviewer focus：

- 哪些 reflection facts 仍是 mandatory static facts。
- 哪些 current reflection ambitions 可降级为 live evidence。
- stale manifest 与 live runtime mismatch 应如何表示。
- payload validation 是否保持 reflection-owned。
- live operation facets、selector route evidence、host commit evidence、profile evidence 如何经 canonical evidence 进入 Workbench。
- `RuntimeReflectionManifest` 是否应保持 static contract spine，并避免为 live evidence 承担 vNext 或 sidecar 角色。

被拒 broad split：

| Static reflection | Live evidence |
| --- | --- |
| declaration | active runtime |
| Program blueprint | active module instance |
| capabilities/imports/services summary | txn/op stream |
| action contract and payload schema | dispatched operation result |
| sourceRef and manifest digest | host commit/profile evidence |
| static selector-quality artifact refs | runtime selector route observation |

已采纳 field-level split：

| owner lane | facts |
| --- | --- |
| 167 static reflection | declaration, Program/module contract, action tag, payload schema summary, validator availability and issue shape, sourceRef, manifest digest, manifest diff |
| 171 live evidence through canonical envelope | active runtime/module/instance, txn/op, operation admission/result/denial, selector route observation, host commit, profile, snapshot, capture window, budget, dropped/degraded/redaction markers |
| static-live binding header | manifest digest, action tag, payload schema or validator availability ref, binding status, gap/denial reason, runtime coordinate |
| 09 canonical evidence / compare | evidence summary digest, artifact refs, admissibility, compare input; no new report or verdict |
| 165 Workbench projection | session, finding, artifact, coordinate, metric, denial, degradation and evidence gap projection with `authorityRef` or `derivedFrom` |
| Playground / DVTools hosts | host state, selection, layout, drilldown and adapter projection only |

已采纳 outcome 与 projection split：

| concern | frozen answer | materialized owner |
| --- | --- | --- |
| static binding failure for mutation-capable operation | stale manifest, digest mismatch, unavailable action contract, unauthorized target, and missing validator for non-void dispatch produce `operation.denied` and no mutation | `171` admission outcome taxonomy, `167` static-live binding law |
| observation-only missing data | missing coordinate, redacted host fact, dropped capture, or over-budget capture produce evidence gap or degradation marker | `171`, `09`, `165` |
| admitted operation result | accepted operation emits `operation.accepted`, then `operation.completed` or `operation.failed` | `171`, canonical evidence facets |
| selector/host/profile/snapshot stage | quality claims carry `stageClass`; live observations without stage authority stay drilldown-only or gap | `09`, `165` |
| Workbench join | live facets enter `truthInputs`, static binding refs enter `contextRefs`, selection manifests enter `selectionHints` | `165` |

预期输出：

- adopted static/live split
- evidence gap taxonomy
- required updates to 167 and 168

### Batch 5: DevTools, Playground, And Workbench Convergence

目标：决定 DevTools panel 中哪些暂停、哪些保留、哪些移动到 Agent-first evidence 后面。

Reviewer focus：

- 哪些 DevTools panel capabilities 应立即停止。
- 哪些 DevTools capabilities 作为 viewer 仍有价值。
- Playground 如何 dogfood live bridge，同时不定义 product-only truth。
- 一个 session/finding/artifact model 如何服务 CLI、DevTools、Playground 和 imported evidence。
- Workbench Kernel 在 live bridge work 前是否需要扩展。

预期输出：

- DevTools disposition table
- Playground dogfood path
- Workbench projection additions
- Workbench host / capture / viewer / explainer boundaries

已采纳 Batch 5 candidate：

```text
C171-I Shared Workbench Projection Hosts =
  DevTools and Playground as repo-internal hosts
    -> same Runtime Workbench authority bundle
      -> truthInputs / contextRefs / selectionHints
        -> canonical evidence and owner-approved artifact refs only
          -> no host-owned session, finding, artifact, operation, report, evidence, verdict, or runtime truth
```

Batch 5 冻结：

- DVTools 保留 repo-internal Workbench host、capture surface、evidence viewer、report explainer、debug drilldown、selection manifest export 和 Agent repair coordinate surface。
- DVTools 暂停或删除 panel-only fact derivation、private session/finding/artifact truth、default raw timeline as main view、default time travel/state mutation、product redesign、public package surface、Batch 6 allowlist 之外的 operation controller UI。
- Playground 是 dev-only dogfood host。它可以 submit adapter offers、provide source/context refs，并 consume live evidence projections。
- Playground UI state、product scenario playback、preview state、source editor selection、demo metadata 不能创建 live operation、host、selector、profile、snapshot、report、verdict 或 finding truth。
- Repo-internal debug drilldown feeds 不能直接进入 Workbench truth。它们必须先 normalize into canonical evidence facets、artifact refs、degradation notices 或 evidence gaps。
- Workbench Kernel 不需要 new root entity；Batch 5 只收紧 host conformance 到 `truthInputs`、`contextRefs`、`selectionHints`。

Batch 5 dogfood path:

```text
Playground dev host
  -> adapter offer
    -> live target discovery
      -> static-live binding
        -> Batch 6 allowlisted operation or capture slot
          -> canonical evidence export
            -> Workbench projection
              -> verification/compare handoff
```

### Batch 6: Security, Budget, And Debug Operation Safety

目标：在 active debug operations 变成 command requirements 前先挑战其安全性与预算边界。

Reviewer focus：

- dispatch through CLI 是否应进入 P1。
- arbitrary state patch 或 time travel 是否应继续排除。
- action dispatch、snapshot、profile、wait、export 的 permission model。
- Redaction 和 sensitive data policy。
- localhost、token、origin、process、tenant、cloud boundaries。
- event stream、snapshot、profiling、bridge idle path、disabled path 的 performance budgets。

预期输出：

- debug operation allowlist
- P1/P2 safety gate
- budget and redaction requirements
- rejected active operation list

已采纳 Batch 6 candidate：

```text
C171-J Minimal Safe Operations With Budget Gates =
  P1 allowlisted operations
    -> core admission + permission + static-live binding
      -> redaction + budget gates
        -> post-commit evidence drain
          -> structured denial with no mutation on precondition failure
```

Batch 6 冻结 P1 operation allowlist：

| operation kind | status |
| --- | --- |
| `target.discover` | P1 |
| `capture.eventWindow` | P1 |
| `snapshot.read` | P1 read-only |
| `wait.condition` | P1 no runtime mutation |
| `evidence.export` | P1 |
| `dispatch.declaredAction` | P1 mutation-capable with full admission |
| `profile.runtimeSummary` | P1 local-only bounded summary |

Batch 6 下沉到 P2 或后续：

- browser CPU profile integration
- heap snapshot
- remote/cloud mutation
- long-running stream
- cross-process aggregation

Batch 6 拒绝：

- arbitrary state patch
- time travel mutation
- hidden internal mutation
- undeclared action dispatch
- dynamic code eval
- host DOM mutation through bridge
- transaction-window IO
- unbounded raw trace stream

准入请求最小字段：

- actor id
- adapter kind
- session、tenant 或 process boundary，存在时必填
- target coordinate
- operation kind
- permission scope
- 使用 capability lease 时，必须包含 lease id、过期时间和撤销状态
- origin 或 process id，存在时必填
- mutation-capable 时必须包含 static-live binding header
- budget profile
- redaction policy ref

默认预算：

- disabled path: structural no-op；无 capture buffer、serialization、transport IO 或 transaction 内 listener fanout。
- disabled p95 regression gate: 相对可比较 baseline 不超过 1 percent 或 0.05 ms。
- event-window 默认预算: 每个 target/window 256 events；硬 proof 上限 2048。
- event payload inline summary: 4 KiB；更大内容转为 artifact ref、degradation marker 或 redaction marker。
- snapshot inline preview: 64 KiB；更大内容转为带 budget marker 的 artifact ref。
- local runtime profile summary: 最长 5 秒，只允许 sampled summary；P1 无 heap 或 CPU trace。
- evidence export inline budget: 2 MiB；更大输出必须使用 artifact refs 和 budget markers。

### Batch 7: Kernel Researchability And AutoResearch Readiness

目标：决定 `171` 应为未来 AutoResearch-style loop 准备 kernel、bridge、CLI、Workbench 到什么程度，同时把完整 autonomous experiment orchestration 和 adoption 留在当前 closure scope 之外。

Reviewer focus：

- Agent-researchable kernel 是否应成为显式 `171` north-star extension。
- 哪些 internal decisions 和 costs 必须足够 white-box，才能被 Agent collection。
- 哪些 metric families 应作为本规格 readiness signals 预备。
- 哪些 evidence fields 是未来让 baseline 与 candidate runs 可比较所必需的。
- 哪些 future AutoResearch concepts 必须保持 deferred，避免 `171` 变成 self-modifying system spec。
- 如何防止 researchability capture 违反 hot-path budgets、redaction、transaction-window rules 或 SSoT authority。
- readiness evidence 应如何关联 `docs/review-plan/runs`、perf evidence artifacts、CLI `CommandResult`、Workbench evidence 和 SSoT updates。

必须留在当前 closure 外的 future adoption algebra pressure：

```text
adoptable =
  hard_gates_pass
  AND primary_metric_improves_beyond_noise
  AND protected_metrics_no_regression
  AND complexity_delta_within_budget
  AND public_surface_delta_allowed
  AND evaluation_scope_unchanged
  AND ledger_complete
```

Candidate researchability signal families：

| family | example metrics | owner candidate |
| --- | --- | --- |
| runtime perf | p50/p95 txn commit, allocation, subscription fanout | perf evidence |
| bridge overhead | disabled overhead, enabled capture cost, dropped events | 171 live bridge |
| Agent repair | time to locate target, retries, closure success, compare pass rate | CLI/control plane |
| diagnostics | evidence gap rate, focusRef coverage, artifact link completeness | Workbench/control plane |
| API generation | invalid generation rate, red-line hit rate, typecheck pass rate | docs/skills/spec fixtures |
| docs quality | task completion from docs, stale concept hits, forbidden shape hits | docs standards |

预期输出：

- adopt, shrink, or reject Agent-researchable kernel as a `171` north-star extension
- first internal decision and cost families to expose
- minimal comparable evidence fields for future baseline-versus-candidate comparison
- deferred list for full AutoResearch loop, adoption ledger, autonomous adoption, and 24h operation
- proof boundaries that keep researchability capture within performance, redaction, and SSoT authority

已采纳 Batch 7 candidate：

```text
C171-K Researchability Header Only =
  comparable evidence header
    -> bounded summaries and explicit gaps
      -> future specs can judge whether deeper collection is possible
        -> no metric-family, decision-trace, adoption, ledger, loop, merge, publish, release, or SSoT authority in 171
```

Batch 7 冻结 first-slice white-box families，且只允许 bounded summaries：

- attachment lifecycle summary
- operation admission summary
- capture budget, drop and redaction summary
- selector route observation classification
- transaction and operation count summary
- evidence producer drop summary
- evidence export size and duration summary

Batch 7 冻结 minimal comparable evidence header fields：

- `evidenceSummaryDigest`
- `captureWindow`
- `stageClass` 或 admissibility class
- `runtimeCoordinate`
- `manifestDigest`
- `envFingerprintRef`
- `sourceDigestRef` 或 build digest ref，存在时提供
- `budgetProfileRef`
- `samplingProfileRef`
- `redactionPolicyRef`
- `proofCommandRef[]`
- `metricRef[]`，只包含 owner 与 unit
- `dropped`、`degraded` 和 `redacted` markers
- `gap[]`
- `authorityRef` 或 `derivedFrom`

Batch 7 后置到 future specs：

- full experiment loop
- mutable candidate scope
- immutable evaluation harness owner
- primary metric and noise model
- protected metric registry
- keep/discard/crash/escalate policy
- adoption algebra
- adoption ledger schema
- autonomous adopt/discard
- 24h loop operation
- merge, publish, release
- autonomous SSoT rewrite

## 实施前必须关闭

- [x] Q171-001 Decide whether CLI live lane becomes a first-class CLI surface or stays repo-internal until proof. Target: `spec.md`, `15-cli-agent-first-control-plane.md`. CLI owner rewrite adopted `logix live <task>` as first-class public live namespace with core-owned semantics.
- [x] Q171-002 Decide whether browser global hook is an owned requirement or adapter detail. Target: `spec.md`, later `plan.md`. Batch 3 adopted browser hook as optional browser adapter detail only; exact name is not frozen.
- [x] Q171-003 Decide the minimum P1 live command set. Target: `spec.md`, later `plan.md`. CLI owner rewrite adopted `logix live start/stop/status/targets/inspect/capture/snapshot/wait/dispatch/profile/export evidence` as the bounded public live command set; flat roots remain rejected.
- [x] Q171-004 Decide the live transport envelope relationship to `CommandResult`. Target: `spec.md`, `15-cli-agent-first-control-plane.md`. `LiveCommandResult` serves public live stdout transport; `CommandResult` remains stage stdout for `check / trial / compare` and is not a live session envelope.
- [x] Q171-005 Decide controlled debug operation allowlist for P1. Target: `spec.md`, later `plan.md`. Batch 6 adopted C171-J: P1 allowlist is target discovery, event-window capture, read-only snapshot, wait condition, evidence export, declared action dispatch, and local-only bounded runtime profile summary.
- [x] Q171-006 Decide static reflection versus live evidence ownership split. Target: `spec.md`, `167-runtime-reflection-manifest/spec.md`. Batch 4 adopted C171-H: static reflection contract, static-live binding header, and canonical live evidence facets; no durable live sidecar or second manifest family.
- [x] Q171-007 Decide DevTools panel disposition: pause, viewer-only, or selective retained slices. Target: `spec.md`, `14-dvtools-internal-workbench.md`. Batch 1 adopted repo-internal Workbench host/capture/viewer/explainer, with no product truth.
- [x] Q171-008 Decide canonical evidence package extension path for live evidence. Target: `09-verification-control-plane.md`, `165-runtime-workbench-kernel/spec.md`. Batch 1 adopted single canonical evidence envelope exit; fields remain later planning.
- [x] Q171-009 Decide security model for local, browser, Node, Playground, and cloud attachment. Target: `spec.md`, later `plan.md`. Batch 3 froze attachment-level safety constraints: explicit auth where remote, tenant/session boundary, revocation, audit, redaction, no `globalThis` authority for cloud, canonical evidence only, and adapter-offer boundary. Exact cloud product protocol remains deferred.
- [x] Q171-010 Decide performance budget owner and proof commands. Target: `spec.md`, later `plan.md`. Batch 6 adopted owner split: `02` owns disabled hot-path gate, 171 security-budget owns enabled capture/export budget, perf notes store evidence. Proof commands use `pnpm perf collect`, `pnpm perf diff`, and `pnpm perf validate`.
- [x] Q171-011 Decide whether Agent-researchable kernel becomes an explicit `171` north-star extension. Target: `spec.md`, later `plan.md`. Batch 7 narrowed this to researchability-compatible evidence header in `171`; broader research loop is future spec.
- [x] Q171-012 Decide which internal runtime decisions and costs must be white-box enough for live evidence. Target: `spec.md`, later `plan.md`. Batch 7 adopted bounded summaries only: attachment lifecycle, operation admission, capture budget/drop/redaction, selector observation classification, txn/op counts, producer drops, export size/duration.
- [x] Q171-013 Decide the minimal metric baseline and comparable evidence fields needed for future baseline-versus-candidate comparison. Target: `spec.md`, later `plan.md`. Batch 7 adopted researchability header fields only, including evidence digest, capture window, stage/admissibility class, coordinates, digests, env/budget/sampling/redaction refs, proof command refs, metric refs with owner/unit, markers, gaps and authority refs.
- [x] Q171-014 Decide which full AutoResearch loop concepts are deferred to a future spec. Target: `spec.md`, possible future spec. Batch 7 deferred experiment loop, mutable candidate scope, harness owner, primary metric/noise model, keep/discard/crash/escalate policy, adoption algebra, adoption ledger, 24h loop, merge/publish/release and autonomous SSoT rewrite.

## Deferred / Non-Blocking

这些项目已经完成当前轮裁决：它们不阻塞 `171` planning closure，也不进入当前 implementation authority。未来重开时必须走对应 owner spec 或新 spec。

| id | 项目 | 当前裁决 | 重开条件 |
| --- | --- | --- | --- |
| Q171-D01 | Browser extension packaging | deferred | local bridge 与 Playground dogfood 已证明 |
| Q171-D02 | Full cloud remote debugging product surface | deferred | local attachment 与 explicit attachment semantics 已证明 |
| Q171-D03 | Time travel 与 arbitrary state patching | deferred | 单独证明 active state mutation 不会形成第二 runtime system |
| Q171-D04 | Visual DevTools panel redesign | deferred | Workbench projection 与 live evidence identity 稳定 |
| Q171-D05 | Full React DevTools protocol integration | deferred | Logix 自身 runtime attachment substrate 与 evidence law 已证明 |
| Q171-D06 | Fully autonomous merge、publish 或 SSoT rewrite | deferred | future adoption policy 与 human freeze policy 已证明 |
| Q171-D07 | Full AutoResearch-style experiment orchestration、mutable candidate scope、immutable evaluation scope、adoption gate、adoption ledger schema | deferred | researchability evidence 稳定后进入 future spec |
| Q171-D08 | 24h Agent research loop operation | deferred | benchmark noise、security、permission、write authority 单独证明 |

## 历史候选形态

这些形态在 Batch 1 到 Batch 7 后已经不再是同等活跃方案。当前状态见 [Candidate Status After Batch 7](#candidate-status-after-batch-7)。

### C171-A: Verification-only CLI Plus Internal Bridge _(rejected by Batch 1 target function)_

摘要：public CLI 保持 `check / trial / compare`；live bridge 只作为 Playground 与 DevTools 的 repo-internal support。

优势：

- public-surface cost 最低
- 保留 current CLI SSoT
- immediate docs churn 较小

弱点：

- Agent 无法通过 public CLI 可靠 discover 和 control live runtime
- live debug 仍分裂在 internal tools 中
- external Agent workflows 的 happy path 较弱

### C171-B: CLI With Separate `live` Lane _(rejected by Batch 2 for 171)_

摘要：保留 `check / trial / compare` 作为 verification stage routes，并新增 `logix live ...` 作为 Agent-first live collaboration lane。

优势：

- 直接匹配 Agent workflow
- live evidence 与 verification verdicts 分离清楚
- 可吸收大部分 DevTools value

弱点：

- 需要 rewrite CLI SSoT
- 引入 transport 与 permission surface
- 需要更强 schema 与 budget discipline

### C171-C: Daemon-first Without Expanding CLI Commands _(superseded by C171-G internal bridge handoff)_

摘要：暴露由 Agent tools 消费的 daemon protocol；CLI 只 start、stop 和 export evidence。该候选已被后续 attachment-first 终局替换，daemon 只能保留为 transport projection。

优势：

- 避免 large CLI command family
- 更容易支持 future UI 和 remote clients

弱点：

- 把 Agent integration 推到另一套 protocol
- 可能迫使 agents 学 daemon-specific RPC shapes
- 存在 hidden second tool surface 风险

### C171-D: DevTools Panel-first Workbench _(rejected by Batch 1 owner law)_

摘要：继续投入 DevTools panel，再把 selected evidence export 到 CLI。

优势：

- human debugging 保持丰富
- 复用 existing DevTools package work

弱点：

- 没有针对 Agent as first consumer 优化
- 容易保留 panel-specific state 和 workflow pressure
- 到 CLI repair closure 的路线更慢

### C171-E: Core Live Bridge First, Conditional CLI Live _(adopted by Batch 1)_

摘要：先构建 core live bridge substrate。Public CLI live commands 保持 conditional，直到 `15` rewrite，且 dogfood proof 证明 command surface 相比 repo-internal bridge transport 有价值。

优势：

- Batch 1 的 smallest accepted concept set
- 避免与 `15` 立即发生 CLI public-surface conflict
- 通过 canonical evidence envelope 保持 one evidence authority
- 保留 future CLI live route headroom
- 让 Playground 和 DVTools 在 public command freeze 前 dogfood real live evidence

弱点：

- final command-shape decision 延后到 Batch 2
- planning 中需要清晰 repo-internal transport 或 dogfood harness
- 在 CLI live proof 出现前，对 Agent workflows 不够直接

## Batch 7 后建议

Batch 7 后当前推荐是把 C171-K 叠加在 C171-E 到 C171-J 之上：

```text
current public CLI:
  logix check / trial / compare

public CLI:
  check / trial / compare
  logix live ...

runtime:
  core-owned attachment substrate

adapters:
  attach offer + transport / auth / host lifecycle metadata

truth:
  core attachment authority
    -> canonical evidence envelope
      -> Workbench projection
        -> existing VerificationControlPlaneReport
```

Batch 1 仍持有 high-level C171-E baseline：core live bridge first。CLI owner rewrite 已把 conditional CLI live 收敛为 `logix live <task>` public namespace。Batch 3 把 runtime attachment model 收敛为 C171-F：core attachment authority, adapter offer only。Batch 5、Batch 6、Batch 7 分别关闭 Workbench host parity、safe operation gates 与 researchability header scope。

## Public CLI Command-shape Intake

针对 [proposals/agent-first-flat-cli.md](./proposals/agent-first-flat-cli.md) 的 `$plan-optimality-loop` 已被用户目标函数重开并收口。

已采纳裁决：

```text
Public Live Namespace Contract =
  final public CLI: check / trial --mode startup / compare
    + logix live <task>
    -> reserved future grammar: trial --mode scenario
      -> flat root status/capture/snapshot/wait/export rejected
      -> trigger renamed to live dispatch
```

评审账本：[../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md](../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md)。

冻结结论：

- `flat-first` 不作为 public CLI 目标函数。
- 完整公开 CLI 合同已冻结到 [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)：`logix check`、`logix trial --mode startup`、`logix compare`、`logix live <task>`。
- `logix trial --mode scenario` 是 reserved future grammar；core-owned scenario executor 落地前只能结构化失败。
- `status / capture / snapshot / wait / export` 已归位为 `logix live` 子命令，不再作为 root command。
- `trigger` 被拒绝；public mutation command 固定为 `logix live dispatch`，且必须 1:1 映射 `dispatch.declaredAction` admission、denial 和 failure taxonomy。
- `logix live export evidence` 不接受裸 session truth；它只能输出 canonical evidence package ref、artifact refs、budget markers 或 evidence gaps。
- help grouping 或 executable discovery 不能替代 `15` 的 package-local static schema artifact 与 docs SSoT。

## Batch 7 后候选状态

| candidate | status | reason |
| --- | --- | --- |
| keep CLI at three commands | superseded by CLI owner rewrite | 三命令仍是 verification law，但不足以承载用户要求的 public runtime/server communication。 |
| zero public live commands, internal bridge handoff | superseded | Batch 2 历史上成立；用户目标函数要求 public CLI live 形态后，改由 `logix live` namespace 承接。 |
| core live bridge first, conditional CLI live | adopted with CLI rewrite | 保留 live bridge substrate；conditional CLI live 已收敛为 public `logix live <task>`。 |
| core attachment authority, adapter offer only | adopted Batch 3 as C171-F | 在 concept-count、public-surface、migration-cost、proof-strength、future-headroom 上优于 Batch 3 split。 |
| static reflection contract, canonical live evidence facets | adopted Batch 4 as C171-H | 保留 single reflection owner 与 single canonical evidence path，优于 manifest-vNext 与 durable-sidecar alternatives。 |
| shared Workbench projection hosts | adopted Batch 5 as C171-I | 通过一套 projection law 约束 Agent route、DVTools 与 Playground，优于私有 derivation。 |
| minimal safe operations with budget gates | adopted Batch 6 as C171-J | P1 收敛为 admission-proven operations，并带 budget、redaction、no-mutation denial。 |
| researchability header only | adopted Batch 7 as C171-K | 只暴露 comparable headers，并把 metric-family 与 decision-trace expansion deferred。 |
| full public `logix live ...` command family | adopted with restricted namespace | 不采纳 Batch 2 的无界 family；采纳 `15` 中受限子命令表、`LiveCommandResult`、core-owned semantics 和 no-second-truth gates。 |
| public `logix live export` single command | adopted as `logix live export evidence` | 只能输出 canonical evidence package ref，不接受裸 session truth。 |
| executable live command discovery | deferred | 会重开 `15` discovery boundary，并产生第四个 public surface 风险。 |
| flat top-level `status/capture/snapshot/trigger/wait/export` | absorbed and rejected as roots | 能力归位到 `logix live`；flat roots 不进入 public CLI。 |
| read-only `logix capture` only | superseded | 单命令 fallback 对 Agent live workflow 过窄，已被受限 `logix live` namespace 替代。 |
| limited `logix live <task>` 或 `logix debug <task>` namespace | `logix live <task>` adopted, `debug` rejected | `live` 隔离 non-report live/evidence tasks；`debug` 过宽。 |
| global hook only | rejected | Browser-only attachment 无法承载 Node 与 cloud semantics，且会把 adapter detail 泄露到 core。 |
| exact browser global hook name | rejected | adapter proof 前冻结 exact hook name 会过早形成 public mental model。 |
| `RuntimeAgentPort` DTO first | rejected | exact name/DTO 会在 permission 与 operation allowlist closure 前过早冻结。 |
| per-adapter object model | rejected | 分离 browser/Node/Playground/cloud objects 会增加 concept count 与 second-truth risk。 |
| cloud product registration now | rejected | full remote cloud product surface deferred；当前只冻结 cloud-compatible constraints。 |
| explicit runtime layer only | deferred | 可能有实现价值，但不能替代 C171-F attachment authority law。 |
| bridge exports only evidence, no active operations | rejected Batch 6 | C171-J 冻结 admission 与 no-mutation denial 后，该方案对 Agent repair loop 过弱。 |
| dispatch only, no profiling | superseded Batch 6 | P1 包含 declared action dispatch 与 local-only bounded runtime profile summary；deep profiling 仍属 P2/future。 |
| profile only through React DevTools protocol | rejected Batch 6 | 过早绑定 React-specific protocol；P1 只允许 local bounded runtime summary。 |
| researchability readiness inside 171 | adopted only as header metadata | Metric families、decision traces、adoption logic 保持在 `171` 外。 |
| full AutoResearch loop inside 171 | rejected | 对 live bridge closure 过宽。 |
| full AutoResearch loop as follow-up spec | deferred | evidence 稳定后可作为 future target。 |
| unconditional public CLI live | rejected Batch 1 | 在 dogfood proof 前与当前 `15` owner law 冲突。 |

## 落盘目标

这些 items 在 review 前刻意不持有 authority。被接受后才移动到列出的 artifacts。

| item | target artifact |
| --- | --- |
| CLI-live public namespace | `spec.md`、`discussion.md`、`15-cli-agent-first-control-plane.md`、`proposals/agent-first-flat-cli.md` |
| future CLI command-shape intake | `15-cli-agent-first-control-plane.md`、`proposals/agent-first-flat-cli.md`、`discussion.md`、`spec.md`、`docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md` |
| repo-internal live bridge transport handoff | `spec.md` 与 `plan.md` |
| `logix live` command family | `15-cli-agent-first-control-plane.md` 和后续 `plan.md` |
| RuntimeAttachment substrate | `spec.md`、`plan.md`、可能的 core internal contract doc |
| Browser hook constraints, no exact name | `spec.md` 与 `plan.md` |
| internal attachment service exact name / DTO | permission 与 operation allowlist closure 后 deferred 到 implementation contract；不能成为 public 或 SSoT primary noun |
| Node daemon carrier details | protocol framing deferred；语义已由 `plan.md` 的 host / transport / attachment topology 冻结 |
| Cloud registration protocol | local 与 explicit attachment semantics 证明后 deferred 到 future cloud product design |
| Static/live reflection split | `167-runtime-reflection-manifest/spec.md` 与 `spec.md` |
| DVTools Workbench host/capture/viewer/explainer disposition | `14-dvtools-internal-workbench.md` 与 `spec.md` |
| Live evidence package fields | `09-verification-control-plane.md` 与 `165-runtime-workbench-kernel/spec.md` |
| Playground dogfood happy path | `168-kernel-to-playground-verification-parity/spec.md` 与 future plan |
| Debug operation safety model | `spec.md`、`plan.md`、`implementation-details/security-budget.md` |
| Performance budget and proof commands | `02-hot-path-direction.md`、`spec.md`、`plan.md`、`implementation-details/security-budget.md` |
| Agent mental model docs | adoption 后的 user docs 与 standards |
| Researchability-compatible header metadata | `spec.md`、`plan.md`、`implementation-details/evidence-facets.md` |
| Researchability signal families | deferred-only，可能进入 follow-up spec |
| Comparable evidence fields for future baseline/candidate runs | 只作为 header-only fields 写入 `spec.md`、`plan.md`、`implementation-details/evidence-facets.md` |
| AutoResearch-style adoption algebra | deferred-only，可能进入 follow-up spec |
| Adoption ledger schema | deferred discussion，可能进入 follow-up spec |
| First 24h Agent loop | deferred discussion，可能进入 follow-up spec |

## 裁决反链

- [spec.md](./spec.md)
- [proposals/agent-first-flat-cli.md](./proposals/agent-first-flat-cli.md)
- [../../docs/proposals/live-daemon-lifecycle-architecture-memo.md](../../docs/proposals/live-daemon-lifecycle-architecture-memo.md)
- [../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md](../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md)
