# Feature Specification: Runtime Workbench Kernel

**Feature Branch**: `165-runtime-workbench-kernel`  
**Created**: 2026-04-28  
**Status**: Done  
**Input**: User description: "极致面向终局，把 Playground、DVTools、CLI repair、runtime trial/check/run 的解释层收敛为一个共享 runtime workbench kernel，往内核施压，压出的不和谐部分全砍。"

## Current Role

本页是 Runtime Workbench Kernel 的跨宿主投影 contract。它只冻结一件事：authoritative runtime inputs 如何经一个无副作用、内部、projection-only 的内核派生为 session-rooted interpretation index。

本页不接管 `Runtime.run` result-face authority，不接管 `runtime.check / runtime.trial / runtime.compare` control-plane authority，不接管 canonical evidence envelope，不定义 UI workbench 产品，不定义 CLI machine report 协议。

## Context

`163-runtime-playground-terminal-runner` 已证明 `Runtime.run` 可以作为 result face 返回业务结果，`Runtime.check / Runtime.trial` 可以作为 diagnostic faces 返回 `VerificationControlPlaneReport`。`164-logix-playground` 已把用户可见 Playground 收敛到 `packages/logix-playground`，并裁定 React preview engine 只作辅助宿主。[17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md) 进一步冻结 Playground 的产品能力、权威分层和终局界面结构。[166-playground-driver-scenario-surface](../166-playground-driver-scenario-surface/spec.md) 承接无 UI driver 与 scenario playback 产品能力。`14-dvtools-internal-workbench` 已裁定 DVTools 是 repo-internal evidence explainer，不能制造第二 report shape、第二 evidence envelope、第二 verification lane。

现在继续收口：

```text
Authority bundle
  -> Runtime Workbench Kernel
    -> immutable projection index
      -> Playground host view
      -> DVTools host view
      -> CLI repair transport projection
```

核心裁决：

- Kernel 是 `AuthorityBundle -> ProjectionIndex` 的纯投影内核。
- Playground 是 source snapshot 宿主。
- DVTools 是 live runtime / imported evidence 宿主。
- CLI 是 machine report / evidence transport 宿主。
- 三个宿主只共享 derivation law，不共享 UI selection state，不共享机器报告协议。
- Runtime/control-plane/evidence 继续持有事实源。

## Scope

### In Scope

- 冻结 Workbench Kernel 的 owner、import law、输入分层、输出边界和 authority lattice。
- 冻结 session-rooted projection index 的语义。
- 冻结 finding、artifact、coordinate、gap 的 provenance law。
- 冻结 Playground、DVTools、CLI 如何消费同一 projection law。
- 冻结 must-cut 清单，用于反压当前 Playground、DVTools、CLI、sandbox 与 core 残留实现。
- 给出 proof matrix，作为后续 implementation plan 的验收输入。

### Out of Scope

- 新增 `Runtime.workbench`、`runtime.workbench`、`Runtime.devtools`、`Runtime.inspect`、`Runtime.playground` public facade。
- 把 Workbench Kernel 提升为 runtime control-plane stage。
- 改写 `VerificationControlPlaneReport`、canonical evidence envelope、artifact output key 或 `focusRef` 的 authority。
- 设计 trigger DSL、scenario DSL、UI interaction DSL、source coordinate DSL。
- 把 Sandpack、Monaco、iframe preview、Chrome extension、React DevTools 绑定为 public contract。
- 定义 DVTools 的最终 UI 布局。
- 接管 Playground shell 布局实现。Playground 产品界面口径由 [17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md) 持有，165 只提供其需要的 projection law。
- 开始实现代码。

## Imported Authority

- [../163-runtime-playground-terminal-runner/spec.md](../163-runtime-playground-terminal-runner/spec.md)
- [../164-logix-playground/spec.md](../164-logix-playground/spec.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md)
- [../166-playground-driver-scenario-surface/spec.md](../166-playground-driver-scenario-surface/spec.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)

## Terminal Decisions

### TD-001 - Owner And Import Law

Default owner is fixed to:

```text
packages/logix-core/src/internal/workbench/**
```

Import law:

- zero public root export
- zero public subpath export
- zero `@logixjs/sandbox` export
- zero Playground product API export
- zero DVTools protocol export
- `packages/logix-playground`、`packages/logix-devtools-react`、CLI 只能通过 repo-internal adapter 或 test-only bridge 消费

后续若要拆成独立包，必须先重开本页，并证明 private workspace package 优于 core internal subtree，且不增加 public surface。

### TD-002 - Projection-Only Kernel

Kernel 只消费 authority bundle，只产 projection index。

Kernel 不得：

- 启动 Program
- 执行 Trial
- 执行 compare
- 写 evidence
- 生成 report
- 生成 repair scheduling
- 持有 UI selection state
- 从 raw stack、raw log、locator 或 UI selection 推断 source truth

### TD-003 - Truth Inputs, Context Refs, Selection Hints

输入必须分层：

```ts
interface RuntimeWorkbenchAuthorityBundle {
  truthInputs: RuntimeWorkbenchTruthInput[];
  contextRefs?: RuntimeWorkbenchContextRef[];
  selectionHints?: RuntimeWorkbenchSelectionHint[];
}
```

`truthInputs` 可以包含：

- `Runtime.run` result projection
- `VerificationControlPlaneReport`
- canonical evidence envelope
- control-plane artifact refs
- evidence artifact refs
- slim runtime debug event batch with stable runtime coordinate

168 之后，`Runtime.run` result projection 可携带：

- `status`
- `valueKind`
- `lossy`
- `lossReasons`
- bounded failure projection

这些字段只解释 result face。它们不把 Run result 升级为 `VerificationControlPlaneReport`。

`contextRefs` 可以包含：

- host source snapshot digest and file span
- source snapshot locator
- package/example identity
- imported artifact locator

`selectionHints` 可以包含：

- selected session hint
- selected finding hint
- selected artifact hint
- selection manifest from DVTools export

Rules:

- Truth derivation can only depend on `truthInputs`.
- `contextRefs` can only improve location, grouping, digest checks, drilldown labels, or evidence gaps.
- `selectionHints` can only affect initial view selection, filtering, or ordering in host adapters.
- `selectionHints` must not affect session/finding/artifact/gap id, content, existence, severity, or authority.

### TD-004 - Authority-Tagged Projection Index

Output is an internal DTO named by role, not a public protocol:

```ts
interface RuntimeWorkbenchProjectionIndex {
  sessions: RuntimeWorkbenchSessionProjection[];
  indexes?: RuntimeWorkbenchProjectionIndexes;
}
```

Rules:

- `sessions` is the only root.
- findings, artifacts, source refs, gaps, metrics, drilldowns are session-owned nodes or optional indexes.
- every node must carry `authorityRef` or `derivedFrom`.
- ids must be derived from authority refs, report code, focusRef, artifact output key, source digest, gap reason, and stable runtime coordinate.
- control-plane report ids must not depend on summary text or rendered wording.
- run-result ids may depend on run id, status, valueKind and bounded failure coordinate.
- no custom report code namespace.
- no custom severity namespace.
- no custom repair action namespace.
- no `selectedSessionId` or host view state.

### TD-005 - Finding Authority Lattice

Workbench finding is an authority-backed projection node. It is not an independent diagnostic judgment.

Allowed finding classes:

| Class | Authority | Allowed Projection |
| --- | --- | --- |
| `control-plane-finding` | `VerificationControlPlaneReport` | copy or summarize report finding, verdict, errorCode, repairHints, nextRecommendedStage refs |
| `run-failure-facet` | `Runtime.run` result projection | classify bounded run failure already present in result projection |
| `evidence-gap` | missing or mismatched authority input | explain why Kernel cannot produce stronger projection |
| `degradation-notice` | stable debug/evidence authority ref | mark dropped, oversized, incomplete, inconclusive, degraded evidence |

Rules:

- `severity` must be copied from authority input or derived by a fixed gap/degradation table.
- `summary` must be a bounded projection of authority input.
- `repair action` must be a mirror of `repairHints` or `nextRecommendedStage`, or a local UI drilldown action such as open artifact, show source, rerun same face.
- Kernel cannot invent stage upgrade, repair priority, retry policy, or Agent scheduling.
- Debug events cannot directly create diagnostic findings unless they carry stable runtime coordinate and can be tied to canonical evidence or debug authority.
- Host UI interaction without Logix evidence can only become preview artifact, drilldown locator, or evidence gap.

### TD-006 - Coordinate Ownership

Workbench only normalizes owner-provided coordinates.

| Coordinate | Owner | Kernel Role |
| --- | --- | --- |
| `focusRef` | runtime control plane / domain owner | pass through, attach to finding or artifact |
| `artifactOutputKey` | control-plane report or evidence package | pass through, attach to artifact |
| source snapshot digest/span | Playground, docs, CLI artifact carrier | context ref, digest guard, drilldown locator |
| runtime instance / txn / op coordinate | runtime debug authority | session grouping and drilldown locator |
| scenario step id | verification scenario owner | pass through only when present in authority input |

Rules:

- Kernel must not redefine `declSliceId / reasonSlotId / scenarioStepId` semantics.
- Kernel must not canonicalize artifact-derived source spans without provenance and digest.
- Missing owner coordinate must produce evidence gap.
- Stack traces, raw logs, UI selection and locator strings are not coordinate authority.

### TD-007 - Read-Only Repair Mirror

Workbench can help Agent repair only by mirroring existing authority:

- `repairHints`
- `focusRef`
- `nextRecommendedStage`
- artifact output keys
- evidence refs
- source snapshot digest/span

CLI may produce a repair projection in its own transport format, but that projection remains CLI/control-plane transport output. Kernel does not define CLI report schema.

### TD-008 - Preview And Trigger Boundary

Kernel only consumes produced outputs and evidence. It does not own:

- trigger DSL
- driver declaration
- driver payload schema
- raw action dispatch
- dispatch/invoke semantics
- scenario DSL
- scenario playback runner
- wait/settle semantics
- observe/expect semantics
- preview engine contract
- UI interaction language
- source editing model

`main(ctx,args)` remains app-local runner convention. Interaction Driver and Scenario Playback are Playground product capabilities owned by `166`. `trial.scenario` remains verification control plane. React preview engine remains replaceable host technology.

168 parity adoption adds internal `reflection-node` truth inputs for owner-approved action, payload and dependency browse nodes. These nodes derive from 167 repo-internal reflection manifests and project as Workbench artifacts with drilldown refs. Missing manifest, unknown payload schema, stale manifest digest and `fallback-source-regex` stay evidence gaps.

### TD-009 - Existing Private Derivations Must Collapse

After Kernel exists, Playground、DVTools、CLI must not retain private session/finding/artifact derivation truth.

Allowed:

- thin host adapter
- host view state
- host layout selection
- host-specific rendering
- host transport projection

Forbidden:

- private report explainer truth
- private finding authority
- private artifact key namespace
- private source coordinate truth
- DVTools-only protocol consumed by CLI

## Projection Contract

### Session Projection

Session projection is the only root. It represents one authority-backed interpretation window:

- run result window
- check/trial report window
- compare report window
- evidence package window
- live runtime activity window with stable coordinate

Session must carry:

- `authorityRef`
- input kind
- source digest or evidence gap
- status copied or derived from authority input
- child finding refs
- child artifact refs
- child drilldown refs
- child evidence gap refs

Session cannot carry selected state.

### Artifact Projection

Artifact projection is session-owned or finding-owned.

Rules:

- artifact key must use `artifacts[].outputKey` when present.
- evidence artifact key must stay in evidence package namespace.
- raw locator can be retained only as locator.
- raw locator cannot become artifact key.
- over-budget artifact becomes bounded preview plus evidence gap.

### Source Projection

Source projection is a locator with provenance.

Rules:

- source span requires digest or owner-provided coordinate.
- artifact-derived source span requires artifact provenance.
- source projection cannot become canonical source truth.
- source projection cannot become default navigation root.

### Evidence Gap Projection

Evidence gap is a first-class projection node.

Gap reasons include:

- missing focusRef
- missing artifact output key
- missing source digest
- digest mismatch
- raw locator without owner
- debug event without stable runtime coordinate
- over-budget evidence
- preview-only host error without Logix evidence
- host compile failure without Runtime/transport authority

### 168 projection parity addendum

168 closes three first-slice Workbench rules:

- A control-plane report authority ref is derived from run id, stage, mode, errorCode, focusRef, artifact output key or owner digest. Summary copy cannot affect report or finding identity.
- Preview-only host error and host compile failure without Runtime/transport authority become evidence gaps, not `run-result` truth input.
- `run-failure-facet` consumes accepted result-face failure projection. Missing owner failure detail degrades to evidence gap.

## Host Consumption Rules

### Playground

Playground supplies source snapshot context and runtime outputs. It consumes projection index for diagnostics and drilldowns. Its product capability and layout authority is [17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md).

Rules:

- 164 continues to own Playground default UI path.
- Playground shell owns top command bar, file navigator, source editor, result panel and bottom console strip.
- Kernel only provides projection refs for the right-side Result/Diagnostics panel and bottom Diagnostics/Trace/Snapshot lanes.
- Kernel does not require Playground to show findings on first paint.
- source edits create a new source digest or mark old sessions stale in host view state.
- Run result, Check report, Trial report and preview evidence can coexist under one source digest, with shape separation preserved.
- active file, editor cursor, selected panel, preview lifecycle, console tab, route state and viewport/theme controls remain host view state.
- preview-only host errors may become evidence gaps or host errors; they cannot become Logix diagnostic findings without Logix evidence authority.
- Driver/Scenario execution outputs may enter `truthInputs` only after they become Run result, control-plane report, evidence package, artifact ref or stable debug event batch.
- Driver declaration, payload schema, dispatch/invoke semantics, scenario steps, wait/settle and observe/expect remain outside the kernel.

### DVTools

DVTools supplies live runtime debug authority refs or imported evidence packages. It consumes the same projection law for live and imported modes.

Rules:

- live-only data must first map to stable runtime/evidence/debug authority ref.
- data that cannot map becomes drilldown locator or evidence gap.
- selection manifest remains hint-only.
- timeline、state JSON、field graph、raw event JSON remain drilldown.

### CLI

CLI supplies control-plane report、evidence package、selection hints and artifact refs. It may emit CLI transport output derived from the projection index.

Rules:

- CLI output must remain CLI/control-plane transport.
- CLI cannot depend on DVTools-only protocol.
- CLI cannot depend on Playground-only source snapshot shape.
- selection hint can choose initial focus, never finding truth.

## Proof Matrix

| Proof | Required Evidence |
| --- | --- |
| Authority preservation | every projection node has `authorityRef` or `derivedFrom`; no custom report/finding/action namespace |
| Shape separation | Run result and Check/Trial report coexist without `VerificationControlPlaneReport` shape confusion |
| Live/imported parity | same evidence package produces equivalent session/finding/artifact projection in DVTools live and imported mode |
| CLI transport boundary | CLI repair output derives from projection index but remains CLI/control-plane transport, with no DVTools protocol |
| Coordinate gap completeness | missing focusRef, artifact output key, source digest, stable runtime coordinate all produce evidence gaps |
| Negative sweep | public API, docs, examples, sandbox exports contain no must-cut concepts |

## Must Cut

- `Runtime.devtools`
- `runtime.devtools`
- `Runtime.inspect`
- `runtime.inspect`
- `Runtime.playground`
- `runtime.playground`
- public `Runtime.workbench`
- public `runtime.workbench`
- Playground-owned diagnostic report model
- DVTools-owned report protocol
- DVTools-owned evidence envelope
- CLI-owned workbench report protocol
- sandbox-owned playground report schema
- Playground mock run result as default proof
- `SnapshotPreviewWitness` or any witness/probe naming in production paths
- raw trace as first-screen workbench truth
- timeline-first DVTools default layout
- source coordinate as user default navigation root
- trigger DSL for Playground
- Interaction Driver DSL for Playground
- raw action dispatch as default Playground surface
- scenario DSL as business authoring asset
- Scenario Playback expectation as compare truth
- Sandpack as Logix diagnostic authority
- parallel registry truth between docs and examples
- private session/finding/artifact derivation in Playground, DVTools and CLI after Kernel exists
- compatibility alias retained only for imagined users

## Reopen Bar

只有下面证据允许重开本页：

- runtime/control-plane/evidence outputs 无法在不执行 runtime 的前提下派生稳定 projection index。
- Playground、DVTools、CLI 的输入差异经 dominance proof 证明无法共享 projection law。
- `VerificationControlPlaneReport` 缺少必要字段，导致 authority-backed finding 无法形成，且 evidence gap 不足以支撑 Agent repair。
- source coordinate 无法在 source snapshot、report artifact 和 evidence package 之间稳定对齐。
- core internal owner 导致 public surface 扩张，且无法通过 internal-only adapter 解决。
- 共享 Kernel 的成本显著高于三宿主私有实现，并且私有实现不产生第二 truth。该主张必须逐项通过 `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom` dominance proof。

## Implementation Planning Obligations

后续 implementation plan 必须先回答：

- internal owner 的具体 import adapter 是 `repo-internal` export、monorepo TS path，还是 test-only bridge。
- 当前 DVTools session/finding/artifact model 哪些改为 projection consumer，哪些删除。
- Playground 当前 result/report/log/error model 哪些改为 truth input，哪些保留为 host view state。
- Playground Driver/Scenario 产物如何只以 produced result/report/evidence/debug refs 进入 truth input，且不把 driver/scenario schema 交给 kernel。
- CLI repair projection 如何只过滤和重排 report/evidence/artifact/source refs。
- 第一轮 proof pack 如何覆盖 proof matrix。
- 文本 sweep 如何证明 public API、docs、examples 中没有 must-cut 概念。

## Success Criteria

- Authority preservation、shape separation、gap completeness、host-state exclusion 四个 kernel-level gates 全部通过。
- Playground、DVTools、CLI 至少各有一条 integration proof 使用同一 projection law。
- Playground proof 必须能支撑 [17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md) 的 Result/Diagnostics panel 与 bottom Diagnostics/Trace/Snapshot lanes，且不接管 Playground shell host state。
- live evidence 与 imported evidence 对同一输入得出等价 projection。
- artifact output key 不分裂。
- source coordinate 可作为 Agent repair 输入，但不成为 source truth。
- raw trace 与 preview logs 不进入默认比较面。
- `@logixjs/sandbox` public surface 不新增 workbench/playground/report API。
- 生产代码命名不包含 probe、witness、pressure、task id、migration id 等过程性规划名。
