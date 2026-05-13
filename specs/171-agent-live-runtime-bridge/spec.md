# 功能规格：Agent Live Runtime Bridge
**Status**: Done

**分支**: `171-agent-live-runtime-bridge`
**创建日期**: 2026-05-01
**状态**: Done
**输入**: "把 Agent-first live runtime bridge 独立成 171。重新审视 CLI、DevTools、Playground、runtime hook 与 reflection 的北极星，让 Agent 能通过 live bridge 获取真实运行时上下文、主动触发受控调试操作、导出 canonical evidence，并把现有 DevTools 面板能力压入 Agent-first CLI 和 Workbench 体系。"

## 北极星与裁剪特性追踪

- **北极星编号**: NS-3, NS-4, NS-5, NS-7, NS-8, NS-10
- **裁剪特性编号**: KF-3, KF-4, KF-6, KF-8, KF-9, KF-10

## 当前角色

本页是 Agent Live Runtime Bridge 的需求事实源。

本页只为一个目标重开 CLI / DVTools / reflection 边界：定义 Agent-first live runtime 协作链路，使 Agent 能发现活跃 runtime 拓扑、观察真实 host/runtime evidence、触发受控 debug operation，并把结果导出为现有 verification control plane 可消费的 canonical evidence。

本页持有需求与关闭门槛，不启动实现。候选形态、review batch、被拒方案与 plan-optimality-loop 输入保存在 [discussion.md](./discussion.md)。任何已采纳裁决必须回写到本规格、`plan.md`、`tasks.md` 或对应 owner SSoT。

## 实施关闭记录

### 2026-05-02

171 implementation closure 已完成。关闭证据见 [notes/verification.md](./notes/verification.md) 与 [notes/perf-evidence.md](./notes/perf-evidence.md)。

已关闭范围：

- core-owned live attachment、target discovery、static-live binding、operation admission/denial、canonical evidence facets、Workbench projection、CLI `logix live <task>` namespace、DVTools/Playground projection parity、examples/logix-react live bridge dogfood route。
- full `examples/logix-react test:browser:playground` route suite。
- no bridge / bridge disabled / adapter present inactive 三态 disabled overhead perf proof。
- final forbidden text sweep。
- run -> live evidence -> trial repair handoff，其中 live output 只给 repair clues，`VerificationControlPlaneReport.repairHints` 继续是唯一 repair advice authority。

后续不阻塞项：

- full before/after live compare deep closure。
- remote/cloud mutation、browser CPU profile、heap snapshot、long-running stream 与 autonomous research/adoption loop。

2026-05-02 post-closure reopen：

- 参考 `callstackincubator/agent-react-devtools` 后确认：171 的 semantic MVP 已大于参考项目，但当前 `logix live` 产品可用性仍没有完全大于等于参考项目。缺口不是 owner law，而是真实 local carrier：browser WebSocket adapter、local daemon、CLI IPC client、Vite dev plugin entry、`@logixjs/react/dev/live` dev-only import entry、多 tab attachment projection 和 daemon-backed capture/export proof。
- 该缺口被提升为 171 的 post-closure implementation delta。执行计划见 [implementation-plan-real-carrier.md](./implementation-plan-real-carrier.md)。
- 原 [implementation-plan.md](./implementation-plan.md) 保持为已执行 semantic MVP worker plan，不覆盖历史 proof；real carrier 计划只替换当前 in-process proof transport，不改变 171 的 owner law。

2026-05-03 post-closure implementation closure：

- real local carrier 已完成：browser WebSocket adapter、local daemon、CLI IPC client、Vite dev plugin entry、`@logixjs/react/dev/live` dev-only import entry、多 tab attachment projection、daemon-backed operation lane、daemon lineage export 和 evidence handoff proof 已关闭。
- concurrent attachment isolation 已完成：ambiguous target、显式 `attachmentId` 并发 routing、forged response ignore、daemon lineage export 与 duplicate bare capture ref gap 已关闭。
- daemon lifecycle hardening 已完成：daemon 启动策略收回 repo-internal launcher；metadata 收敛为 carrier-local operator snapshot；默认启动路径是 current CLI re-exec + hidden `__internal_live_daemon` selector；无 supervisor，无 `ensure/restart/logs/doctor` public lifecycle grammar，无第二 daemon bin build surface。

2026-05-03 follow-up handoff to 172：

- 171 关闭 live carrier、attachment、operation lane、并发隔离与 evidence handoff；它不再继续扩张为完整 Runtime inspect data plane。
- 概念 DevTools parity 的后续收口交给 [../172-agent-first-runtime-inspect-data-plane/spec.md](../172-agent-first-runtime-inspect-data-plane/spec.md)：Agent-first CLI 要能通过有限 parity matrix 和 `LiveInspectArtifact(section=...)` 读取 Runtime inspect facts，包括 state、actions、events/timeline、fields、operation summary、workbench/evidence bridge。
- 若为了 CLI 终局需要新增或调整内核 hook，172 通过 core pressure lane 持有；CLI 不能在 carrier 层或命令层拼第二套 Runtime truth。

## 规划产物

当前规划产物：

- [discussion.md](./discussion.md): review batch、候选形态、被拒方案、deferred items 和落盘目标。
- [plan.md](./plan.md): 中文执行约束、实施门、阶段计划、验证矩阵与回写目标。
- [implementation-plan.md](./implementation-plan.md): 已执行的 semantic MVP writing-plans 实施计划，按文件落点、TDD 步骤、验证命令和回写门拆分；不再代表真实 carrier 的剩余实施细节。
- [implementation-plan-real-carrier.md](./implementation-plan-real-carrier.md): 已执行的 post-closure worker 实施计划，用于补齐真实 local daemon、browser WebSocket adapter、CLI IPC client、双前端 dev entry、多 tab attachment projection 和 daemon-backed evidence proof；其早期第二 daemon bin 形态已被 launcher/operator snapshot hardening 收敛为 current CLI re-exec。
- [implementation-plan-concurrency-isolation.md](./implementation-plan-concurrency-isolation.md): post-carrier hardening 计划，用于把 attachment-first routing、pending response identity guard 和 daemon lineage export 做到多 tab / 并发请求不串数据。
- [../172-agent-first-runtime-inspect-data-plane/spec.md](../172-agent-first-runtime-inspect-data-plane/spec.md): 171 后续 Runtime inspect data plane 收口规格，用双轨 lane 处理 core pressure 与 CLI product polish。
- [../../docs/proposals/live-daemon-lifecycle-architecture-memo.md](../../docs/proposals/live-daemon-lifecycle-architecture-memo.md): daemon lifecycle architecture memo，用于沉淀 `launcher clean cut + carrier-local operational gates` 的仓库级边界判断；它不是新需求，也不是新实施方案。
- [research.md](./research.md): 已采纳决策、已关闭研究门和实施前结论。
- [scenarios.md](./scenarios.md): 171 实施完毕后用户和 Agent 的经典场景目录，逐条映射 CLI、proof、task 和 future 边界。
- [data-model.md](./data-model.md): 内部规划数据模型，不冻结公开 DTO。
- [contracts/README.md](./contracts/README.md): 内部规划合同，不是公开 API。
- [quickstart.md](./quickstart.md): 证明流程、验证命令和负向扫查。
- [tasks.md](./tasks.md): 中文任务拆分；T001 到 T137 已完成，覆盖 semantic MVP、terminal topology alignment、real carrier、concurrent attachment isolation 与 launcher/operator snapshot hardening。
- [implementation-details/](./implementation-details/): attachment、transport topology、evidence、安全预算、harness-first 路线、拆解规划说明。
- [notes/](./notes/): 实施后的 verification/perf evidence 记录位置。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-1.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-1.md): Batch 1 owner-law ledger。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-2.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-2.md): Batch 2 CLI live surface ledger。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-3.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-3.md): Batch 3 runtime attachment ledger。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-4.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-4.md): Batch 4 reflection/live evidence ledger。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-5.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-5.md): Batch 5 DevTools/Playground/Workbench convergence ledger。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-6.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-6.md): Batch 6 security/budget/operation safety ledger。
- [../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-7.md](../../docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-7.md): Batch 7 researchability readiness ledger。
- [proposals/agent-first-flat-cli.md](./proposals/agent-first-flat-cli.md): flat CLI 初始提案吸收记录；flat root commands 已归位为 `logix live <task>` namespace，公开 CLI 最终合同已回写到 `15-cli-agent-first-control-plane.md`。
- [../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md](../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md): future CLI live/debug/evidence command-shape ledger。

## 已澄清裁决

### 2026-05-01

- `171` 当前不定义完整 AutoResearch 风格自演进循环。它只准备未来循环所需的 kernel 可研究性与证据就绪度；自主采纳、merge、publish 和完整 24h 运行全部后置。
- Batch 1 采纳 `C171-E Core Live Bridge First, Conditional CLI Live`。`171` 先持有 core live bridge、canonical evidence export、Workbench projection 和 attachment owner law。Public CLI live commands 需要后续 `15` owner rewrite 与 dogfood proof。
- Batch 2 的历史裁决 `C171-G Zero Public Live Commands, Internal Bridge Handoff` 已被后续 CLI owner rewrite 重开。当前采纳 `C171-L Public Live Namespace With Core-Owned Semantics`：public CLI 增加 `logix live <task>` namespace；flat root commands 不进入 public root；live commands 只路由 core-owned attachment、operation admission、capture 与 canonical evidence handoff，不拥有 report、stage、policy、verdict、session、runtime identity 或 evidence-envelope authority。
- Batch 3 采纳 `C171-F Core Attachment Authority, Adapter Offer Only`。`171` 冻结 core-owned runtime attachment substrate 与安全不变量。Browser hook、Node daemon、Playground wiring、cloud registration、CLI/daemon transport 都只是 adapter offer 或 transport projection。具体 hook 名称、port DTO、cloud protocol、active-operation payload shape 继续后置。
- Batch 4 采纳 `C171-H Static Reflection Contract, Canonical Live Evidence Facets`。Reflection 拥有 static declaration/action/payload/source/manifest facts。Active runtime、operation、selector、host、profile、capture facts 只能作为 canonical evidence event 或 artifact facets 进入。禁止 durable live sidecar、second manifest family、live validation owner 和 Workbench-owned fact。
- Batch 5 采纳 `C171-I Shared Workbench Projection Hosts`。DVTools 与 Playground 是同一 Workbench projection law 上的 repo-internal hosts。它们可以 capture、view、explain、select、dogfood canonical evidence，但不能定义 session、finding、artifact、operation、report、evidence、verdict 或 runtime truth。
- Batch 6 采纳 `C171-J Minimal Safe Operations With Budget Gates`。P1 operations 为 target discovery、event-window capture、read-only snapshot、wait condition、evidence export、declared action dispatch、local-only bounded runtime profile summary。所有 mutation-capable operations 必须通过 admission、permission、static-live binding、redaction、budget、post-commit evidence 和 no-mutation denial。Deep profiling、arbitrary state patching、time travel mutation、dynamic eval、hidden mutation、remote/cloud mutation 不进入 P1。
- Batch 7 采纳 `C171-K Researchability Header Only`。`171` 只冻结可比较 evidence headers 和有界 evidence gaps。Metric families、decision trace families、candidate comparison、adoption algebra、adoption ledger、autonomous loops、merge、publish、release 和 SSoT rewrite authority 均后置到未来 spec。
- Future CLI command-shape review 的旧结论已被用户目标函数重开并替换为 `Public Live Namespace Contract`。`flat-first` 仍不作为目标函数；完整公开 CLI 合同冻结在 `15-cli-agent-first-control-plane.md`：`logix check`、`logix trial --mode startup`、`logix compare`、`logix live <task>`。`status / capture / snapshot / wait / export` 作为 `logix live` 子命令归位；`trigger` 被拒绝并改为 `logix live dispatch`，且必须 1:1 映射 `dispatch.declaredAction` admission、denial、failure taxonomy。

## 背景

既有 runtime verification 已收敛到 `runtime.check / runtime.trial / runtime.compare` 和紧凑 CLI route。这条路线仍然负责可复现 verification reports 与 repair closure。

新增压力超过 verification 本身：

- Agent 调试运行中的 app 时，需要列出 active runtimes、modules、instances、transactions、operations、selector routes、host bindings 和 live evidence windows。
- Reflection 单独承载真实 runtime 与 host context 会导致内部链路过度静态化。
- DevTools panel work 已经和 Agent CLI 需要的 evidence、session、finding、artifact 空间重叠。
- Playground 需要可信的 Agent-first happy path，覆盖真实 runtime、React host、browser 和 evidence export 行为。
- React-like global hook pattern 有参考价值，但 Logix core 必须同时适配 browser、Node、cloud attachment。
- 未来 AutoResearch-style loops 需要先有 researchable kernel：runtime decisions、costs、baselines、evidence gaps、behavior deltas 必须可观察、bounded、可比较、可归因，然后才能设计 autonomous adoption mechanism。

最终方向是一条新的 live lane：

```text
Agent
  -> live runtime collaboration route
    -> `logix live ...`
      -> core-owned runtime attachment
        -> live evidence
          -> canonical evidence package
            -> runtime.check / runtime.trial / runtime.compare
```

本规格刻意拆开两个职责：

- verification stages 继续持有 machine reports 与 repair closure authority。
- live bridge 持有 discovery、observation、controlled debug operations 和 evidence export。

## 终局方案

171 的终局不是把 WebSocket、daemon 或 browser tab 升格为一等协议，而是固定一条分层链路：

```text
host offer
  -> transport projection
    -> core-owned attachment
      -> normalized live topology
        -> canonical evidence facets
          -> Workbench projection
            -> verification closure
```

规则：

- Core owns attachment authority、target identity、lifecycle、admission、evidence、budget、redaction 和 cleanup。
- Browser tabs、Node processes、Playground hosts 和 cloud sessions 都只是 host locators，不是 runtime truth。
- 同一 runtime 可以在多个 attachment 中出现；每个 browser tab 或 process 都要提交自己的 attachment offer，并获得自己的 `attachmentId`。
- `tabId` 只是 browser host metadata。它能帮助人区分两个 tab，但 CLI 和 Workbench 必须以 `attachmentId + hostCoordinate + runtimeCoordinate + target coordinate` 为准。
- `targetCoordinate` 不保证跨 attachment 全局唯一；live operation 只能在解析到唯一 attachment 后发送。若只靠 target 匹配到多个 attachments，daemon 必须返回 `ambiguous-live-target`。
- `requestId` 只在 daemon pending lane 内成立；browser response 还必须匹配同一个 WebSocket 和 `attachmentId`，否则不能 resolve request。
- evidence export 的稳定输入是 daemon lineage ref。裸 `captureId` 可作为非歧义别名，但重复命中多个 lineage 时必须返回 `ambiguous-live-artifact-ref`。
- Local WebSocket、socket、stdio 或 daemon carrier 都只是 transport projection。carrier 可以换，semantic contract 不能换。
- `logix live` 输出可以带 attachment / host locators，方便 Agent 区分并行 attachment，但这些 locators 不构成 session truth 或 report truth。

## 规划基线

已采纳的 Batch 1 planning baseline 是 `C171-E`: Core Live Bridge First, Conditional CLI Live。

该基线为每个 surface 分配单一职责：

- Runtime core 以 attachment substrate 身份拥有 live attachment semantics。具体导出名、DTO shape、browser hook name、daemon wire framing、cloud registration protocol、active-operation payload shape 保持后置；host / transport / attachment / runtime coordinate topology 已由本规格冻结。
- live bridge 拥有 attach、observe、act、capture、export。
- CLI 冻结 `check / trial / compare` 作为 verification routes，并冻结 `logix live <task>` 作为 live runtime collaboration route。`logix live` 必须使用 `LiveCommandResult` transport，只输出 live target、operation、capture、profile、evidence handoff 或 gap，不输出 verification verdict。
- Bridge adapters 向同一 runtime attachment semantics 提交 attachment offers 和 transport metadata。
- 多个 browser tabs、Node processes 和 Playground sessions 通过 attachment offer 分开投影；如果它们指向同一 runtime/module/instance，CLI 仍要把它们当成不同 attachment 观察。
- Workbench 拥有把 evidence 投影为 session、finding、artifact、coordinate、metric、gap views 的 projection law。
- DVTools 保持 repo-internal Workbench host、capture、viewer、explainer duties；product/public truth 不进入 panel。
- Playground 用 running host 和 real evidence export 证明完整 Agent-first loop。
- Reflection 保持 static contract spine；live evidence 通过 canonical evidence event 或 artifact facets 承载 active runtime facts。两者由 manifest digest、action tag、payload schema 或 validator availability refs、runtime coordinate、binding status、structured denial、evidence gaps 连接。
- DevTools 和 Playground 消费与 Agent live route 相同的 Workbench projection law。Host-specific UI state、product scenarios、panel selection、source editor state、raw timeline views 不能创建 truth。
- Controlled operations 使用 Batch 6 allowlist 与 safety tiers。P1 profiling 限定为 local-only bounded runtime summary。Remote/cloud mutation 需要后续 product protocol。
- `171` 中的 researchability 限定为可比较 evidence headers 与显式 gaps。更深的 metrics 与 adoption loops 留在本规格之外。

后续 review 只有在替代方案同时保持或改善 Agent repair closure、concept count、safety boundary 与 evidence authority 时，才能替换该基线。

## 权威与 Owner Law

| 主题 | Owner | `171` 规则 |
| --- | --- | --- |
| Verification verdicts | `09-verification-control-plane.md` | Live bridge 只产出 evidence 与 hints；`runtime.check / runtime.trial / runtime.compare` 保持 report authority。 |
| CLI route | `15-cli-agent-first-control-plane.md` 加本规格 | `check / trial / compare` 是 verification public routes；`logix live <task>` 是 live runtime collaboration public route。`logix live` 不拥有 report、stage、verdict、session、runtime identity 或 evidence-envelope authority。 |
| Runtime attachment | Runtime core，后续 plan contract | Core 拥有 attachment authority、identity coordinates、lifecycle state、capability gate、operation admission、evidence producer feed、budget/redaction constraints、cleanup invariant 和 post-commit IO boundary。Browser hook、Node daemon、Playground wiring、cloud registration、CLI/daemon transport 都是 adapter offers 或 transport projections。任何 attachment 在 lease revoked、explicit disconnect、target unavailable 或 cleanup completed 后都进入 terminal state，后续请求只能返回 `operation.denied`、`evidence.gap` 或 degraded marker，不得恢复成可写 live truth。 |
| Canonical evidence | Verification control plane 与 Workbench Kernel | Bridge export 只有一条 authority path：canonical evidence envelope。Live operation、selector-route、host-commit、profile、snapshot、budget、drop、redaction facts 只能作为 envelope event 或 artifact facets 进入。额外 host files 只能作为 envelope artifact refs 或 evidence gaps 出现。 |
| Workbench projection | `165-runtime-workbench-kernel` 与 DVTools SSoT | Session、finding、artifact、coordinate、metric、operation denial facet、degradation、evidence gap projections 在 CLI、DevTools、Playground 之间共享。Workbench 只投影 owner-backed facts，不拥有 standalone denial truth family。 |
| DVTools panel | `14-dvtools-internal-workbench.md` | DVTools 保持 repo-internal Workbench host、capture surface、viewer、explainer。它不拥有 product truth、report truth 或 evidence truth。 |
| Reflection | `167-runtime-reflection-manifest` | Static declaration、Program/module contract、action tag、payload schema summary、validator availability and issue shape、sourceRef、manifest digest、manifest diff 保留在 reflection。Active runtime/session/operation facts 不进入 manifest。Live operations 必须绑定匹配 static facts，失败时产出 structured denial 或 evidence gaps。 |
| Playground | `168-kernel-to-playground-verification-parity` 加 future plan | Playground 是 live bridge 的 dogfood host，不是单独 truth source。 |
| Researchability readiness | 本规格，后续 follow-up spec | `171` 只准备 researchability-compatible evidence headers 与 gaps。未来 specs 拥有 metric families、decision trace families、experiment loops、ledgers 和 adoption policy。 |

## 准入结果分类

Live operation evidence 在 browser、Node、Playground、cloud adapters、DVTools 与 repo-internal bridge transport 之间共用同一 admission taxonomy。

| 条件 | 允许结果 | mutation 规则 | canonical evidence facet | Workbench projection |
| --- | --- | --- | --- | --- |
| manifest digest 匹配、action 已声明、validator 可用或 void dispatch、target 已授权 | admitted operation | operation 通过 transaction-window 与 capability checks 后可运行 | `operation.accepted`，随后 `operation.completed` 或 `operation.failed` | session/debugEvidence/artifact/degradation nodes |
| stale manifest、digest mismatch、unavailable action contract、missing validator for non-void dispatch | structured denial | no runtime mutation | 带 binding header 与 denial reason 的 `operation.denied` | operation denial facet；强投影不成立时附 evidence gap |
| undeclared、unauthorized、unsafe、stale 或 revoked target | structured denial | no runtime mutation | 带 target coordinate 与 denial reason 的 `operation.denied` | operation denial facet；target 不可信时附 evidence gap |
| observation-only missing data、missing coordinate、redacted host fact、dropped capture、over-budget capture | evidence gap | 未请求 mutation | `evidence.gap` 或 degraded capture facet | evidence gap 或 degradation notice |
| operation 已 admitted，但 runtime execution 失败 | post-admission failure | mutation state 以 owner runtime 报告为准 | 带 result summary digest 与 bounded cause 的 `operation.failed` | run/debug failure drilldown，不能成为新 verdict |

规则：

- `operation.denied` 是 pre-mutation，必须包含 actor、operation kind、已知 target coordinate、相关 binding header、denial reason、timestamp 或 sequence coordinate、budget/redaction markers。
- `operation.failed` 只允许出现在 accepted operation 之后。它不能隐藏 static binding failure、unauthorized target、validator absence 或 digest mismatch。
- Observation-only gaps 不能升级为 operation denial，除非请求了 mutation-capable operation。
- Workbench 可以投影 denial 与 failure facets，但 diagnostic findings 仍需要 control-plane report authority、evidence gap authority 或 degradation authority。

## DevTools、Playground 与 Workbench 收敛

Batch 5 冻结 `C171-I Shared Workbench Projection Hosts`。

| 宿主 | 保留职责 | 暂停或删除职责 |
| --- | --- | --- |
| DVTools | repo-internal Workbench host、evidence capture surface、imported/live evidence viewer、report explainer、debug drilldown、selection manifest export、Agent repair coordinate surface | panel-only fact derivation、private session/finding/artifact truth、default raw timeline as main view、default time travel/state mutation、product redesign、public package surface、Batch 6 allowlist 外的 operation controller UI |
| Playground | dev-only dogfood host、adapter offer producer、source/context provider、live evidence projection consumer、compare handoff proof surface | product scenario truth、UI-state-derived live facts、preview-state operation truth、product-only finding truth、authority lanes 中的 fake diagnostics rows |
| Workbench Kernel | 使用 `truthInputs`、`contextRefs`、`selectionHints` 的 projection-only authority bundle consumer | new root entity、verdict owner、session truth owner、evidence envelope owner、host state owner |

Dogfood path：

```text
Playground dev host
  -> adapter offer
    -> live target discovery
      -> static-live binding
        -> Batch 6 allowlisted operation or capture slot
          -> canonical evidence export
            -> Workbench projection
              -> runtime.check / runtime.trial / runtime.compare handoff
```

规则：

- 同一个 canonical evidence package 或 live session projection 必须在 Agent route、DVTools、Playground 中产生等价 session、finding、artifact、coordinate、metric、degradation、evidence gap ids。
- DVTools live 与 imported modes 必须使用同一 projection law。
- Playground dogfood 可在 Batch 6 gates 后使用 allowlisted operation slot；在此之前可证明 discovery、capture、export、projection、compare handoff。
- Unsupported panel-only 或 product-only facts 变成 viewer-local gaps、drilldown locators 或 discussion items。
- Repo-internal debug drilldown feeds 不能直接进入 Workbench truth。它们必须先 normalize 为 canonical evidence facets、artifact refs、degradation notices 或 evidence gaps。

## 受控操作安全与预算

Batch 6 冻结 `C171-J Minimal Safe Operations With Budget Gates`。

P1 operation allowlist：

| operation kind | mutation | 必需 gate | evidence |
| --- | --- | --- | --- |
| `target.discover` | no | adapter offer, session/process boundary, redaction | topology result or evidence gap |
| `capture.eventWindow` | no | target coordinate, capture budget, sampling, redaction | capture facet with window/budget/drop markers |
| `snapshot.read` | no | target coordinate, read budget, serialization/redaction policy | snapshot artifact ref or degraded preview |
| `wait.condition` | no runtime mutation | target coordinate, timeout, predicate owner, budget | wait completed/failed/gap facet |
| `evidence.export` | no runtime mutation | canonical envelope writer, artifact budget, redaction | evidence package and artifact refs |
| `dispatch.declaredAction` | yes | actor, capability grant, target coordinate, manifest digest, action tag, payload schema ref or validator availability ref, binding status | accepted/completed/failed/denied operation facets |
| `profile.runtimeSummary` | observation only, local-only | local dev attachment, explicit opt-in, max duration, sampling, redaction | bounded summary artifact or degraded marker |

P2 或后续：

- browser CPU profile integration.
- heap snapshot.
- remote/cloud mutation.
- long-running stream.
- cross-process aggregation.

已拒绝 operations：

- arbitrary state patch.
- time travel mutation.
- hidden internal mutation.
- undeclared action dispatch.
- dynamic code eval.
- host DOM mutation through bridge.
- transaction-window IO.
- unbounded raw trace stream.

准入请求最小字段：

- actor id.
- adapter kind.
- session、tenant 或 process boundary，存在时必填。
- target coordinate.
- operation kind.
- permission scope.
- 使用 capability lease 时，必须包含 lease id、过期时间和撤销状态。
- origin 或 process id，存在时必填。
- mutation-capable 时必须包含 static-live binding header。
- budget profile.
- redaction policy ref.

默认预算：

- disabled path: structural no-op；无 capture buffer、serialization、transport IO 或 transaction 内 listener fanout。
- disabled p95 regression gate: 相对可比较 baseline 不超过 1 percent 或 0.05 ms。
- event-window 默认预算: 每个 target/window 256 events；硬 proof 上限 2048。
- event payload inline summary: 4 KiB；更大内容转为 artifact ref、degradation marker 或 redaction marker。
- snapshot inline preview: 64 KiB；更大内容转为带 budget marker 的 artifact ref。
- local runtime profile summary: 最长 5 秒，只允许 sampled summary；P1 无 heap 或 CPU trace。
- evidence export inline budget: 2 MiB；更大输出必须使用 artifact refs 和 budget markers。

脱敏类别：

- secret、token、cookie、header、env 和 config values。
- tenant、user、session、origin 和 process identifiers。
- user payload values 与 action payload values。
- host DOM text、path、URL、browser storage 和 source snippets。
- stack traces、raw error causes、network metadata 和 filesystem paths。
- large、cyclic、non-serializable 或 high-cardinality values。

Omitted data 必须产出 redaction marker、degradation marker 或 evidence gap。

## 可研究性 Header

Batch 7 冻结 `C171-K Researchability Header Only`。

第一片 white-box families 只允许有界 summaries：

- attachment lifecycle summary。
- operation admission summary。
- capture budget、drop 与 redaction summary。
- selector route observation classification。
- transaction 与 operation count summary。
- evidence producer drop summary。
- evidence export size 与 duration summary。

最小可比较 evidence header fields：

- `evidenceSummaryDigest`.
- `captureWindow`.
- `stageClass` 或 admissibility class。
- `runtimeCoordinate`.
- `manifestDigest`.
- `envFingerprintRef`.
- `sourceDigestRef` 或 build digest ref，存在时提供。
- `budgetProfileRef`.
- `samplingProfileRef`.
- `redactionPolicyRef`.
- `proofCommandRef[]`.
- `metricRef[]`，只包含 owner 与 unit。
- `dropped`、`degraded` 和 `redacted` markers。
- `gap[]`.
- `authorityRef` or `derivedFrom`.

规则：

- Detailed metric families、decision trace families、candidate comparison 保持在 `171` 外。
- Missing、sensitive、high-cardinality 或 expensive fields 必须变成 evidence gaps 或 redaction markers。
- Workbench 可以把 researchability headers 投影为 metric、degradation、drilldown 或 gap nodes。它不能发出 adopt/discard verdicts。
- Future AutoResearch specs 可以消费这些 headers，但不能从 `171` 继承 runtime、verification、Workbench、CLI 或 SSoT authority。

## 范围

### 范围内

- Agent-first live runtime bridge requirements。
- Conditional CLI live capability preconditions 及其与现有 `check / trial / compare` 的关系。
- 面向 browser、Node、Playground、cloud attachment 的 runtime attachment requirements。
- runtime、module、instance、transaction、operation、selector、host binding views 的 active topology discovery。
- Controlled debug operation requirements，包括 dispatch、wait、snapshot、profile、event stream、evidence export。
- static reflection 与 live evidence 之间的 reflection boundary reallocation。
- DVTools 被重定位为没有 product truth 的 repo-internal Workbench host、capture surface、viewer 和 explainer。
- Playground 作为 live bridge dogfood host 的职责。
- 面向 future comparison 的 researchability-compatible evidence header，但不包含 metric family 或 adoption-loop authority。
- Security、permission、budget、sampling、disabled-overhead、deterministic coordinate requirements。
- 后续 plan-optimality-loop work 的 review object structure。

### 范围外

- 本轮直接实现代码。
- 面向业务 authoring 的 live debugging public API。
- 为先前 DevTools 或 CLI command constraints 保留兼容。
- 新增 `Runtime.devtools`、`runtime.devtools`、`Runtime.inspect`、`runtime.inspect` 或 `Logix.Reflection` public root。
- DevTools-owned report protocol、evidence envelope、scenario language 或 finding truth。
- CLI-owned verification report truth。
- Browser extension productization。
- 超出 initial attachment 与 permission requirements 的 full remote cloud control-plane design。
- Full AutoResearch-style experiment orchestration、autonomous adoption policy、adoption ledger schema、24h loop operation、merge、publish 或 release automation。
- 没有 review gates 的 fully autonomous publishing、merging、releasing 或 SSoT authority change。

## 引入权威

- [../../docs/adr/2026-04-04-logix-api-next-charter.md](../../docs/adr/2026-04-04-logix-api-next-charter.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/02-hot-path-direction.md](../../docs/ssot/runtime/02-hot-path-direction.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [../159-dvtools-internal-workbench-cutover/spec.md](../159-dvtools-internal-workbench-cutover/spec.md)
- [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md)
- [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md)
- [../166-playground-driver-scenario-surface/spec.md](../166-playground-driver-scenario-surface/spec.md)
- [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)
- [../168-kernel-to-playground-verification-parity/spec.md](../168-kernel-to-playground-verification-parity/spec.md)
- [../169-kernel-selector-route/spec.md](../169-kernel-selector-route/spec.md)

## 关闭条件与护栏

### 关闭合同

- Existing CLI SSoT 已修订：`check / trial / compare` 保持 verification frozen routes，`logix live <task>` 成为 public live runtime collaboration route。
- Existing DVTools SSoT 已修订，使 panel work 保持 repo-internal Workbench host/explainer duties，并消费同一 bridge/workbench evidence，且不拥有 product truth。
- 第一版 planning baseline 把 core live bridge 作为必需的 Agent runtime collaboration substrate；public CLI live shape 已收敛为 `logix live <task>`。
- Runtime attachment substrate、adapter-offer boundary、cloud-compatible safety constraints、budget model、transaction-window IO boundary、disabled-overhead expectation 已冻结。
- Static reflection 与 live evidence responsibilities 已分离，采纳裁决已回写到 reflection 与 workbench SSoTs。
- Static-live binding 是显式的：mutation-capable operations 在 runtime scheduling 前需要 valid target coordinate、manifest digest、action tag、payload schema 或 validator availability ref、binding status。
- live route 可以 discover active runtime topology 并 export evidence，且不创建 second verification report truth。
- Controlled debug operations 需要 permissioned、auditable，并产出 stable operation evidence。
- Live evidence 可以进入 canonical evidence package，然后 feed `runtime.check / runtime.trial / runtime.compare`。
- Playground 可以用 real runtime 与 host evidence dogfood happy path。
- bridge evidence 暴露 researchability-compatible evidence headers，但不在 `171` 中授予 metric、experiment 或 adoption authority。
- Text sweep 验证不会出现新的 public `Runtime.devtools`、`Runtime.inspect`、`Logix.Reflection`、DevTools-owned report truth、CLI-owned report truth、CLI-owned live session truth 或 flat root live commands。

### 必须裁剪

- 把三个 verification commands 当作 live runtime collaboration 的充分覆盖。
- 把 DevTools panel 当作 runtime debugging strategy 的 primary surface。
- 在 repo-internal bridge transport 或后续 proven CLI route 可用之前等待 panel completeness。
- DevTools-owned session、finding、report、evidence 或 scenario truth。
- CLI-owned verification report truth。
- 把 full static reflection 当作取得 runtime context 的唯一路径。
- Public root inspection APIs。
- 把 hidden state mutation、time travel 或 arbitrary internal patching 当作默认 debug operations。
- 把 browser-only global singleton 当作唯一 attachment mechanism。
- 把 browser global hook exact naming 作为 Batch 3 frozen contract。
- 把 `RuntimeAgentPort` 作为 public 或 SSoT primary noun。
- Adapter-owned runtime identity、session、finding、evidence summary 或 verdict truth。
- 无法 normalize into canonical evidence envelope 或 Workbench projection 的 bridge output。
- canonical evidence envelope 外的 parallel evidence artifacts。
- Durable live evidence sidecars、live-owned payload validators、second operation-event laws 或 Workbench-owned operation truth。
- 在没有 explicit scenario evidence 或 host-harness artifact authority 时，把 selector-route observation、host commit evidence 或 profile evidence 当作 `runtime.check` 或 startup-trial verdicts。
- 把 live evidence readiness 当作 Agent-authored candidates 可以 mutate harnesses、hide failed runs、bypass gates 或 auto-adopt changes 的许可。

### 重开门槛

采纳后只有下列证据可以重开本规格：

- Live bridge 在 measured hot-path baselines 中引入不可接受的 disabled-path overhead。
- 稳定 runtime topology 无法在不破坏 core ownership 或 security constraints 的前提下暴露。
- Controlled debug operations 无法安全到足以给 Agent 使用。
- Canonical evidence package 无法表达必需 live bridge facts，除非形成第二 envelope。
- 在真实 dogfood sessions 中，conditional CLI live route 被证明比 repo-internal bridge transport 或 panel-assisted workflow 更适合 Agent repair。
- Cloud attachment 需要与 browser 和 Node attachment 根本不同的 core contract。
- Researchability signals 被证明过于噪声、昂贵或不完整，无法支持未来 baseline-versus-candidate comparison。

## 用户场景与测试

### 用户故事 1：Agent 发现活跃 Runtime Topology，P1

作为调试运行中 Logix app 的 Agent，我需要发现 active runtimes、modules、instances 及其 stable coordinates，以便不用猜 source text 或 human logs 就能定位正确 target。

**Traceability**: NS-3, NS-4, NS-8, KF-3, KF-4

**优先级理由**: Runtime topology discovery 是最小可用 live bridge capability。没有它，后续 snapshot、dispatch、profile、evidence export 都不能安全定位 target。

**独立测试**: 启动包含多个 runtime instances 的 dogfood app，连接 bridge，确认 Agent 能通过 machine-readable live route output 列出 runtimes、modules、instances、readiness status 和 stable coordinates。

**验收场景**:

1. 给定 running app 中存在带多个 module instances 的 Logix runtime，当 Agent 请求 live topology 时，结果包含 runtime id、module id、instance id、status 和 last observed transaction coordinate。
2. 给定多个 runtimes 已连接，当 Agent 列出 runtimes 时，每个 runtime 都有足以 selection 的 stable identity 与 host context。
3. 给定没有 runtime 已连接，当 Agent 请求 live topology 时，结果报告 explicit connection gap，且不伪造 runtime data。

---

### 用户故事 2：Agent 观察 Live Evidence 且不拥有 Verdicts，P1

作为 Agent，我需要从 live runtime 观察 event streams、snapshots、selector routes 和 host evidence windows，以便在保留现有 verification report authority 的前提下诊断行为。

**Traceability**: NS-4, NS-5, NS-8, NS-10, KF-4, KF-6, KF-8

**优先级理由**: Live evidence 提供 static reflection 和 startup trial 无法完整覆盖的 context。它必须保持 evidence 身份，不能变成 parallel verdict system。

**独立测试**: 连接 live runtime，围绕一次 user action 捕获 bounded evidence window，导出后喂给现有 Workbench projection 与 verification routes。

**验收场景**:

1. 给定 runtime emits transactions and operations，当 Agent 捕获 live window 时，每个 event 在可用时携带 stable runtime/module/instance/txn/op coordinates。
2. 给定 bridge 捕获 host-level data，当它 export evidence 时，该 evidence 被标记为 host evidence，且不声明 `runtime.check`、`runtime.trial` 或 `runtime.compare` verdicts。
3. 给定 bridge 因 budget drop 或 truncate data，当 Agent 读取 export 时，package 包含 degraded 或 dropped metadata。

---

### 用户故事 3：Agent 执行 Controlled Debug Operations，P1

作为 Agent，我需要通过 safe debug operations 触发 declared actions、等待 conditions、启动和停止 profiling、请求 snapshots，以便在 repair loop 中复现并定位问题。

**Traceability**: NS-3, NS-4, NS-8, NS-10, KF-3, KF-4, KF-8, KF-9

**优先级理由**: Agent repair 需要超过 passive observation。Controlled operations 让 loop 可执行，但必须 gated 且 auditable。

**独立测试**: 运行 live bridge session，让 Agent dispatch declared action、等待 stable condition、捕获 before/after snapshots，并导出 operation evidence。

**验收场景**:

1. 给定 module 暴露 reflected declared action，当 Agent 通过 bridge 用 valid payload dispatch 它时，runtime 记录 accepted operation、completion 或 failure，以及 resulting coordinates。
2. 给定 Agent 尝试 undeclared 或 unauthorized operation，当 bridge 评估该请求时，operation 以 structured denial 拒绝，且没有 hidden runtime mutation。
3. 给定 live session 启用 profiling，当 Agent start 和 stop profiling 时，report 是 bounded、exportable，并连接到 runtime/session coordinates。

---

### 用户故事 4：Agent 把 Live Session 转为 Verification Closure，P1

作为 Agent，我需要把 live session freeze 成 canonical evidence，然后使用 `trial` 或 `compare`，让 live debugging 能闭合到现有 self-verification loop。

**Traceability**: NS-4, NS-5, NS-8, NS-10, KF-4, KF-6, KF-8, KF-9

**优先级理由**: live bridge 的价值取决于它能否改善 repair closure，而不是制造新的 inspection island。

**独立测试**: 捕获 failing live session、export evidence、运行现有 verification stage、应用 repair、导出或 rerun after evidence，并 compare before/after reports。

**验收场景**:

1. 给定 live session 捕获 failure，当 Agent export evidence 时，该 export 可被 verification stage 引用，且不改变 report authority。
2. 给定 before 和 after evidence packages 存在，当 Agent 运行 compare 时，compare 使用现有 admissibility rules 并返回 standard compare verdict。
3. 给定 live export 缺少 required coordinates，当 Workbench 或 verification 消费它时，结果包含 evidence gap，而不是 invented finding。

---

### 用户故事 5：维护者围绕 Agent-first Evidence 重定位 DevTools 与 Playground，P2

作为 Logix maintainer，我需要 DevTools 和 Playground 消费与 CLI 相同的 live evidence 与 Workbench projections，避免 panel UI 和 product demos 分裂 runtime truth。

**Traceability**: NS-5, NS-7, NS-8, NS-10, KF-6, KF-8, KF-10

**优先级理由**: DevTools 和 Playground 应证明并可视化同一条 Agent-first bridge path，不能与它竞争 truth。

**独立测试**: 在 Agent live route、DVTools、Playground 中使用同一个 evidence package 或 live session projection，并确认它们对 session、finding、artifact、coordinate、evidence gap identities 的理解一致。

**验收场景**:

1. 给定 live session 已 exported evidence，当 DevTools 打开它时，DevTools 展示由同一 evidence package 派生的 Workbench projections。
2. 给定 Playground 运行 dogfood scenario，当 Agent 使用 live route 时，Playground 与 Agent output 引用相同 runtime/session coordinates。
3. 给定 DevTools 需要 unsupported panel-only fact，当该 fact 无法映射到 evidence 或 Workbench projection 时，它保留为 viewer-local gap 或 discussion item。

---

### 用户故事 6：维护者为 Agent Researchability 准备 Kernel，P2

作为 Logix maintainer，我需要 runtime kernel、bridge、CLI、Workbench evidence 暴露 comparable internal decisions、costs、baselines 和 evidence gaps，使未来 Agent research loop 能根据 measurements 判断 candidate improvements。

**Traceability**: NS-4, NS-5, NS-8, NS-10, KF-4, KF-6, KF-8, KF-9

**优先级理由**: live bridge 是让 runtime internals 足够 white-box 以支持未来 continuous improvement 的第一处机会。本轮只准备 measurement substrate，不拥有 autonomous adoption。

**独立测试**: 从受控 internal change 或 simulation 捕获 baseline 和 candidate evidence，然后确认 exported evidence 能识别 comparable headers、metric refs、evidence gaps、proof-command refs 和 environment fingerprints，且不声明 adopt/discard verdict。

**验收场景**:

1. 给定 baseline 和 candidate evidence packages 存在，当它们被比较时，shared metrics、coordinates、windows、budgets、degraded markers 足够稳定，可以解释 observed deltas。
2. 给定 runtime 产生 internal scheduling、selector、subscription 或 diagnostic decision，当 researchability capture 启用时，evidence 包含 bounded summary header 或 explicit evidence gap。
3. 给定未来 self-evolution loop 需要 adoption inputs，当它消费 `171` evidence 时，它可以引用 baselines、metric refs、proof-command refs、environment fingerprints，同时把 adopt/discard policy 留给 future spec。

### 边界情况

- Bridge 被误加载到 production。
- 多个 browser tabs 或 Node processes 注册相似 runtime labels。
- Runtime reload、HMR 或 lifecycle reset 改变 instance identity。
- Profiling 或 dispatch 期间发生 network disconnect。
- Agent 请求 stale runtime 或 instance coordinate。
- Reflection manifest stale，但 live runtime active。
- Declared action 的 payload validator unavailable。
- Host data 过大、cyclic、non-serializable 或 security-sensitive。
- Diagnostics disabled 或配置为 low level。
- Bridge attached 到 cloud 或 remote environment，且 `globalThis` 不是安全 authority。
- 未来 Agent research loop 需要 current live evidence 无法收集的 metric ref 或 metric family。
- Baseline 与 candidate evidence 使用不同 measurement windows 或 environment fingerprints。
- Detailed decision traces 有暴露 sensitive host data 或 high-cardinality runtime state 的风险。

## 需求

### 功能需求

- **FR-001**: (NS-3, NS-8) 系统 MUST 定义一条独立于 `runtime.check / runtime.trial / runtime.compare` 的 live runtime bridge lane。
- **FR-002**: (NS-3, NS-8) Public CLI live route MUST be `logix live <task>`。Flat root commands `logix status/capture/snapshot/wait/export` 不进入 public root；`trigger` MUST be rejected in favor of `logix live dispatch`。`logix live` MUST NOT own report、stage、policy、verdict、session、runtime identity、operation authority 或 evidence-envelope authority。
- **FR-003**: (NS-4, NS-8) live bridge MUST 在可用时暴露 runtime、module、instance、transaction、operation 与 host context 的 active topology。
- **FR-004**: (NS-4, NS-10) 每个暴露的 live topology item MUST 携带 deterministic coordinates 或 explicit evidence gap。
- **FR-005**: (NS-4, NS-8) 系统 MUST 定义 core-owned runtime attachment semantics，作为包含 identity coordinate、lifecycle state、capability gate、operation admission、evidence producer feed、canonical evidence handoff、budget/redaction constraints、cleanup invariant、terminal-state transition 和 post-commit IO boundary 的 attachment substrate。lease revoked、explicit disconnect、target unavailable 或 cleanup completed 后，attachment MUST 进入 terminal state，且后续请求只能返回 `operation.denied`、`evidence.gap` 或 degraded marker。
- **FR-006**: (NS-10) Browser global-hook attachment、Node daemon registration、Playground wiring、cloud registration、CLI/daemon transport MUST 保持为同一 core-owned attachment substrate 之上的 adapter offers 或 transport projections；exact hook name、port DTO、daemon wire framing、cloud registration protocol、active-operation payload shape 保持 deferred，但 host / transport / attachment / runtime coordinate topology MUST 由本规格冻结并保持稳定。
- **FR-007**: (NS-4, NS-8) live bridge MUST 支持 bounded event streaming、snapshot request、wait condition、local-only bounded runtime profile summary、evidence export 作为 distinct capabilities。
- **FR-008**: (NS-4, NS-8) Controlled debug operations MUST 经过 permission gate，并 MUST 以 structured denial evidence 拒绝 undeclared、unauthorized 或 unsafe operations。
- **FR-009**: (NS-3, NS-4) 通过 bridge 执行 declared action dispatch MUST 依赖 owner-approved reflection 或 action contract data。
- **FR-010**: (NS-4, NS-10) 任何触及 runtime behavior 的 live operation MUST 产出包含 actor、operation kind、target coordinate、timestamp 或 sequence coordinate、result 的 operation evidence。
- **FR-011**: (NS-5, NS-8) Live bridge output MUST 通过 canonical evidence envelope export。额外 host files 只能作为 envelope artifact refs 或 evidence gaps 出现。
- **FR-012**: (NS-5, NS-8) Live bridge evidence MUST 可被现有 Workbench projection 消费，且不创建 bridge-owned session、finding、report 或 evidence truth。
- **FR-013**: (NS-4, NS-8) Static reflection MUST 继续负责无需 live runtime 即可取得的 declaration、Program/module contract、action tag、payload schema summary、validator availability and issue shape、sourceRef、manifest digest、manifest diff facts。
- **FR-014**: (NS-4, NS-8) Live evidence MUST 继续负责需要 active runtime 的 active runtime/module/instance、transaction、operation admission/result、selector route observation、host commit、profile、snapshot、capture budget、drop、redaction、degraded marker、session-window facts。
- **FR-015**: (NS-5, NS-7) DVTools panel work MUST 保持为消费 live evidence 与 Workbench projection 的 repo-internal Workbench host、capture surface、viewer、explainer；它 MUST NOT 定义第二 report protocol 或 evidence envelope。
- **FR-016**: (NS-5, NS-7) Playground MUST 提供至少一条 dogfood path，覆盖 live discovery、controlled operation、evidence export 和 verification closure。
- **FR-017**: (NS-10) 系统 MUST 定义 disabled-mode behavior，并证明 bridge attachment code 在 disabled 时不影响 ordinary hot paths。
- **FR-018**: (NS-10) Bridge evidence MUST 在适用处包含 budget、sampling、truncation、dropped-event、degraded markers。
- **FR-019**: (NS-8, NS-10) Live route output MUST machine-readable、token-budgeted，并稳定到足以支持 Agent retry 与 exact target selection。
- **FR-020**: (NS-10) live bridge MUST 避免名为 `Runtime.devtools`、`runtime.devtools`、`Runtime.inspect`、`runtime.inspect` 或 `Logix.Reflection` 的 public root APIs。
- **FR-021**: (NS-4, NS-10) 如果本规格被 plan-optimality-loop 采纳，existing CLI、DVTools、reflection、Workbench SSoTs MUST 同步更新。
- **FR-022**: (NS-4, NS-8, NS-10) 系统 MUST 在 cheap 且 safe 时把 researchability-compatible evidence headers 放入 canonical evidence：evidence digest、capture window、stage/admissibility class、runtime coordinate、manifest/source/build/env/budget/sampling/redaction refs、proof command refs、带 owner/unit 的 metric refs、markers、authority refs 与 evidence gaps。
- **FR-023**: (NS-4, NS-10) `171` MUST 把 metric families、candidate comparison、decision trace families、candidate mutation、adoption decisions、adoption ledgers、autonomous loop orchestration 留在自身 authority 之外。
- **FR-024**: (NS-5, NS-8) Static reflection 与 live evidence MUST 通过 minimal binding header 连接：manifest digest、action tag、payload schema ref 或 validator availability ref、binding status、gap 或 denial reason、runtime coordinate。`actionContractDigest` 只能在后续 plan 证明能降低歧义后作为 internal derived ref 存在。
- **FR-025**: (NS-10) Mutation-capable live operation 面对 stale manifest、digest mismatch、unavailable action contract、unauthorized target、missing validator for non-void dispatch 或 revoked/disconnected/cleanup-complete attachment 时 MUST 返回 structured denial evidence，且不执行 hidden runtime mutation。Observation-only missing data MUST 返回 evidence gap。
- **FR-026**: (NS-8, NS-10) `logix live` MUST use `LiveCommandResult` as live stdout transport。Durable handoff 只能是 canonical evidence package、selection 或 target coordinates、artifact refs、evidence gaps 和 budget markers。`CommandResult` 继续只作为 `logix check / trial / compare` 的 stdout envelope，MUST NOT 成为 live session envelope。
- **FR-027**: (NS-5, NS-8) Operation accepted/completed/failed/denied facts MUST 以 live operation event facets 进入 canonical evidence，并携带 summary digest、target coordinate、binding header、result summary、budget/redaction markers。Workbench 可把它们投影为 session/debugEvidence/artifact/gap nodes，但除非 control-plane report、evidence gap 或 degradation authority 支撑该 finding，否则 MUST NOT 创建 diagnostic finding。
- **FR-028**: (NS-5, NS-8) Selector-route observation、host-commit evidence、profile evidence、snapshot evidence MUST 作为 capture event 或 artifact facets 进入 canonical evidence，并携带 `captureKind`、coordinate、window、budget、sampling、degraded、dropped、redaction markers。除非存在 explicit scenario evidence 或 repo-internal host-harness artifact authority，否则它们 MUST NOT 产生 `runtime.check` 或 startup-trial verdicts。
- **FR-029**: (NS-4, NS-8) `run -> evidence -> repair` closure MUST route through canonical evidence into `runtime.trial` or `runtime.compare` before producing repair advice。`logix live` MAY emit repair clues such as denial reasons、evidence gaps、degraded markers、target coordinates、binding headers、source refs and artifact refs, but MUST NOT emit `repairHints` or own repair policy。When a live-derived evidence package leads to a localized verification failure, `VerificationControlPlaneReport.repairHints` MUST preserve links back to the live evidence artifact refs and, when available, stable focus coordinates.

### 非功能需求

- **NFR-001**: (NS-10) bridge MUST 在 implementation 前定义 disabled-path 与 enabled-path performance budgets。
- **NFR-002**: (NS-10) Disabled bridge overhead MUST 在 runtime hot paths 上测量并记录，然后才能声明 closure。
- **NFR-003**: (NS-10) Enabled bridge capture MUST 支持 bounded buffers、explicit sampling 和 deterministic drop metadata。
- **NFR-004**: (NS-4, NS-10) Runtime、module、instance、transaction、operation、session、artifact、evidence coordinates MUST 在一次 bridge session 内稳定，并足以支持 Agent rerun。
- **NFR-005**: (NS-8) CLI output MUST 避免把 human-log parsing 作为主要 Agent path。
- **NFR-006**: (NS-10) bridge MUST 为每个 active operation 支持 permission 与 capability gating。
- **NFR-007**: (NS-10) Sensitive host/runtime data MUST 按 explicit policy redacted 或 omitted，omissions MUST 体现为 evidence gaps 或 redaction markers。
- **NFR-008**: (NS-10) Browser、Node、Playground、cloud attachment modes MUST 共享同一 core attachment substrate，即使 adapter carriers、discovery mechanisms、transports 不同。
- **NFR-009**: (NS-4, NS-8) 系统 MUST 保留 transaction window rule：bridge operations 不能在 synchronous transaction windows 内引入 IO。
- **NFR-010**: (NS-5, NS-8) 文档必须定义稳定 Agent debugging mental model，primary concepts 不超过五个。
- **NFR-011**: (NS-10) Researchability-compatible evidence headers MUST bounded、cheap to omit，并明确 environment、sampling、redaction、degraded capture。
- **NFR-012**: (NS-10) Future adoption-gate、experiment-loop、ledger vocabulary MUST 在 `171` 中保持 deferred planning material，MUST NOT 成为本规格 closure authority。

### 关键实体

- **RuntimeAttachment**: core-owned attachment substrate semantics 的 planning label。它不是 frozen public name、DTO name 或 exported schema。它拥有 attachment authority、identity coordinate、lifecycle state、capability gate、operation admission、evidence producer feed、canonical evidence handoff、budget/redaction constraints、cleanup invariant 和 post-commit IO boundary。
- **LiveTarget**: 带 stable coordinate 和 status 的 runtime、module、instance、transaction、operation、selector route 或 host binding target。
- **ControlledOperation**: permissioned live action，例如 declared action dispatch、wait、read-only snapshot、local-only runtime profile summary 或 evidence export。

### Bridge 能力词汇

- **EvidenceWindow**: bounded capture capability 和 canonical evidence `capture.window` metadata shape。它不是 durable sidecar、key entity 或 evidence authority。
- **CanonicalEvidenceExport**: 把 live output 写入 canonical evidence envelope 的 bridge handoff capability。它不是 second envelope、key entity、report、verdict 或 export protocol authority。

## 成功标准

### 可衡量结果

- **SC-001**: (NS-3, NS-8) Agent 可以通过 live route 从 running dogfood app 列出 connected runtimes 和 module instances，且不依赖 human-log parsing。
- **SC-002**: (NS-4, NS-8) live debug session 可以 dispatch declared action、wait condition、capture before/after evidence，并 export canonical evidence package。
- **SC-003**: (NS-5, NS-8) exported evidence 可以被 Workbench projection 消费，再被 verification stage commands 引用，且不创建第二 report truth。
- **SC-004**: (NS-4, NS-8) Static reflection responsibilities 和 live evidence responsibilities 都有文档记录，并在后续 planning 中由至少一个 contract test 或 proof note 覆盖。
- **SC-005**: (NS-10) Disabled bridge overhead 已测量，并保持在 `plan.md` 采纳的 budget 内。
- **SC-006**: (NS-10) Unauthorized debug operation attempts 返回 structured denials，且不产生 hidden runtime mutation。
- **SC-007**: (NS-7, NS-8) DVTools 和 Playground 可以在至少一个 dogfood session 中消费与 Agent live route 相同的 live evidence 或 Workbench projection。
- **SC-008**: (NS-8) Agent repair flow 可以用 stable artifact 和 coordinate references 从 live evidence capture 进入 `trial` 或 `compare` closure。
- **SC-009**: (NS-4, NS-8, NS-10) canonical evidence package 可以暴露 bounded researchability headers、budget markers、degraded markers、environment fingerprint refs、stable coordinate refs、proof command refs、metric refs 和 evidence gaps，足以让 future research loop 判断是否能做 deeper metric collection。
- **SC-010**: (NS-10) Future self-evolution artifacts 可以引用 `171` researchability evidence，但不能声称 `171` 拥有 adopt、discard、merge、publish 或 release decisions。
- **SC-011**: (NS-4, NS-8) 至少一条 dogfood proof 展示 `logix live capture/export evidence -> logix trial or compare -> VerificationControlPlaneReport.repairHints`。该 proof 必须证明 live output 只提供 repair clues，最终 repair hints 由 verification report 持有，并且 `repairHints[].relatedArtifactOutputKeys` 或等价 artifact refs 能追溯到 live-derived evidence。
