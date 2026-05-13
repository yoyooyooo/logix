# 研究记录：Agent Live Runtime Bridge

**日期**: 2026-05-01
**状态**: Batch 1 到 Batch 7 已采纳；实施前置门已转入任务与 proof 执行。

## 已采纳决策

### R171-001: Core Live Bridge First, Public Live Namespace

决策：

- 171 的主目标是 core live bridge substrate。
- public CLI live route 固定为 `logix live <task>`。
- CLI verification routes 继续固定为 `check / trial / compare`。
- flat root commands `logix status/capture/snapshot/wait/export` 不进入 public root；`trigger` 改为 `logix live dispatch`。

理由：

- Agent 需要 live runtime collaboration，且该能力必须以公开 CLI 形态补齐自验证闭环。
- 单一 `logix live` namespace 比 flat root family 更小，能隔离 verification routes 与 live tasks。
- `LiveCommandResult` 只做 stdout transport，不拥有 report、stage、verdict、session、runtime identity、operation authority 或 evidence-envelope authority。

已评估替代方案：

- flat root `logix status/capture/snapshot/wait/export`：已拒绝，能力归位到 `logix live <task>`。
- DevTools panel-first：已拒绝。
- daemon-first public protocol：已拒绝；daemon 只能作为 `logix live start/status/stop` 背后的 transport projection。

### R171-002: Public Live Namespace With Core-Owned Semantics

决策：

- `logix live start/stop/status/targets/inspect/capture/snapshot/wait/dispatch/profile/export evidence` 进入 public CLI surface。
- 每个 live task 必须映射 core-owned capability：`target.discover`、`capture.eventWindow`、`snapshot.read`、`wait.condition`、`dispatch.declaredAction`、`profile.runtimeSummary`、`evidence.export`。
- `LiveCommandResult` 是 live stdout transport；`CommandResult` 仍只服务 `check / trial / compare`。

理由：

- `15` owner rewrite 已完成，public command count 控制在 `check/trial/compare + live` 双通道。
- live command 不能制造第二 runtime truth，durable handoff 只能是 canonical evidence package、target coordinate、artifact refs、evidence gaps、budget/sampling/redaction markers。
- mutation 能力只允许 `dispatch.declaredAction`，且必须先过 static-live binding、auth、tenant/session boundary、validator availability 和 operation admission。

已评估替代方案：

- 只公开 `logix live export evidence`：拒绝，无法覆盖 Agent attach、inspect、capture、wait、dispatch 的自验证闭环。
- `CommandResult` 复用为 live session envelope：拒绝，会把 verification report transport 误扩为 live truth。

### R171-003: Core Attachment Authority, Adapter Offer Only

决策：

- `RuntimeAttachment` 是 planning label，不是 frozen public name、DTO name 或 exported schema。
- Core owns attachment authority、identity coordinates、lifecycle state、capability gate、operation admission、evidence producer feed、canonical evidence handoff、budget/redaction constraints、cleanup invariant、post-commit IO boundary。
- Browser hook、Node daemon、Playground wiring、cloud registration、CLI/daemon transport 都是 adapter offers 或 transport projections。

理由：

- browser-only hook 无法覆盖 Node/cloud semantics。
- per-adapter object model 会制造第二 runtime truth。
- core-owned admission 是安全和 disabled-overhead 的唯一可控点。

已评估替代方案：

- exact `RuntimeAgentPort` DTO first：当前拒绝。
- global hook only：已拒绝。
- cloud product registration now：已拒绝。

### R171-004: Static Reflection Contract, Canonical Live Evidence Facets

决策：

- Reflection owns static declaration、Program/module contract、action tag、payload schema summary、validator availability and issue shape、sourceRef、manifest digest、manifest diff。
- Live evidence owns active runtime/module/instance、txn/op、operation admission/result/denial、selector route observation、host commit、profile、snapshot、capture budget、drop、redaction、degraded marker。
- Live facts enter canonical evidence only as event/artifact facets。
- No durable live sidecar、second manifest family、live-owned validator、second operation event law、Workbench-owned fact。

理由：

- Reflection manifest 承载 active runtime truth 会形成第二 runtime truth。
- Durable live sidecar 会与 canonical evidence envelope 并行。
- Payload validation owner 必须留在 167，live operation 只引用 validator availability 并做 admission。

已评估替代方案：

- `RuntimeReflectionManifest` as live carrier：已拒绝。
- `LiveEvidenceSidecar`：已拒绝。
- live-owned validator：已拒绝。

### R171-015: Shared Workbench Projection Hosts

决策：

- DevTools 和 Playground 都是 repo-internal Workbench projection hosts。
- DVTools 保留 viewer/import/export/explainer/drilldown/selection manifest/repair coordinate duties。
- Playground 只作为 dev-only dogfood host，提交 adapter offer，提供 source/context refs，并消费 canonical live evidence projection。
- Workbench Kernel 不新增 root entity，只继续使用 `truthInputs / contextRefs / selectionHints`。

理由：

- 单一 projection law 同时降低 DevTools、Playground 和 Agent route 的第二 truth 风险。
- UI state、product scenario、preview state 和 raw timeline 都不能成为 runtime truth。

已评估替代方案：

- DevTools panel-first：已拒绝。
- Playground product scenario truth：已拒绝。
- Workbench host-specific projection model：已拒绝。

### R171-016: Minimal Safe Operations With Budget Gates

决策：

- P1 allowlist: `target.discover`、`capture.eventWindow`、`snapshot.read`、`wait.condition`、`evidence.export`、`dispatch.declaredAction`、`profile.runtimeSummary` local-only bounded summary。
- P2/future：browser CPU profile integration、heap snapshot、remote/cloud mutation、long-running stream、cross-process aggregation。
- 已拒绝：arbitrary state patch、time travel mutation、hidden internal mutation、undeclared dispatch、dynamic eval、host DOM mutation、transaction-window IO、unbounded raw trace stream。
- Disabled p95 regression gate: max 1 percent or 0.05 ms over comparable baseline。

理由：

- Agent repair 需要一个可用的 active operation slot，但 broad operation family 会扩大 mutation risk。
- `dispatch.declaredAction` 足以覆盖 P1 repair loop 的主动触发需求，且可以被 reflection binding 和 admission taxonomy 约束。
- Deep profiling 和 cloud mutation 的安全域不同，不能混入 P1。

已评估替代方案：

- export-only bridge：已拒绝。
- dispatch-only, no profile summary：已由 local-only bounded runtime summary 取代。
- profile through React DevTools protocol：已拒绝。

### R171-017: Researchability Header Only

决策：

- 171 只冻结 comparable evidence header。
- 第一批 white-box 内容仅是 bounded summaries: attachment lifecycle、operation admission、capture budget/drop/redaction、selector route observation classification、txn/op count、producer drop、export size/duration。
- Minimal header: `evidenceSummaryDigest`、`captureWindow`、`stageClass` 或 admissibility class、`runtimeCoordinate`、`manifestDigest`、`envFingerprintRef`、`sourceDigestRef` 或 build digest ref、`budgetProfileRef`、`samplingProfileRef`、`redactionPolicyRef`、`proofCommandRef[]`、只带 owner/unit 的 `metricRef[]`、markers、`gap[]`、`authorityRef` 或 `derivedFrom`。

理由：

- 未来 research loop 需要可比证据，但不需要 171 现在拥有 metric family、decision trace family 或 adoption policy。
- Header-only 方案保留 future-headroom，同时不增加 hot-path tax 和第二 authority。

已评估替代方案：

- metric family inside 171：已拒绝。
- decision trace family inside 171：已拒绝。
- AutoResearch adoption algebra inside 171：已拒绝。

### R171-018: Host / Transport / Multi-Tab Topology

决策：

- 参考项目里的 daemon + browser WebSocket + CLI socket pattern 只作为 local-dev transport projection，不上升为 Logix 的语义核心。
- Logix 的终局是 attachment-first，不是 transport-first。
- 每个 browser tab、Node process 或 Playground host 都提交独立 attachment offer；`tabId` 只是 browser host metadata，不是 runtime identity。
- CLI 和 Workbench 以 `attachmentId + hostCoordinate + runtimeCoordinate + target coordinate` 区分并行 attachment。
- WebSocket、socket、stdio、IPC 或 future daemon carrier 可以互换，只要不改变 attachment / evidence / admission 语义。

理由：

- 这样能同时吸收参考项目的 daemon 统一入口优点与本项目的 core-owned attachment 约束。
- 多 tab 场景必须可分辨，但分辨依据不能退回页面标题、tab 序号或 human log parsing。
- 让 carrier 保持可替换，才能避免 daemon 或 websocket 变成第二真相源。

已评估替代方案：

- WebSocket 作为核心协议：已拒绝。
- `tabId` 作为主身份：已拒绝。
- shared daemon session 作为 runtime truth：已拒绝。

### R171-019: Real Local Carrier Required For Product Parity

决策：

- 171 semantic MVP 已经大于参考项目的语义范围；2026-05-03 real carrier closure 已补齐 browser/daemon/CLI 链路，使 `logix live` 不再停留在 in-process proof transport。
- real carrier 已作为 171 post-closure implementation delta 落地，执行计划与 proof 固定在 [implementation-plan-real-carrier.md](./implementation-plan-real-carrier.md)、[tasks.md](./tasks.md) 和 [notes/verification.md](./notes/verification.md)。
- 第一阶段 real carrier 只做 local dev：browser WebSocket adapter、local daemon、CLI IPC client、Vite dev plugin entry、`@logixjs/react/dev/live` dev-only import entry、多 tab attachment projection、daemon-backed evidence export。
- Vite plugin 和 dev-only import 必须安装同一个 browser adapter。plugin 是默认开发体验，dev-only import 是最小可复现与 E2E 入口。
- 不引入 React DevTools protocol authority，不读取 human logs，不实现 component tree inspection，不实现 deep CPU/heap profile。
- daemon lifecycle clean cut 已按 [../../docs/proposals/live-daemon-lifecycle-architecture-memo.md](../../docs/proposals/live-daemon-lifecycle-architecture-memo.md) 落地：启动策略收回 launcher，metadata 是 carrier-local operator snapshot，后续 supervisor / lifecycle product surface 讨论仍受 carrier-local operational gates 约束。

理由：

- 参考项目的有效价值是可用 carrier 链路：browser -> WebSocket -> daemon -> local socket -> CLI。
- Logix 如果只停留在 proof transport，Agent 不能稳定获取真实 browser tab 的 runtime context，无法达到 171 的用户侧终局体验；当前实现已通过 real carrier closure 关闭这个缺口。
- 把 real carrier 作为 transport projection 落地，可以补齐产品链路，同时不牺牲 core-owned attachment、admission、evidence 和 verification closure。

已评估替代方案：

- 继续保留 in-process proof transport：拒绝作为终局，因为它不能观察真实 browser tabs。
- 直接照搬 React DevTools protocol：拒绝，因为 React component id / fiber root 不是 Logix runtime coordinate。
- daemon session 作为 primary session truth：拒绝，因为会制造第二 runtime/session truth。

实施要求：

- `logix live status` 显示 daemon / IPC / WebSocket carrier health。
- `logix live targets --tree` 显示 attachmentId、hostCoordinate、runtimeCoordinate、target coordinate。
- Playwright 必须同时覆盖 plugin-injected dogfood page 与只含 `import "@logixjs/react/dev/live"` 的轻页面。
- 两个 tabs 指向同一 runtime 时必须显示两个 attachment rows。
- disconnect/reload/daemon stop 必须进入 terminal/degraded lifecycle。
- daemon-backed export evidence 必须产出 canonical evidence package 或 structured gap。

## 已关闭研究门

### R171-005: Controlled Debug Operation Allowlist

状态：

- 已关闭，属于 Batch 6。

采纳结果：

- P1 allowlist 见 R171-016。
- Mutation-capable operation 必须满足 admission taxonomy。

实施要求：

- 为每个 operation kind 定义 permission、target coordinate、binding requirements、mutation policy、evidence facet、redaction policy。

### R171-010: Performance Budget Owner And Proof Commands

状态：

- 已关闭，属于 Batch 6。

采纳结果：

- disabled path 必须 static-empty 或 structural no-op。
- enabled capture 必须 bounded、sampled、degradable。
- proof owner 应落 `02-hot-path-direction.md` + 171 plan/perf notes。
- disabled p95 regression gate: max 1 percent or 0.05 ms over comparable baseline。

实施要求：

- 记录 budget thresholds、perf suite、env fingerprint、before/after collection command、failure policy。

### R171-012: Runtime Decisions And Costs White-Box Scope

状态：

- 已关闭，属于 Batch 7。

采纳结果：

- 171 只准备 researchability-compatible evidence header。
- internal decision trace family 不进入 171。

实施要求：

- 按 R171-017 的 bounded summaries 实现，详细 trace 缺失时输出 gap。

### R171-013: Minimal Comparable Metrics And Evidence Fields

状态：

- 已关闭，属于 Batch 7。

采纳结果：

- Comparable evidence 使用 R171-017 的 header-only fields。

实施要求：

- `metricRef[]` 只能带 owner/unit/ref，不定义 metric family authority。

### R171-014: AutoResearch Deferred Concepts

状态：

- 已关闭，属于 Batch 7。

采纳结果：

- Full experiment loop、candidate mutation、adoption gate、adoption ledger、autonomous 24h operation、merge/publish/release 都不归 171。
- 另行 deferred: mutable candidate scope、immutable harness owner、primary metric/noise model、keep/discard/crash/escalate policy、autonomous SSoT rewrite。

实施要求：

- 在 `discussion.md` 和 follow-up spec target 中标明 deferred list。

## 实施前结论

- Batch 1 到 Batch 7 的确定性内容足以生成 implementation-ready planning artifacts。
- 具体实现可以在阶段 0 文档回写、tasks 状态同步和 proof command 核对后开始。
- 当前 `plan.md` 和 `tasks.md` 应当把剩余工作表达为 implementation/proof tasks，而不是 open planning questions。
