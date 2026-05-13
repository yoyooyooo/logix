# Feature Specification: Runtime Reflection Manifest vNext

**Feature Branch**: `167-runtime-reflection-manifest`  
**Created**: 2026-04-28  
**Status**: Done  
**Input**: User description: "把内核反射缺口独立成 167。166 只消费最小 Program manifest slice，167 面向终局补齐 Playground、CLI trial、自我验证和 Devtools 共用的 runtime reflection manifest、payload validation、observability authority 与 workbench bridge。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-5, NS-7, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-6, KF-8, KF-9, KF-10

## Current Role

本页是 Runtime Reflection Manifest vNext 的事实源。它独立持有内核反射终局能力，服务：

- Playground 的 reflected action、driver/scenario、state/result/log/trace/diagnostics 对齐。
- CLI trial / run / check 的 machine-readable 自我验证。
- Devtools 的运行时解释工作台。
- 165 Runtime Workbench Kernel 的 authority bundle 输入。

本页不把 reflection 提升为 public authoring surface，不新增 `Logix.Reflection` public root，不新增 `Runtime.playground`、`Runtime.driver`、`Runtime.scenario` 或 `Program.capabilities.mocks`。

167 的职责是下沉可被 Playground、CLI 和 Devtools 共享的 runtime/reflection 解释能力。它不负责 Playground 的 source bundling、sandbox transport、UI layout、Driver/Scenario product metadata 或 docs registry。166 可以实现 adapter 消费 167 输出，但不能在 Playground 私有层定义终局 action/payload/operation authority。

## Context

166 已经把 Playground 下一阶段裁定为 Professional Logic Playground vNext。它需要最小 Program manifest slice 替换当前源码正则 action 解析，但完整反射能力明显超出 166 的产品工作台边界。

当前仓库已有基础：

- `packages/logix-core/src/internal/reflection/manifest.ts` 可导出 `ModuleManifest`。
- `packages/logix-core/src/internal/reflection-api.ts` 已存在 repo-internal expert helper。
- `Module.descriptor(...)` 能暴露 action keys、logic units、schema keys 等基础信息。历史 `trace:module:descriptor` debug signal 只作为迁移背景，不作为 Workbench truth input、canonical evidence authority 或 reflection manifest 内容。
- `ports/exportPortSpec.ts` 已有 payload type summary 方向。

当前缺口：

- reflection 仍是 internal expert helper，缺一个明确的 repo-internal Cross-tool Consumption Law。
- manifest action 只够表达 `void | nonVoid | unknown`，不够支持 payload schema summary、JSON validation、example seed、字段错误。
- Program 级 manifest 不完整，无法稳定描述 root module、initial state shape、imports/services、processes、run/check/trial availability。
- Live runtime events need a stable way to bind back to manifest digest, action tag and payload validator availability; that binding law must not make reflection the owner of active runtime events.
- Playground 当前仍有源码正则 fallback，不能成为终局 authority。
- Playground 当前 Run/session 仍有 package-local simulation。把默认运行路径切到 `Runtime.run` 和 `Runtime.openProgram` 属于 166；把 live operation evidence 绑定回 manifest digest、action tag 与 validator availability 的静态字段属于 167。active event facets、runtime coordinate、operation admission/result 归 runtime live evidence、canonical evidence envelope、09 与 165。

## Scope

### Closure Tracks

167 is split into two planning closures:

- **167A minimum closure**: minimum Program action manifest, fallback classification, Cross-tool Consumption Law and public API negative sweep. 166 depends on 167A.
- **167B terminal reflection closure**: full Program manifest, deeper payload validation, manifest diff, CLI/Devtools reuse, observability collection, disabled-mode overhead evidence and deeper 165 bridge integration. 166 does not depend on full 167B closure.

### In Scope

- Runtime Reflection Manifest vNext 的 repo-internal owner、shape、authority、budget 和 digest 规则。
- Program-level manifest 与 module-level manifest 的最小稳定字段。
- Action payload schema summary 与 JSON payload validation projection。
- Static-live binding law for dispatch/run/check/trial evidence: manifest digest, action tag, payload schema/validator refs and source context that live evidence can cite. Collection hooks, event emission and batch buffering belong to runtime live evidence, `171`, or follow-up closure.
- CLI trial/self-verification 可导出同一 manifest 与 manifest diff。
- Devtools/Playground/CLI 通过同一 reflection adapter 消费。
- 166 minimum manifest slice 的依赖合同。
- 166 production runtime consumption 所需的 shared manifest、payload 和 operation interpretation contract。
- 与 165 Runtime Workbench Kernel 的 bridge 规则。
- negative public surface guard。

### Out of Scope

- 新增 public `Logix.Reflection` root。
- 新增 `Runtime.playground`、`Runtime.driver`、`Runtime.scenario`。
- 新增 `Program.capabilities.mocks` 或 mock authoring API。
- 把 Driver/Scenario/Service Source Files 放入 core/react/sandbox public surface。
- 把 reflection manifest 当成业务 authoring DSL。
- 重新定义 `Runtime.check` / `Runtime.trial` report shape。
- 接管 Playground UI layout 或 Devtools UI layout。
- 接管 Playground `ProjectSnapshot -> executable module` bundling、sandbox transport 或 product session state。

## Imported Authority

- [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md)
- [../166-playground-driver-scenario-surface/spec.md](../166-playground-driver-scenario-surface/spec.md)
- [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../../docs/standards/effect-v4-baseline.md](../../docs/standards/effect-v4-baseline.md)

## Terminal Decisions

### TD-001 - Owner And Surface

Owner is repo-internal core reflection:

```text
packages/logix-core/src/internal/reflection/**
packages/logix-core/src/internal/reflection-api.ts
```

Rules:

- `@logixjs/core` public root does not export `Reflection` in this phase.
- Playground, CLI and Devtools consume through repo-internal adapters, test bridges or existing package-internal wiring.
- Any future public reflection surface requires a new decision and proof that Playground/CLI/Devtools consumption stabilized.
- 167 may expose repo-internal adapters, DTOs and test bridges. It must not require 166 to import unstable implementation internals directly when a stable repo-internal adapter can exist.

### TD-002 - Manifest Is Static Contract Projection

Reflection manifest projects configured Program/Module declarations into stable, bounded, serializable static contract DTOs.

Rules:

- Manifest does not execute Program.
- Manifest does not contain produced runtime evidence.
- Manifest does not replace Runtime state, Check/Trial reports or evidence envelope.
- Manifest can be a context/truth input to 165 only when it is produced by owner-approved reflection/export path.
- Live evidence may cite manifest digest, action tag, payload schema ref, validator availability ref and sourceRef, but it does not write back into the manifest family.
- Source parsing is not manifest authority.

### TD-003 - 166 Minimum Manifest Slice

166 may proceed with only the 167A minimum slice:

```ts
interface MinimumProgramActionManifest {
  readonly manifestVersion: string
  readonly programId: string
  readonly moduleId: string
  readonly revision?: number
  readonly digest: string
  readonly actions: ReadonlyArray<{
    readonly actionTag: string
    readonly payload: {
      readonly kind: "void" | "nonVoid" | "unknown"
      readonly summary?: string
    }
    readonly authority: "runtime-reflection" | "manifest"
  }>
}
```

Rules:

- 166 must prefer this slice over source regex.
- The 167A repo-internal helper is `extractMinimumProgramActionManifest` exported from `@logixjs/core/repo-internal/reflection-api`.
- 166 consumes this DTO and projects it into a UI-local `ActionPanelViewModel`; 166 does not own a second manifest authority schema.
- Regex fallback is allowed only if manifest extraction fails and must be labelled `fallback-source-regex`.
- Raw dispatch must be gated by current manifest action tags.
- Minimum slice does not require full payload validator, examples, service graph or scenario semantics.
- Completion of this slice plus fallback classification and public API negative sweep is the 167A closure required by 166.

### TD-003A - Cross-tool Consumption Law

Any fact consumed across Playground, CLI, Devtools or 165 bridge must be classified into one of these categories:

- `authority`: owner-approved fact that can drive shared interpretation.
- `contextRef`: host or source context used to explain authority.
- `debugEvidence`: bounded evidence useful for explanation, not verdict.
- `hostViewState`: consumer-owned UI or host selection state.
- `evidenceGap`: explicit missing, degraded, stale or unsupported evidence.

Rules:

- Driver declaration, Scenario declaration and UI layout state are not `authority`.
- Scenario `expect` failure is product failure, not compare truth.
- Payload schema summary is not a diagnostic finding by itself.
- Source file path conventions are context refs only and do not create Driver, Scenario or fixture semantics.

### TD-004 - Full Program Manifest vNext

Full Program manifest must eventually include:

- manifest version
- program id
- root module id
- root module manifest
- action manifest
- payload schema summaries
- initial state shape summary
- logic/effect/process summaries
- imports/services summaries
- source refs
- static IR digest when available
- runtime capability availability for run/check/trial
- budgets/truncation/degradation markers
- stable digest

### TD-005 - Payload Reflection And Validation

Action payload support must provide:

- `void | nonVoid | unknown` kind
- stable schema summary
- bounded JSON schema-like projection or equivalent type IR summary
- JSON payload validation result
- validation issue list with stable path/code/message
- optional example payload seed when derivable or declared

Rules:

- Validation failure is product/runtime input failure, not diagnostic report truth.
- Payload schema summary must be bounded and deterministic.
- Unknown payload schema must produce an evidence gap, not fabricated schema.
- Consumers own text input, JSON parsing and UI presentation.
- 167 owns JSON value validation against reflected schema and the stable `PayloadValidationIssue` path, code and bounded message.

### TD-006 - Static-Live Binding Law For Operation Evidence

Reflection vNext defines the static binding fields that live operation evidence must cite when an operation is admitted or denied:

- `manifestDigest`
- `actionTag`
- payload schema ref or validator availability ref
- binding status
- gap or denial reason when static binding cannot be proven
- source snapshot/revision context when supplied by host

Rules:

- Transaction window still forbids IO.
- Runtime event emission, active session identity, instance/txn/op coordinates, operation admission, operation result, selector route observation, host commit, profile and snapshot facts are owned by runtime live evidence and the canonical evidence envelope.
- Live operation evidence may feed 165 as canonical evidence event or artifact facets, not as reflection manifest content.
- Reflection binding facts do not rewrite Runtime state, Check/Trial report verdict or compare output.
- Playground may attach source snapshot revision/session id as host context, but host context does not change reflection authority.

171 targeted implementation materializes this law as a repo-internal pure check: `checkStaticLiveBinding` consumes an owner-bound `RuntimeReflectionManifest` plus requested manifest/action/payload facts and returns a matched/missing/mismatch/stale/unknown binding header or denial reason. 174 extends the same DTO with `missing-live-manifest-binding`, `payload-schema-digest-mismatch`, manifest-scoped action indexes and target lifecycle cleanup; the live bridge can attach that header to `operation.completed`, `operation.failed` or `operation.denied` facets, but the helper never creates runtime coordinates, sessions, events, reports or verdicts.

### TD-006A - Runtime Consumption Boundary With 166

166 and 167 split runtime work as follows:

```text
166 owns:
  ProjectSnapshot -> executable module
  sandbox/browser transport
  product session state
  Driver/Scenario product metadata
  UI projection

167 owns:
  action/payload manifest authority
  payload validation projection
  static binding facts for dispatch/run/check/trial evidence
  165 workbench bridge inputs for manifest/observability
```

Rules:

- 167 must not introduce a `Runtime.playground` root or any Playground-specific Runtime entry.
- 167 must make existing `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial` easier to observe and interpret.
- If 166 needs a product-specific fallback, the fallback remains 166-local and must emit evidence gaps rather than extending 167 authority.

### TD-006B - 168 Parity Boundary

168 does not change reflection owner or public surface.

Rules:

- Run value lossiness and Run failure projection belong to Runtime result face, Playground runtime output projection and 165 Workbench projection.
- `VerificationDependencyCause` can be referenced by reflection manifest when owner-approved dependency context exists, but 167 does not create a parallel dependency cause schema.
- 168 bridge adoption expands 167 manifest facts into Workbench `reflection-node` inputs for actions, payload metadata and dependency coordinates.
- Payload validator availability and stable validation issue projection stay owned by 167; unknown payload schema is an evidence gap.
- Stale manifest digest and `fallback-source-regex` remain evidence gaps, not reflection authority.
- Preview-only failure, host compile failure and missing reflection owner data remain evidence gaps unless a reflection or control-plane owner emits authority.
- No public `Logix.Reflection`, `Runtime.playground`, `Runtime.driver`, `Runtime.scenario` or `Runtime.workbench` surface is added for 168 parity.

### TD-007 - CLI / Self-verification Loop

CLI trial/run/check can colocate reflection artifacts with runtime and report outputs:

- manifest
- manifest digest
- manifest diff
- Run result
- Check/Trial report
- canonical evidence refs for operation events
- workbench authority bundle bridge

Rules:

- CLI transport shape can be CLI-owned, but reflection payload must use the same core manifest DTOs.
- Manifest diff can be used as self-verification evidence.
- 167 owns only manifest, digest, diff, payload summary and validation issue projection. Run result, Check/Trial report and operation events keep their own owner.
- Reflection mismatch or missing owner coordinate must become an evidence gap.

### TD-008 - Devtools And Playground Reuse Same Derivation Law

Playground and Devtools can render different UI, but they must not invent separate manifest authorities.

Rules:

- Playground may add product metadata like Driver/Scenario/Service Source Files outside manifest.
- Devtools may add live selection state outside manifest.
- Shared interpretation of action and payload comes from reflection DTOs. Active operation coordinates come from canonical live evidence facets and 165 projection.
- Playground source layout, virtual file paths and author-side project declaration structure are owned by 166. Reflection must not infer Driver/Scenario semantics from file names or directories.
- `*.program.ts`, `*.logic.ts`, `*.service.ts` and `*.fixture.ts` names may appear as source refs, but they do not change reflection authority by themselves.

## Closure & Guardrails

### Closure Contract

167A closes when:

- 166 can consume minimum manifest slice without source regex as primary authority.
- `fallback-source-regex` is classified as evidence gap and cannot enter manifest authority.
- Cross-tool Consumption Law is available to consumers without private manifest schemas.
- Public API negative sweep passes.

167B closes when:

- Full manifest DTO exists as repo-internal contract with digest and budgets.
- Payload summary and validation projection are available for at least `Schema.Void`, primitive schemas and struct schemas.
- Static-live binding fields for live operation evidence are available and can be cited by canonical evidence facets.
- CLI trial/run/check can export manifest digest and manifest diff.
- 165 bridge classification matrix maps manifest, action/payload/dependency reflection nodes, runtime output, Check/Trial report, canonical live operation evidence facets and evidence gaps without generic `convertible` escape.
- 166 can remove production default dependencies on source-string action/run simulation and use 167 outputs for shared interpretation.

### Must Cut

- Source regex as terminal action authority.
- Playground-private runtime observability schema.
- Playground-private payload validation schema.
- Public `Logix.Reflection` root in this phase.
- Public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`.
- Public `Program.capabilities.mocks`.
- Playground private manifest schema.
- CLI private manifest schema.
- Devtools private action/payload schema authority.
- Unbounded manifest payloads.
- Runtime observability that depends on process-global mutable singleton truth.

### Reopen Bar

Reopen this spec if:

- 166 cannot consume manifest without public core export.
- Payload validation requires exposing Effect Schema internals as public API.
- CLI and Devtools need incompatible manifest shapes.
- Reflection introduces measurable hot-path overhead when disabled.

## User Scenarios & Testing

### User Story 1 - Minimum Manifest For Playground (Priority: P1)

As a Playground implementer, I can extract a minimum action manifest from a compiled Program and render reflected actions without source regex.

**Traceability**: NS-3, NS-7, KF-3, KF-10

**Why this priority**: 166 cannot credibly implement Action Workbench while regex parsing is the primary source.

**Independent Test**: Given a Program with `increment` and `decrement`, manifest extraction returns both action tags, payload kind and stable digest; Playground fallback is not used.

**Acceptance Scenarios**:

1. **Given** a configured Program, **When** the minimum manifest is extracted, **Then** it contains program id, module id, action list, payload kind and digest.
2. **Given** manifest extraction succeeds, **When** Playground derives action panel, **Then** action authority is `manifest` or `runtime-reflection`.
3. **Given** manifest extraction fails, **When** Playground falls back to regex, **Then** the authority is explicitly `fallback-source-regex` and an evidence gap is available.

### User Story 2 - Payload Summary And Validation (Priority: P1)

As a no-UI Playground or CLI user, I can enter JSON payload for non-void actions and get stable validation feedback.

**Traceability**: NS-3, NS-5, NS-10, KF-3, KF-8

**Why this priority**: professional Playground and CLI self-verification need payload behavior that is more precise than `nonVoid`.

**Independent Test**: A struct payload action receives valid and invalid JSON payloads; validation returns stable success or issue list.

**Acceptance Scenarios**:

1. **Given** a non-void action with a struct schema, **When** reflection runs, **Then** payload summary is bounded and deterministic.
2. **Given** invalid JSON payload, **When** validation runs, **Then** issues include stable path, code and bounded message.
3. **Given** unknown schema, **When** validation is requested, **Then** result is an evidence gap, not fabricated success.

### User Story 3 - Static-Live Binding For Operation Evidence (Priority: P2)

As a workbench consumer, I can connect dispatch/run/check/trial live evidence back to the static manifest and payload validator facts without making reflection own active runtime evidence.

**Traceability**: NS-5, NS-8, NS-10, KF-6, KF-8

**Why this priority**: Playground, CLI and Devtools need the same static binding facts to explain runtime behavior, while event emission and perf evidence remain live evidence work.

**Independent Test**: Dispatch one action and verify the emitted canonical evidence facet can cite manifest digest, action tag, payload validator availability and runtime operation coordinate without importing Playground session or snapshot types into reflection.

**Acceptance Scenarios**:

1. **Given** a dispatch operation, **When** it is admitted, **Then** the live evidence can cite static manifest digest, action tag and validator availability.
2. **Given** a failed static binding, **When** it is exported, **Then** denial or evidence gap reason is present and reflection does not mint runtime coordinates.
3. **Given** state/log/trace data, **When** events are exported, **Then** those data appear only as bounded canonical evidence artifact refs.

### User Story 4 - CLI Self-verification Export (Priority: P2)

As a CLI/self-verification runner, I can export manifest, digest, diff, Run result and Check/Trial report using the same reflection DTOs.

**Traceability**: NS-4, NS-5, NS-8, KF-6, KF-8

**Why this priority**: CLI trial becomes stronger when it can prove source/runtime/control-plane alignment.

**Independent Test**: Run CLI trial on two Program revisions and verify manifest diff detects action or payload changes.

**Acceptance Scenarios**:

1. **Given** two Program manifests, **When** diff runs, **Then** action additions/removals and payload summary changes are stable.
2. **Given** trial output, **When** export runs, **Then** manifest digest and report digest are both present.
3. **Given** missing source coordinate, **When** workbench bridge runs, **Then** evidence gap is emitted.

### User Story 5 - Devtools And Playground Shared Authority (Priority: P2)

As a maintainer, I can see Devtools and Playground interpret the same Program actions and operation coordinates consistently.

**Traceability**: NS-7, NS-10, KF-10

**Why this priority**: Devtools and Playground should dogfood the same kernel facts instead of drifting.

**Independent Test**: The same Program manifest and runtime operation events produce equivalent action list and operation refs in both consumers.

**Acceptance Scenarios**:

1. **Given** the same manifest, **When** Playground and Devtools consume it, **Then** action ids and payload summaries match.
2. **Given** the same operation events, **When** both render operation refs, **Then** instance/txn/op coordinates match.

### Edge Cases

- Program lacks runtime blueprint.
- Action token is not a recognized schema token.
- Payload schema is recursive or too large.
- Manifest exceeds max byte budget.
- Diagnostics are disabled.
- Source coordinate is missing.
- Dispatch result returns after session reset.
- Manifest diff compares different manifest versions.
- Imported child Program has action name collision with root module.
- CLI export runs in browser-like environment without Node globals.

## Requirements

### Functional Requirements

- **FR-001**: (NS-3, KF-3) System MUST provide a repo-internal minimum Program action manifest slice for 166.
- **FR-002**: (NS-3) Minimum slice MUST include manifest version, program id, module id, action tags, payload kind, authority and digest.
- **FR-003**: (NS-7, KF-10) Playground MUST prefer minimum manifest over source regex when available.
- **FR-004**: (NS-7) Source regex fallback MUST be explicitly labelled `fallback-source-regex`.
- **FR-005**: (NS-3, KF-3) Full manifest MUST include Program, root module, actions, payload summaries, logic/effect/process summaries, imports/services summaries, source refs, budgets and digest.
- **FR-006**: (NS-3) Payload reflection MUST provide stable summary for `Schema.Void`, primitive schemas and struct schemas.
- **FR-007**: (NS-5, KF-8) Payload validation MUST return stable success or issue list with path, code and bounded message.
- **FR-008**: (NS-10) Manifest extraction MUST apply deterministic budgets and truncation/degradation markers.
- **FR-009**: (NS-5) Manifest digest MUST be stable for equivalent declarations.
- **FR-010**: (NS-5, KF-8) Manifest diff MUST report action additions/removals and payload summary changes.
- **FR-011**: (NS-8) Static-live binding law MUST provide manifest digest, action tag, payload schema or validator availability ref, binding status and gap or denial reason fields for live operation evidence.
- **FR-012**: (NS-8) Runtime operation accepted/completed/failed/denied event facets MUST be owned by runtime live evidence and canonical evidence, not by the reflection manifest.
- **FR-013**: (NS-10) Reflection binding payloads and live evidence refs MUST be bounded and serializable.
- **FR-014**: (NS-5) CLI trial/run/check export MUST reuse the same manifest DTOs.
- **FR-015**: (NS-5) Workbench bridge MUST convert manifest outputs and canonical live evidence facets into 165 truth inputs, context refs or evidence gaps.
- **FR-016**: (KF-10) Devtools and Playground MUST NOT maintain private action/payload manifest authorities after this spec closes.
- **FR-017**: (KF-9) Driver/Scenario/Service Source Files metadata MUST remain outside core reflection manifest unless emitted as context refs or product metadata by owner adapters.
- **FR-018**: (KF-10) System MUST NOT export public `Logix.Reflection` root in this phase.
- **FR-019**: (KF-10) System MUST NOT add public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario` or `Program.capabilities.mocks`.
- **FR-020**: (NS-7, KF-10) System MUST provide a repo-internal consumption contract that lets 166 map minimum manifest outputs and canonical evidence facets into Playground UI without defining private shared DTOs.
- **FR-021**: (NS-8, KF-8) Reflection MUST NOT define a second runtime event vocabulary. Live event facets stay in canonical evidence and later live bridge planning.
- **FR-022**: (KF-10) System MUST NOT own Playground source bundling, sandbox transport or product session state.
- **FR-023**: (KF-10) Cross-tool consumers MUST classify shared facts as `authority`, `contextRef`, `debugEvidence`, `hostViewState` or `evidenceGap`.
- **FR-024**: (KF-8) 167 MUST own stable payload validation issue path, code and bounded message; consumers own JSON text parsing and UI presentation.

### Non-Functional Requirements

- **NFR-001**: (NS-10) Reflection extraction MUST be off hot path unless explicitly requested by check/trial/CLI/workbench/debug flows.
- **NFR-002**: (NS-10) Diagnostics disabled MUST have near-zero overhead for any live evidence collection hook that cites reflection binding fields.
- **NFR-003**: (NS-8) Operation coordinates in live evidence MUST use stable instance/txn/op identifiers and avoid random/time defaults.
- **NFR-004**: (NS-5) Reflection payloads MUST be JSON-safe or expose explicit non-serializable degradation markers.
- **NFR-005**: (NS-10) Manifest budgets and live evidence capture budgets MUST be configurable for internal runners and default to bounded output.
- **NFR-006**: (KF-10) Public surface sweep MUST show no new public reflection/runtime playground APIs.
- **NFR-007**: (NS-10) Any new live evidence hook on dispatch/run/check/trial paths MUST include disabled-mode overhead evidence.

### Key Entities

- **RuntimeReflectionManifest**: Full repo-internal Program reflection DTO.
- **MinimumProgramActionManifest**: 166-facing minimum action manifest slice.
- **ReflectedActionDescriptor**: One reflected action with payload kind, summary, validator availability and authority.
- **PayloadSchemaSummary**: Bounded deterministic summary of an action payload schema.
- **PayloadValidationResult**: Success or issue list for JSON payload validation.
- **StaticLiveBindingLaw**: Manifest digest, action tag, payload schema or validator availability ref, binding status and gap or denial reason fields that live evidence cites.
- **ManifestDiff**: Stable diff between two reflection manifests.
- **WorkbenchReflectionBridge**: Adapter from manifest/observability outputs to 165 authority bundle.
- **CrossToolConsumptionLaw**: Repo-internal classification law consumed by Playground, CLI and Devtools so each consumer can render without inventing private action/payload/operation schemas.

## Success Criteria

- **SC-001**: 166 can render action panel from minimum manifest and no longer uses regex as primary action authority.
- **SC-002**: Payload summary and validation pass for void, primitive and struct action schemas.
- **SC-003**: Static-live binding law lets canonical live operation evidence cite reflection facts with no Playground type imports.
- **SC-004**: Manifest digest is stable across equivalent Program declarations.
- **SC-005**: Manifest diff detects action addition/removal and payload summary change.
- **SC-006**: CLI trial/run/check can export manifest digest with Run/Check/Trial output.
- **SC-007**: 165 bridge can classify manifest output as truth input/context ref/evidence gap.
- **SC-008**: Negative sweep finds no public `Logix.Reflection`, `Runtime.playground`, `Runtime.driver`, `Runtime.scenario` or `Program.capabilities.mocks`.
- **SC-009**: 166 can consume minimum manifest and cross-tool consumption classifications through repo-internal adapters while keeping Driver/Scenario metadata in Playground product space.
