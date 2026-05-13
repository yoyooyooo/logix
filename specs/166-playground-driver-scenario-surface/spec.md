# Feature Specification: Professional Logic Playground vNext

**Feature Branch**: `166-playground-driver-scenario-surface`  
**Created**: 2026-04-28  
**Status**: Done, Phase 11 visual pressure alignment closed
**Input**: User description: "把 166 改造成 Playground 下一阶段，面向终局。核心是 Logic-first runtime workbench，默认不依赖 UI preview，专业级布局，session 默认开启，反射 Actions / curated Drivers / Scenario playback，Run / Check / Trial / Reset 语义清晰，并持续给 Runtime / Devtools 内核施压。"

**2026-04-29 Visual Alignment Update**: Runtime proof, projection and direct Playwright shell evidence remain recorded in [notes/verification.md](./notes/verification.md). A later multimodal review reopened visual pressure alignment; the original gap evidence is retained in [notes/visual-alignment-gap-analysis.md](./notes/visual-alignment-gap-analysis.md). Phase 11 now closes the executable visual pressure contract through single-header workbench layout, pressure-specific default tabs, materialized pressure data, strict local scroll ownership, refreshed screenshots and passing browser route acceptance.

**2026-04-30 168 Parity Update**: Run success now carries `valueKind / lossy / lossReasons`; Run failure remains result-face failure and may project to Workbench `run-failure-facet`; preview-only or host compile failures without owner authority degrade to evidence gap; diagnostics routes and visual pressure routes must declare separate authority classes. Reflection action/payload gaps and payload validator unavailable demos are registry routes, and Check/Trial plus Run failure session captures now have compare-compatible refs.

## Current Role

本页是 Logix Playground 下一阶段的可执行规格。它把原先的 Driver/Scenario 单点规格升格为 Professional Logic Playground vNext 总规格。

本页承接：

- [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md) 的产品 SSoT。
- [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md) 的 projection-only workbench kernel。
- [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md) 的 Runtime Reflection Manifest vNext；166 只消费 167A minimum Program action manifest slice 与 Cross-tool Consumption Law。
- 当前 `packages/logix-playground` 已有的 source snapshot、Program session、Action workbench 与 bottom evidence lanes。

本页冻结下一阶段要达成的产品体验、运行时边界、布局语义、验收指标和 must-cut 清单。它不把 Playground 能力提升为 Logix public authoring API，也不接管 Runtime control plane、evidence envelope、DVTools UI 或 sandbox transport contract。

166 的职责固定为消费下层真实能力并完成 Playground 产品闭环。它可以实现 ProjectSnapshot、source bundling、sandbox transport adapter、UI state、Driver/Scenario product metadata 和 evidence projection adapter；它不能把 reflection manifest、payload validation、runtime event collection 或新的 Runtime authority schema 留在 Playground 私有层。凡是需要被 Playground、CLI 和 Devtools 共享的 action/payload/operation 解释能力，归 [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-5, NS-7, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-6, KF-8, KF-9, KF-10

## Context

165 已经把 Playground、DVTools、CLI repair 共享的解释层裁定为内部 Runtime Workbench Kernel。166 之前只覆盖 Driver/Scenario，但当前 Playground 的真实缺口更大：

- 当前页面仍残留 UI preview 心智，`App.tsx` 对 Logic-first demo 没有必要。
- 当前布局像拼装工作台，Source、State、Actions、Logs 的主次与尺寸控制都不专业。
- `Session` 的 Start / Close 语义不成立。Playground 打开后就应该有当前 snapshot 的 session，源码变更后自动 restart。
- `Run / Check / Trial / Reset` 必须有明确输出目标和状态反馈。
- 当前 Action reflection 与 local runner 还带 MVP 痕迹，不能证明任意 Program 的 playground experience。

本页裁定：下一阶段的 Playground 先把核心体验做成 Logic-first runtime workbench。UI preview 退为 optional adapter。默认演示路径通过 Program source、reflected actions、curated drivers、scenario playback、state/result/log/trace/diagnostics 展示 Logix 运行时行为。

当前实现中 `runLocalProgramSnapshot`、`createDefaultProgramSessionRunner`、local-counter `counterStep` 正则和源码 action 正则都只能视为 MVP scaffolding。G0 已删除生产源码里的 `runLocalProgramSnapshot` 与 `createDefaultProgramSessionRunner`，并把默认路径切到 `ProjectSnapshotRuntimeInvoker`，由它消费当前 `ProjectSnapshot` 编译后的 `Runtime.run`、`Runtime.openProgram`、`Runtime.check` 和 `Runtime.trial`。源码 action 正则仍是 167A manifest 落地前的 `fallback-source-regex` 债务，不能升格为 action authority。

## Terminal Decisions

### TD-001 - Logic-first Product Identity

Playground 的默认产品身份固定为 Logic-first runtime workbench：

```text
edit source
  -> current ProjectSnapshot revision
  -> auto-ready Program session
  -> reflected actions / curated drivers / scenarios
  -> dispatch or invoke
  -> state / result / console / trace / diagnostics
```

Rules:

- Program source is the primary runnable artifact.
- `App.tsx` is optional and only exists for projects that explicitly declare preview capability.
- Logic-first demo projects SHOULD NOT include default `App.tsx`.
- Preview adapter MAY exist, but it is never the runtime truth, diagnostic authority or default closure requirement.
- Sandpack MAY remain as an optional preview adapter only while it does not affect Logic-first execution. It must not be on the default path.

### TD-002 - Session Is Auto-ready And Reset-only

Program session is a default runtime window for the current snapshot.

Rules:

- Opening a valid Program project creates a ready session for the current snapshot.
- Source edit creates a new snapshot revision and automatically restarts the session.
- Auto restart clears previous action history, state projection, dispatch logs and traces for the old snapshot.
- Auto restart adds one bounded lifecycle log entry with previous session id and new revision.
- Every async result from Run, Check, Trial, dispatch, Driver or Scenario step must carry `projectId`, snapshot `revision`, `sessionId` and monotonic `opSeq`.
- Only a result whose `projectId`, `revision`, `sessionId` and `opSeq` match the current session root may mutate current state, result, logs, trace or diagnostics.
- Non-matching completions are stale evidence or bounded lifecycle logs only.
- The UI must not expose `Start session`, `Close session` or `No active session` as normal states.
- User-facing session control is `Reset session`, which restarts from the current snapshot.
- Stale session warning is only a fallback safety state, not the normal source-edit flow.

### TD-003 - Host Commands Have Explicit Outputs

Top command bar commands are host commands. They do not represent business interactions.

Rules:

- `Run` executes current snapshot's Program `main(ctx,args)` and writes to `Run Result`.
- `Check` executes `Runtime.check` and writes to Diagnostics summary/detail.
- `Trial` executes startup trial and writes to Diagnostics summary/detail.
- `Reset` restarts current Program session and clears session-derived output.
- `Reload` may reload the project from registry/original files when needed, but it must not silently overwrite user edits without an explicit product decision.
- Disabled commands must show a concise reason through UI affordance or status text.
- Commands with no real output must be removed from the primary command bar until wired.

### TD-003A - 166 Consumes Real Runtime Faces

Playground default execution must use existing Runtime faces rather than package-local simulation.

Rules:

- `Run` uses current snapshot's compiled `Program` and `main` through `Runtime.run`.
- Program session dispatch uses current snapshot's compiled `Program` through `Runtime.openProgram`.
- `Check` uses `Runtime.check`; `Trial` uses `Runtime.trial(mode="startup")`.
- `ProjectSnapshot -> executable module` bundling and sandbox transport adapter are Playground concerns because they are host/source concerns.
- The planning boundary for this host path is `ProjectSnapshotRuntimeInvoker`, not a broad runtime adapter.
- The result of execution is authority-backed runtime output. Playground may bound, classify and project it, but it must not fabricate Program state from source strings.
- `ProjectSnapshotRuntimeInvoker` may return only `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap`.
- `ProjectSnapshotRuntimeInvoker` must not own action authority, payload validation, operation vocabulary, Program state fabrication, session reducer state, Driver semantics or Scenario semantics.
- `runLocalProgramSnapshot`, `createDefaultProgramSessionRunner` and local-counter source parsing are allowed only as tests, fallback fixtures or temporary migration scaffolding with removal tasks.
- Any data shape that must be shared with CLI or Devtools must move to 167 instead of growing as a Playground-private schema.

### TD-003B - Runtime Proof First Gate

166 closes the first implementation gate only after real Runtime execution is proven.

Rules:

- G0 Runtime Proof must pass before UI pressure, Monaco completion, Driver, Scenario or docs-ready polish can count as closure.
- G0 requires source edit to change subsequent `Runtime.run` output and subsequent `Runtime.openProgram` dispatch state through the same current snapshot.
- G0 requires production UI to stop importing package-local fake runner and local-counter parsing.
- G0 requires `Runtime.check` and `Runtime.trial(mode="startup")` to consume the current snapshot through existing Runtime faces.
- Visual pressure fixtures only prove layout pressure. They cannot substitute for Runtime execution proof.

### TD-003C - Run Value And Failure Parity

Run output must preserve result-face shape separation after 168.

Rules:

- Successful Run output carries `status="success"` plus bounded JSON-safe value projection.
- Business `null`, projected `undefined`, stringified output and truncated output must be distinguishable through `valueKind / lossy / lossReasons`.
- Run failure carries `status="failed"` and bounded failure detail. It must update Run Result failure UI and Workbench `run-failure-facet` when accepted by 165 projection.
- Run failure does not create `runtime.trial` diagnostics. Trial remains the startup diagnostic route for dependency, config, boot and close checks.
- Preview-only failure and host compile failure without Runtime/transport authority become evidence gaps or transport/pre-control-plane failures.
- Diagnostics demo routes must declare runtime authority class. Visual pressure routes must declare visual-only authority class.

### TD-004 - Professional Resizable Layout

Default desktop layout is a resizable full-viewport workbench:

```text
top command bar
  Logix Playground / project id / revision / session status / Run / Check / Trial / Reset

main horizontal resizable group
  left: Files
  center: Source editor
  right: Runtime inspector

bottom vertical resizable drawer
  Console / Diagnostics / Trace / Snapshot
```

Rules:

- Files width is resizable and collapsible.
- Bottom evidence drawer height is resizable and can be minimized/maximized.
- Runtime inspector width is resizable.
- Files, Runtime inspector and Bottom drawer resizing must use real interactive resize primitives with accessible `separator` handles; fixed CSS grid sizing does not satisfy this rule.
- Drag completion must write normalized pixel sizes back to Playground host layout state.
- Source editor remains the largest default panel.
- Runtime inspector must show State and Actions without forcing users to scroll a tiny nested area.
- Bottom tabs must have observable selected state and content.
- No nested cards. Repeated action rows, modals and individual summaries may use compact panels.
- Layout state is Playground control state and SHOULD be dogfooded through Logix workbench module.

### TD-005 - Runtime Inspector Owns The Primary Feedback Loop

The right inspector is the primary feedback loop after an action or driver execution.

It must expose:

- current state projection
- last operation
- operation id
- selected action/driver/scenario status
- Run result when available
- Diagnostics summary when available
- bounded error state

Rules:

- `Program` as a standalone hint panel is removed unless it contains real Run result, Program manifest or execution metadata.
- State and Actions must be visually comparable in the same inspector lane or adjacent resizable panes.
- Logs and Trace can remain in the bottom drawer because they are detailed evidence.

### TD-005A - Monaco Is The Playground Editor

All Playground editor surfaces use Monaco as the primary editor engine.

Rules:

- Source editing, service editing, fixture editing, JSON payload editing and advanced raw dispatch editing must use the package-owned Monaco editor adapter on the normal path.
- Monaco must support TypeScript, TSX, JavaScript, JSX, JSON, CSS and Markdown files.
- Textarea is allowed only as a bounded fallback when Monaco fails to load, not as the normal path.
- TypeScript and JavaScript source files must use Monaco's TypeScript language service for diagnostics, hover, go-to-definition and completion where available.
- JSON payload editors must use Monaco JSON language support. Schema-backed JSON validation can improve later through 167 payload reflection, but editor ownership stays in Playground.
- Monaco models must be keyed by virtual file URI derived from `ProjectSnapshot.files`.
- Cross-file imports inside the virtual source tree must be visible to Monaco language service through synchronized models.
- Workspace package types for `@logixjs/*`, `effect`, React and other approved dependencies must be available through a generated Monaco type bundle or equivalent `extraLibs` pipeline.
- The old `examples/logix-sandbox-mvp` Monaco implementation is implementation evidence and may be mined, but the terminal owner is `packages/logix-playground`.
- Monaco/LSP state is editor host state. It does not become runtime truth, diagnostic authority or Runtime Workbench Kernel input.

### TD-006 - Reflected Action Workbench Is Internal Dogfood, Curated Driver Is Docs-friendly

Two interaction levels are allowed:

```text
Reflected Action Workbench
  -> derived from Program manifest/reflection
  -> advanced/internal dogfood

Curated Driver
  -> declared by PlaygroundProject product metadata
  -> docs-friendly business operation
```

Rules:

- Reflected actions must prefer the 167 minimum Program action manifest slice.
- Regex source parsing is only fallback when manifest extraction fails during the 167 dependency window; it must be labelled `fallback-source-regex`, produce an evidence gap and have a removal task.
- `Schema.Void` actions get direct dispatch buttons.
- Non-void actions get JSON payload editor. 166 may start with JSON parsing plus payload kind; richer payload summary/validation belongs to 167.
- Raw dispatch is advanced-only and hidden by default.
- Curated drivers can wrap dispatch/invoke with a stable label, example payloads and read anchors.
- Driver declaration remains Playground product metadata. It does not become Logix authoring API.
- 166 may define an `ActionPanelViewModel` for UI selection and editor state.
- 166 must not define a manifest-like authority DTO containing action authority, payload kind, payload summary, validator availability or digest. Those fields come from the 167 minimum manifest slice or are absent with an evidence gap.
- 166 owns JSON text parsing for payload editors. Stable payload schema validation issues are owned by 167.

### TD-007 - Scenario Playback Remains Product Playback

Scenario Playback is a no-UI or UI-optional demo surface for multi-step flows.

Rules:

- Scenario can run all or step-by-step.
- Steps may use driver, wait, settle, observe and expect product semantics.
- Every wait/settle has timeout.
- `expect` failure is Playground product failure.
- Scenario output can be projected into state/result/log/trace/diagnostics UI.
- Scenario declarations, steps and expectations are not Runtime Workbench Kernel truth inputs.
- Scenario `expect` does not become `runtime.compare` authority.
- Driver is staged after Runtime Proof, Reflection Authority and Lifecycle Commit gates pass.
- Scenario is staged after Driver output classification is explicit.

### TD-007A - Interaction Evidence Matrix Is The Playground Test Contract

Playground interaction tests must prove the full evidence path for every product trigger.

Rules:

- Reflected action, raw dispatch, curated Driver and Scenario driver step are all session dispatch consumers.
- These triggers may use different UI affordances, but they must flow through the current Program session and carry current `projectId`, snapshot `revision`, `sessionId` and monotonic `opSeq`.
- The session evidence contract covers state projection, console log, current runner/runtime output and operation identity.
- Synthetic runner dispatch logs must describe only the current dispatch operation. History replay may rebuild state, but replay logs must not leak as current operation evidence.
- Runtime dispatch failure must preserve the previous state and record a classified failure in session evidence.
- Reset must restart the session and clear old session-derived dispatch logs, traces and action history.
- Raw dispatch remains advanced-only, hidden by default and gated by current manifest action tags. Unknown raw actions must produce a visible error without calling the runner.
- `Run`, `Check` and `Trial` are host commands. They write Run Result or Diagnostics output and must not create action dispatch logs.
- Tests for repeated UI labels must scope queries to the owning region or stable selector from [ui-contract.md](./ui-contract.md).
- This matrix is a `packages/logix-playground` test contract only. It does not add Runtime public API, Driver authoring API, Scenario authoring API or Runtime Workbench Kernel truth input.

### TD-008 - Service Source Files Are Ordinary Source

Service Source Files let docs readers and Agents edit service behavior as source files.

Rules:

- service file role metadata can group source files and guide navigation.
- service files are regular `PlaygroundFile` entries in the same snapshot.
- service source edits produce the same snapshot revision mechanism as other source edits.
- Run, Driver, Scenario, Check and Trial consume the same current snapshot.
- Service validation/execution failures are product failures or control-plane diagnostics, depending on the authority that produced them.
- No `Program.capabilities.mocks`, no public mock API, no separate mock workspace.

### TD-009 - Runtime Workbench Kernel Is Projection-only

Playground consumes 165 by producing an authority bundle from actual outputs:

- Run result projection
- Check/Trial report
- canonical evidence refs when available
- stable runtime debug event batch when available
- evidence gaps
- source snapshot digest/span as context refs

Rules:

- Kernel does not own layout, active tab, editor buffer, driver schema, payload schema, scenario step runner or preview lifecycle.
- Playground must not keep private diagnostic report authority once 165 projection is available.
- Result, Diagnostics, Trace and Snapshot UI must be explainable as authority-backed projection, context ref or host view state.

### TD-010 - Standard Playground Project Source Layout

Playground projects have two distinct directory layers:

```text
user-visible virtual source tree
  -> files shown in the Playground file navigator
  -> files that participate in ProjectSnapshot
  -> files consumed by Run / Check / Trial / Driver / Scenario

author-side project declaration tree
  -> registry code owned by examples/docs
  -> driver/scenario metadata
  -> raw source imports used to build PlaygroundProject.files
```

The standard user-visible virtual source tree is:

```text
/src/main.program.ts
/src/logic/<domain>.logic.ts
/src/services/<service>.service.ts
/src/fixtures/<fixture>.fixture.ts
/src/preview/App.tsx
```

Rules:

- Logic-first projects SHOULD use `/src/main.program.ts` as `program.entry`.
- `*.program.ts` is the runtime assembly entry. It imports modules/logics/services, builds `Program`, and exports the runnable `Program` plus `main` when needed.
- `*.logic.ts` contains Logix logic units, action declaration proximity and domain runtime behavior.
- `*.service.ts` contains ordinary editable service implementation source. Service files still participate in the same `ProjectSnapshot`.
- `*.fixture.ts` contains example-local fixture/env data only when it must be editable or visible in the Playground.
- `/src/preview/App.tsx` is optional and appears only for preview-capable projects.
- The old bare `/src/program.ts` shape is allowed only as historical or temporary implementation debt inside 166 until the project is migrated.
- Driver and Scenario declarations are not runtime source by default. They live in the author-side project declaration tree as Playground product metadata.

The standard author-side project declaration tree is:

```text
examples/<host>/src/playground/projects/<project-id>/
  index.ts
  files.ts
  drivers.ts
  scenarios.ts
  service-files.ts
  sources/
    src/main.program.ts
    src/logic/<domain>.logic.ts
    src/services/<service>.service.ts
    src/fixtures/<fixture>.fixture.ts
    src/preview/App.tsx
```

Rules:

- `index.ts` is the project declaration entry and exports one `definePlaygroundProject(...)` value.
- `files.ts` maps raw source files into `PlaygroundProject.files` using the standard virtual paths.
- `drivers.ts`, `scenarios.ts` and `service-files.ts` are optional and remain Playground product metadata.
- Docs and examples MUST reuse the same project declaration authority instead of copying virtual source maps.
- If a project has only one file group, `files.ts` may inline imports from `sources/**`; the virtual paths must still follow this standard.

## Scope

### In Scope

- Logic-first project shape that does not require `App.tsx`.
- Standard project source layout for Logic-first examples and docs-ready Playground projects.
- Professional resizable layout.
- Auto-ready reset-only Program session.
- Clear Host Command semantics for Run, Check, Trial and Reset.
- Runtime inspector that makes action, state, result and last operation comparable.
- Reflected action workbench from 167 minimum Program action manifest or temporary fallback with explicit removal path.
- Runtime-backed Program execution through `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial`.
- Curated Driver product metadata and manual payload execution.
- Scenario Playback product metadata and step-by-step/run-all behavior.
- Service Source Files as ordinary source snapshot participants.
- Workbench projection integration with 165.
- Examples dogfood route proving the experience in `examples/logix-react`.
- Docs reuse readiness through the same package and registry authority.

### Out of Scope

- Public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`, `Program.capabilities.mocks` or related public API.
- A public editor/preview adapter contract.
- Sandpack as runtime authority or default execution path.
- Browser DOM replay, click recorder, visual assertions or preview protocol semantics.
- Cloud persistence, share links, custom user projects or collaborative workspace.
- Turning Scenario Playback `expect` into compare truth.
- Turning raw action dispatch into default user path.
- Redefining Runtime Workbench Kernel, Runtime control plane report, evidence envelope or DVTools UI.
- Defining terminal reflection manifest, payload validation, runtime event collection or shared CLI/Devtools operation DTOs.

## User Scenarios & Testing

### User Story 1 - Open A Logic-first Program Playground (P1)

As a docs reader or maintainer, I can open a stable playground route and see source, state, actions and logs without a UI preview.

**Traceability**: NS-3, NS-7, KF-3, KF-10

Acceptance:

1. Given a Logic-first project without `App.tsx`, when I open `/playground/:id`, then the page enters the tool UI with no preview requirement.
2. Given the project has a Program entry, when the page loads, then a ready session for the current snapshot is visible.
3. Given I click a reflected void action, when dispatch completes, then state, last operation, console and trace reflect the action from `Runtime.openProgram` execution, not a source-string simulation.
4. Given I edit source, when the snapshot revision changes, then the session auto restarts and the console records one restart lifecycle entry.
5. Given action history contains more than one dispatch, when a new action or Driver runs, then the console exposes one current synthetic runner dispatch log for that operation and does not leak replay dispatch logs as current evidence.

### User Story 2 - Use A Professional Resizable Workbench (P1)

As a user inspecting runtime behavior, I can resize Files, Source, Runtime inspector and bottom evidence lanes so source editing and action observation both remain comfortable.

**Traceability**: NS-7, NS-10, KF-10

Acceptance:

1. Files, Runtime inspector and bottom drawer can be resized without layout overlap.
2. State and Actions remain visible together at the default desktop size.
3. Bottom tabs switch visible content and selected state.
4. Mobile layout collapses into Source, Runtime, Diagnostics and Console views without losing commands.
5. The five visual pressure contracts keep required visible regions, local scroll ownership and forbidden-overflow rules at `1366x768`.

### User Story 3 - Run / Check / Trial With Clear Outputs (P1)

As a maintainer or Agent, I can run each host command and know where the output appears.

**Traceability**: NS-4, NS-5, NS-8, KF-6, KF-8

Acceptance:

1. Run writes a bounded JSON-safe result with run id and revision from `Runtime.run(Program, main)`.
2. Check writes a control-plane diagnostic report summary and detail.
3. Trial writes startup trial report summary and detail.
4. Reset restarts the session and clears state/log/trace derived from previous operations.
5. Commands without available authority are disabled with a visible reason.
6. Check and Trial diagnostics must be selectable through the bottom evidence drawer and must not create action dispatch logs.

### User Story 4 - Drive No-UI Demos With Curated Drivers (P2)

As a docs author, I can expose business-level driver buttons and payload examples without exposing raw internal action objects as the default path.

**Traceability**: NS-3, NS-7, KF-3, KF-9

Acceptance:

1. A project can declare curated drivers with stable id, label, operation kind, payload input and examples.
2. Driver execution updates state/result/log/trace through the same session.
3. Raw dispatch remains advanced-only and manifest-gated.
4. Docs and examples consume the same project registry declaration.
5. Unknown raw dispatch input must surface a visible error without calling the session runner or recording dispatch-accepted evidence.

### User Story 5 - Demonstrate Multi-step Async Flows (P2)

As a docs author, I can define a scenario playback that drives multiple steps, waits for async linkage and displays per-step evidence.

**Traceability**: NS-5, NS-7, NS-10, KF-8, KF-10

Acceptance:

1. A scenario can run all or step-by-step.
2. Per-step status, duration, result and failure are visible.
3. Wait/settle steps have timeout and bounded failure output.
4. Expect failure is shown as Playground product failure, not compare truth.
5. Scenario driver steps must wait for session dispatch to settle before `expect` reads state.

### User Story 6 - Edit Service Source In The Same Snapshot (P3)

As an Agent or docs reader, I can edit a service source file and immediately run the same snapshot through Run, Driver, Scenario, Check or Trial.

**Traceability**: NS-4, NS-8, KF-6, KF-9

Acceptance:

1. Service source files appear in the file navigator with role metadata.
2. Editing a service source file creates a new snapshot revision and auto restarts the session.
3. Runtime commands consume the edited source snapshot.
4. Service validation or execution failures are classified separately from payload, compile, runtime, timeout, serialization and worker failures.

## Functional Requirements

- **FR-001**: (NS-3, KF-3) Playground MUST support Logic-first projects with Program entry and no preview entry.
- **FR-002**: (NS-7) Logic-first curated examples SHOULD remove default `App.tsx` unless the project explicitly demonstrates preview integration.
- **FR-003**: (NS-7) Playground MUST create an auto-ready Program session when a valid Program project opens.
- **FR-004**: (NS-7) Source edits MUST create a new `ProjectSnapshot` revision and automatically restart the Program session.
- **FR-005**: (NS-10) Auto restart MUST clear old session action history, state projection, dispatch logs and traces, while preserving one bounded restart lifecycle log.
- **FR-005A**: (NS-10, KF-8) Async Run, Check, Trial, dispatch, Driver and Scenario outputs MUST update current state only when `projectId`, `revision`, `sessionId` and `opSeq` match the current session root.
- **FR-006**: (NS-7) The UI MUST remove normal-path `Start session` and `Close session` controls.
- **FR-007**: (NS-7) The UI MUST expose `Reset session` as the user-facing session control.
- **FR-008**: (NS-7, KF-10) The workbench MUST use resizable Files, Source, Runtime inspector and bottom evidence regions.
- **FR-009**: (NS-7) Runtime inspector MUST make current state and available actions/drivers visible without forcing users through a small nested scroll area at default desktop size.
- **FR-010**: (NS-4, KF-6) `Run` MUST execute current snapshot `main(ctx,args)` and display run id, revision, status and bounded JSON-safe value or failure.
- **FR-010A**: (NS-5, KF-8) Run success projection MUST expose `valueKind / lossy / lossReasons` so business `null`, projected `undefined`, stringified output and truncation are distinguishable.
- **FR-011**: (NS-5, KF-8) `Check` MUST display `Runtime.check` report summary and detail without wrapping it as Run result.
- **FR-012**: (NS-5, KF-8) `Trial` MUST display startup trial report summary and detail without wrapping it as Run result.
- **FR-013**: (NS-7) Commands with unavailable authority MUST be disabled with a visible reason.
- **FR-014**: (NS-3, KF-3) Reflected Action Workbench MUST derive actions from Program manifest/reflection when available.
- **FR-015**: (NS-3, KF-3) 166 MUST prefer the 167 minimum Program action manifest slice over source regex when available.
- **FR-016**: (NS-3, KF-3) Regex action reflection MUST be classified as `fallback-source-regex`, produce an evidence gap and retain removal criteria.
- **FR-017**: (NS-3) Void actions MUST support direct dispatch; non-void actions MUST support JSON payload input. Full payload summary/validation is owned by 167.
- **FR-018**: (NS-7, KF-9) Raw dispatch MUST be hidden in an advanced area and gated by current manifest action tags.
- **FR-019**: (NS-7) Curated Drivers MUST be optional `PlaygroundProject` product metadata and remain outside core/react/sandbox public authoring surface.
- **FR-020**: (NS-7) Driver execution MUST update the same session's state/result/log/trace surfaces.
- **FR-021**: (NS-10) Scenario Playback MUST support run-all, step-by-step, timeout-bounded wait/settle and per-step result display.
- **FR-022**: (NS-8, KF-8) Scenario `expect` failure MUST remain Playground product failure and MUST NOT rewrite compare or control-plane verdicts.
- **FR-023**: (NS-4, KF-9) Service Source Files MUST be normal `PlaygroundFile` entries in the same snapshot.
- **FR-024**: (NS-4, KF-9) Service file role metadata MUST stay in Playground product declaration and MUST NOT create public mock APIs.
- **FR-025**: (NS-5, KF-8) Run, Check, Trial, Driver and Scenario outputs MUST be classified for 165 as runtime output, control-plane report, debug evidence, context ref, host view state or explicit evidence gap.
- **FR-026**: (NS-10) Console, Trace, Diagnostics and Snapshot displays MUST use bounded output with truncation or degradation markers where needed.
- **FR-027**: (NS-7) Layout selection, panel sizes, active file, active tab and expanded advanced areas SHOULD be stored in the Playground workbench Logix module.
- **FR-028**: (NS-3, KF-10) Docs consumers MUST reuse the same Playground package and project registry authority as examples.
- **FR-029**: (KF-10) Playground MUST NOT introduce private diagnostic report schema, private evidence envelope or sandbox-owned product API.
- **FR-030**: (NS-7, KF-10) Logic-first Playground projects SHOULD use the standard virtual source layout with `/src/main.program.ts`, `/src/logic/*.logic.ts`, optional `/src/services/*.service.ts`, optional `/src/fixtures/*.fixture.ts` and optional `/src/preview/App.tsx`.
- **FR-031**: (NS-7, KF-10) Driver and Scenario declarations MUST remain author-side Playground project metadata and MUST NOT be treated as runtime source files by default.
- **FR-032**: (NS-7, KF-10) Playground editor surfaces MUST use Monaco as the normal editor engine, including source files, service files, fixture files, JSON payload editors and advanced raw dispatch editors.
- **FR-033**: (NS-7, KF-10) Monaco language service MUST receive current virtual source files and approved dependency types so cross-file imports and Logix public API completions work without relying on network package loading.
- **FR-034**: (NS-7, KF-10) The visible workbench layout MUST satisfy the UI contract and visual pressure cases in [ui-contract.md](./ui-contract.md), including action-dense, state-large, trace-heavy, diagnostics-dense and scenario-driver-payload states.
- **FR-035**: (NS-10, KF-10) Overflow under pressure data MUST be owned by the declared local scroll owner in each visual pressure case and MUST NOT fall back to whole-page scrolling at the minimum desktop viewport.
- **FR-036**: (NS-4, KF-6) Default Program session dispatch MUST execute through `Runtime.openProgram` against the current `ProjectSnapshot`.
- **FR-037**: (NS-4, KF-6) Default Run MUST execute through `Runtime.run` against the current `ProjectSnapshot`; package-local fake result projection is forbidden on the production path.
- **FR-038**: (NS-5, KF-8) `Runtime.check` and `Runtime.trial` output MUST remain the only Check/Trial diagnostic authority consumed by Playground.
- **FR-039**: (KF-10) 166 MUST NOT define terminal payload validation, runtime event collection or shared reflection DTOs; those belong to 167.
- **FR-040**: (KF-10) 166 MUST use a UI-local `ActionPanelViewModel` and MUST NOT define a private manifest-like action authority schema.
- **FR-041**: (KF-6, KF-10) `ProjectSnapshotRuntimeInvoker` MUST only emit `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap`.
- **FR-041A**: (KF-8, KF-10) `runtimeOutput` MAY carry `status / valueKind / lossy / lossReasons / failure`; this remains result-face projection and does not define a private diagnostic report schema.
- **FR-041B**: (KF-8, KF-10) Preview-only host errors and host compile failures without Runtime/transport authority MUST NOT enter `run-result` truth input.
- **FR-042**: (NS-5, NS-10) Playground tests MUST cover the interaction evidence matrix for reflected action, raw dispatch, curated Driver, Scenario driver step, Run, Check, Trial and Reset.
- **FR-043**: (NS-10, KF-8) Session dispatch tests MUST assert that only the current operation contributes synthetic runner dispatch logs, even when action history is replayed to reconstruct state.
- **FR-044**: (NS-5, KF-8) Host command tests MUST assert that Check and Trial write Diagnostics output without emitting business action dispatch evidence.

## Non-Functional Requirements

- **NFR-001**: Disabled Playground features MUST have zero runtime hot-path overhead in `packages/logix-core`.
- **NFR-002**: Active session execution MUST use stable project id, snapshot revision, session id and monotonic operation sequence.
- **NFR-003**: Bounded displays MUST avoid unbounded raw payload, raw logs, raw trace or stack trace rendering on the default path.
- **NFR-004**: The default desktop layout MUST remain usable at 1366x768 without overlapping text or hidden primary actions.
- **NFR-005**: The implementation MUST continue to dogfood Logix for Playground control state except external adapter refs and React lifecycle glue.
- **NFR-006**: The implementation MUST not require network access to execute the Logic-first default playground route.
- **NFR-007**: Monaco initialization and type bundle loading failures MUST degrade to a bounded editor fallback with visible status and must not prevent Program execution through existing source text.
- **NFR-008**: Layout tests and browser checks SHOULD use the selectors and scroll ownership names from [ui-contract.md](./ui-contract.md) so visual regressions are comparable across examples and docs hosts.
- **NFR-009**: Test-only runners and fixture simulations MUST be isolated from the production default path and named as fixtures or test support.

## Key Entities

- **PlaygroundProject**: Registry-owned project declaration with files, Program entry, optional preview, optional drivers, optional scenarios and optional service file metadata.
- **PlaygroundSourceLayout**: Standard virtual source tree and author-side project declaration tree for docs-ready Playground projects.
- **ProjectSnapshot**: Current editable source snapshot with project id, revision, files, active entries and digest/context refs.
- **ProgramSession**: Auto-ready runtime window for the current snapshot with stable session id, status, operation sequence, state projection, logs, traces and failure state.
- **ProjectSnapshotRuntimeInvoker**: Playground-owned host invoker that compiles or loads the current `ProjectSnapshot`, invokes existing Runtime faces and returns only `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap`.
- **HostCommandResult**: Output of Run, Check, Trial or Reset, displayed in the appropriate result or diagnostics surface.
- **ActionPanelViewModel**: UI-local projection for action selection, button state and payload editor state. Its authority fields come from the 167 minimum manifest slice or explicit evidence gaps.
- **InteractionDriver**: Docs-friendly curated operation metadata for dispatch/invoke with payload examples and read anchors.
- **ScenarioPlayback**: Product-level multi-step playback declaration and execution session.
- **ServiceSourceFileRole**: Product metadata that groups ordinary source files by service role for navigation and validation.
- **WorkbenchAuthorityBundle**: Adapter output that feeds 165 with truth inputs, context refs, selection hints or evidence gaps.
- **LayoutState**: Playground host view state for panel sizes, active tabs, collapsed areas and selected lanes.
- **EditorHostState**: Monaco loading, active model, language-service readiness and fallback status. It is host state, not runtime truth.

## Edge Cases

- Project has Program entry but action manifest cannot be derived.
- Runtime adapter cannot compile the current snapshot.
- Source edit occurs while dispatch, Run, Check or Trial is in flight.
- Source edit causes compile failure after auto restart.
- Reset happens while a command is in flight.
- Driver payload is invalid JSON or mismatches the declared manifest payload kind.
- Scenario wait/settle times out.
- Check and Trial are unavailable for a project.
- Service source compiles but fails at runtime.
- Bottom drawer is minimized while a new error arrives.
- Preview-capable project exists but preview adapter fails.
- Project still uses old `/src/program.ts` or mixed virtual paths while the route expects `/src/main.program.ts`.
- Monaco type bundle is missing, stale or cannot load.
- Monaco language service sees a different file graph than `ProjectSnapshot.files`.

## Assumptions

- 165 is available as the long-term projection law, even if Playground initially uses a thin adapter while implementation catches up.
- Browser worker transport can continue to live in `@logixjs/sandbox`, but product semantics stay in `packages/logix-playground`.
- The first closure project remains `examples/logix-react`, then docs consume the same package and registry later.
- Monaco is part of the vNext closure for Playground editor surfaces.

## Success Criteria

- **SC-001**: A Logic-first project without `App.tsx` opens at `/playground/:id` and can dispatch at least two reflected actions from manifest authority with visible state/log/trace changes.
- **SC-002**: Source edit automatically restarts the session and removes the stale warning from the normal path.
- **SC-003**: Run, Check and Trial each produce visible, shape-separated output or a clear disabled reason.
- **SC-003A**: Run null value, Run undefined value and Run failure have distinct visible and summary projections.
- **SC-003B**: Payload validator unavailable and reflection action evidence-gap routes are registered as diagnostics demos with owner authority class metadata.
- **SC-004**: Files width, inspector width and bottom drawer height can be resized and verified in browser tests.
- **SC-005**: At default desktop size, state and actions are visible together without scrolling the whole page.
- **SC-006**: Raw dispatch is not visible on the default docs-friendly path.
- **SC-007**: At least one curated Driver demonstrates no-UI business interaction and updates state/result/log/trace.
- **SC-008**: At least one Scenario Playback demonstrates multi-step flow with per-step result and timeout behavior.
- **SC-009**: At least one service source file edit changes subsequent runtime output through the same snapshot revision path.
- **SC-010**: Negative sweep finds no public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`, `Program.capabilities.mocks` or sandbox-owned Playground product API.
- **SC-011**: At least one Logic-first example project uses `/src/main.program.ts` and `/src/logic/*.logic.ts` with no default `App.tsx`.
- **SC-012**: Editing `/src/main.program.ts` and `/src/logic/*.logic.ts` in Monaco provides TypeScript completion and diagnostics for local imports and approved workspace dependencies.
- **SC-013**: Each visual pressure case in [visual-pressure-cases/](./visual-pressure-cases/) has a dogfood fixture or route and passes the required visible-region, scroll-owner and forbidden-overflow assertions at `1366x768`.
- **SC-014**: Default `Run` and action dispatch paths no longer call `runLocalProgramSnapshot`, `createDefaultProgramSessionRunner` or local-counter source parsing in production UI code.
- **SC-015**: One source edit changes subsequent `Runtime.run` output and subsequent `Runtime.openProgram` dispatch state through the same snapshot revision.
- **SC-016**: A stale completion from an old `projectId/revision/sessionId/opSeq` cannot update current state, result, logs, trace or diagnostics.
- **SC-017**: No 166 production type or contract defines a private manifest-like action authority schema.

## Must Cut

- Default `App.tsx` in Logic-first playground projects.
- Normal-path Start session and Close session controls.
- `Program` panel that only displays explanatory text.
- Command buttons that appear active but do not produce visible output.
- Sandpack dependency on the core Logic-first execution path.
- Regex action reflection as primary or terminal authority.
- `runLocalProgramSnapshot` or local-counter source parsing as default Run implementation.
- `createDefaultProgramSessionRunner` as default production session dispatch implementation.
- Playground-owned private action manifest schema that duplicates 167.
- Manifest-like action authority DTO in 166; use `ActionPanelViewModel` over 167 DTO instead.
- UI pressure success standing in for Runtime Proof.
- Visual pressure route data standing in for diagnostics authority.
- Tiny side panel that forces state and actions into unrelated scroll islands.
- Raw dispatch as default user path.
- Driver/Scenario declaration in core/react/sandbox public surface.
- Service mock API in core/react/sandbox public surface.
- Private Playground diagnostic report schema or evidence envelope.
- Unbounded logs/traces/source dumps in default UI.
- Ambiguous bare `/src/program.ts` as the recommended Logic-first example entry.
- Textarea as the default source editor path.
- Network-loaded dependency type packages for the default docs-ready Playground route.
