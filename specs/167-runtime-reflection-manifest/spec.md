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
- `Module.descriptor(...)` 与 runtime debug event `trace:module:descriptor` 能暴露 action keys、logic units、schema keys 等基础信息。
- `ports/exportPortSpec.ts` 已有 payload type summary 方向。

当前缺口：

- reflection 仍是 internal expert helper，缺一个明确的 repo-internal Cross-tool Consumption Law。
- manifest action 只够表达 `void | nonVoid | unknown`，不够支持 payload schema summary、JSON validation、example seed、字段错误。
- Program 级 manifest 不完整，无法稳定描述 root module、initial state shape、imports/services、processes、run/check/trial availability。
- Runtime session events 与 manifest 没有统一解释法，CLI、Playground、Devtools 难以共享。
- Playground 当前仍有源码正则 fallback，不能成为终局 authority。
- Playground 当前 Run/session 仍有 package-local simulation。把默认运行路径切到 `Runtime.run` 和 `Runtime.openProgram` 属于 166；把 dispatch/run/check/trial lifecycle 解释成共享 event and coordinate law 属于 167。

## Scope

### Closure Tracks

167 is split into two planning closures:

- **167A minimum closure**: minimum Program action manifest, fallback classification, Cross-tool Consumption Law and public API negative sweep. 166 depends on 167A.
- **167B terminal reflection closure**: full Program manifest, deeper payload validation, manifest diff, CLI/Devtools reuse, observability collection, disabled-mode overhead evidence and deeper 165 bridge integration. 166 does not depend on full 167B closure.

### In Scope

- Runtime Reflection Manifest vNext 的 repo-internal owner、shape、authority、budget 和 digest 规则。
- Program-level manifest 与 module-level manifest 的最小稳定字段。
- Action payload schema summary 与 JSON payload validation projection。
- Runtime session event and coordinate law for dispatch/run/check/trial lifecycle. Collection hooks and batch buffering belong to 167B or follow-up closure.
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

### TD-002 - Manifest Is Authority Projection, Not Runtime Truth

Reflection manifest projects configured Program/Module declarations and produced runtime evidence into stable, bounded, serializable DTOs.

Rules:

- Manifest does not execute Program.
- Manifest does not replace Runtime state, Check/Trial reports or evidence envelope.
- Manifest can be a context/truth input to 165 only when it is produced by owner-approved reflection/export path.
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

### TD-006 - Runtime Event And Coordinate Law

Reflection vNext first defines a stable event and coordinate law for runtime session observability:

- `operation.accepted`
- `operation.completed`
- `operation.failed`
- `evidence.gap`
- `operationKind`: `dispatch | run | check | trial`
- stable instance/txn/op coordinates
- source snapshot/revision context when supplied by host
- bounded attachment refs for state, logs or trace

Rules:

- Transaction window still forbids IO.
- Collection hooks, buffering and disabled-mode perf evidence belong to 167B or follow-up closure.
- Event output is bounded and serializable.
- Event output can feed 165 as debug evidence or evidence gap.
- Event output does not rewrite Runtime state, Check/Trial report verdict or compare output.
- Playground may attach source snapshot revision/session id as host context, but the event vocabulary and coordinate interpretation are owned here.

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
  dispatch/run/check/trial event and coordinate law
  shared operation coordinate interpretation
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

CLI trial/run/check must be able to export:

- manifest
- manifest digest
- manifest diff
- Run result
- Check/Trial report
- bounded operation events
- workbench authority bundle bridge

Rules:

- CLI transport shape can be CLI-owned, but reflection payload must use the same core manifest DTOs.
- Manifest diff can be used as self-verification evidence.
- Reflection mismatch or missing owner coordinate must become an evidence gap.

### TD-008 - Devtools And Playground Reuse Same Derivation Law

Playground and Devtools can render different UI, but they must not invent separate manifest authorities.

Rules:

- Playground may add product metadata like Driver/Scenario/Service Source Files outside manifest.
- Devtools may add live selection state outside manifest.
- Shared interpretation of action, payload, state summary and operation coordinates comes from reflection DTOs, runtime event law and 165 projection.
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
- Runtime event collection can represent dispatch lifecycle with stable operation coordinates.
- CLI trial/run/check can export manifest digest and manifest diff.
- 165 bridge classification matrix maps manifest, action/payload/dependency reflection nodes, runtime output, Check/Trial report, operation event and evidence gaps without generic `convertible` escape.
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

### User Story 3 - Runtime Event And Coordinate Law (Priority: P2)

As a workbench consumer, I can interpret dispatch/run/check/trial lifecycle with a small event vocabulary and stable operation coordinates.

**Traceability**: NS-5, NS-8, NS-10, KF-6, KF-8

**Why this priority**: Playground, CLI and Devtools need the same operation vocabulary to explain runtime behavior, but collection hooks and perf evidence are 167B work.

**Independent Test**: Dispatch one action and verify accepted/completed events and operation id can be represented without importing Playground session or snapshot types.

**Acceptance Scenarios**:

1. **Given** a dispatch operation, **When** it completes, **Then** event law can represent accepted/completed entries with stable op coordinate.
2. **Given** a failed dispatch, **When** it is exported, **Then** failure kind and bounded message are present.
3. **Given** state/log/trace data, **When** events are exported, **Then** those data appear only as bounded attachment refs.

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
- **FR-011**: (NS-8) Runtime event law MUST include `operation.accepted`, `operation.completed`, `operation.failed` and `evidence.gap` with stable operation coordinate.
- **FR-012**: (NS-8) Runtime event law MUST represent `dispatch`, `run`, `check` and `trial` through `operationKind` rather than separate event families.
- **FR-013**: (NS-10) Event output and attachment refs MUST be bounded and serializable.
- **FR-014**: (NS-5) CLI trial/run/check export MUST reuse the same manifest DTOs.
- **FR-015**: (NS-5) Workbench bridge MUST convert manifest and observability outputs into 165 truth inputs, context refs or evidence gaps.
- **FR-016**: (KF-10) Devtools and Playground MUST NOT maintain private action/payload manifest authorities after this spec closes.
- **FR-017**: (KF-9) Driver/Scenario/Service Source Files metadata MUST remain outside core reflection manifest unless emitted as context refs or product metadata by owner adapters.
- **FR-018**: (KF-10) System MUST NOT export public `Logix.Reflection` root in this phase.
- **FR-019**: (KF-10) System MUST NOT add public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario` or `Program.capabilities.mocks`.
- **FR-020**: (NS-7, KF-10) System MUST provide a repo-internal consumption contract that lets 166 map minimum manifest and observability outputs into Playground UI without defining private shared DTOs.
- **FR-021**: (NS-8, KF-8) Runtime event vocabulary MUST stay limited to `operation.accepted`, `operation.completed`, `operation.failed` and `evidence.gap` in this closure.
- **FR-022**: (KF-10) System MUST NOT own Playground source bundling, sandbox transport or product session state.
- **FR-023**: (KF-10) Cross-tool consumers MUST classify shared facts as `authority`, `contextRef`, `debugEvidence`, `hostViewState` or `evidenceGap`.
- **FR-024**: (KF-8) 167 MUST own stable payload validation issue path, code and bounded message; consumers own JSON text parsing and UI presentation.

### Non-Functional Requirements

- **NFR-001**: (NS-10) Reflection extraction MUST be off hot path unless explicitly requested by check/trial/CLI/workbench/debug flows.
- **NFR-002**: (NS-10) Diagnostics disabled MUST have near-zero overhead for any 167B observability collection hook.
- **NFR-003**: (NS-8) All operation coordinates MUST use stable instance/txn/op identifiers and avoid random/time defaults.
- **NFR-004**: (NS-5) Reflection payloads MUST be JSON-safe or expose explicit non-serializable degradation markers.
- **NFR-005**: (NS-10) Manifest and observability budgets MUST be configurable for internal runners and default to bounded output.
- **NFR-006**: (KF-10) Public surface sweep MUST show no new public reflection/runtime playground APIs.
- **NFR-007**: (NS-10) Any new observability hook on dispatch/run/check/trial paths MUST include disabled-mode overhead evidence.

### Key Entities

- **RuntimeReflectionManifest**: Full repo-internal Program reflection DTO.
- **MinimumProgramActionManifest**: 166-facing minimum action manifest slice.
- **ReflectedActionDescriptor**: One reflected action with payload kind, summary, validator availability and authority.
- **PayloadSchemaSummary**: Bounded deterministic summary of an action payload schema.
- **PayloadValidationResult**: Success or issue list for JSON payload validation.
- **RuntimeOperationEventLaw**: Small runtime operation event vocabulary with stable coordinates and bounded attachment refs.
- **ManifestDiff**: Stable diff between two reflection manifests.
- **WorkbenchReflectionBridge**: Adapter from manifest/observability outputs to 165 authority bundle.
- **CrossToolConsumptionLaw**: Repo-internal classification law consumed by Playground, CLI and Devtools so each consumer can render without inventing private action/payload/operation schemas.

## Success Criteria

- **SC-001**: 166 can render action panel from minimum manifest and no longer uses regex as primary action authority.
- **SC-002**: Payload summary and validation pass for void, primitive and struct action schemas.
- **SC-003**: Runtime event law represents accepted/completed/failed operation entries with stable op coordinate and no Playground type imports.
- **SC-004**: Manifest digest is stable across equivalent Program declarations.
- **SC-005**: Manifest diff detects action addition/removal and payload summary change.
- **SC-006**: CLI trial/run/check can export manifest digest with Run/Check/Trial output.
- **SC-007**: 165 bridge can classify manifest output as truth input/context ref/evidence gap.
- **SC-008**: Negative sweep finds no public `Logix.Reflection`, `Runtime.playground`, `Runtime.driver`, `Runtime.scenario` or `Program.capabilities.mocks`.
- **SC-009**: 166 can consume minimum manifest and cross-tool consumption classifications through repo-internal adapters while keeping Driver/Scenario metadata in Playground product space.
