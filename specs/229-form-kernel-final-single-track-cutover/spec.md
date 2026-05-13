# Feature Specification: Final Form/Kernel Single-Track Cutover

**Feature Branch**: `229-form-kernel-final-single-track-cutover`  
**Created**: 2026-05-11  
**Status**: Proposed / Final execution gate  
**Input**: Treat all identified Form, source, companion, final-truth, row/list, selector, verification, performance, docs, spec-governance, toolkit, and internal-kernel cleanup points as the final single-track cutover. No compatibility layer, no deprecation period, no dual path, no stale narrative.

## Current Role

This spec is the final rollup spec for the last Form/kernel cleanup wave. It is not a candidate exploration artifact. It converts all outstanding yellow/red items into mandatory work.

This spec does not re-open the accepted Form API shape. It hardens the single-track shape and removes every residue that would let older narratives or compatibility code survive.

## Authority Inputs

- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/form/05-public-api-families.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/standards/docs-governance.md`
- `docs/standards/final-single-track-cutover.md`
- `docs/standards/final-cutover-performance-evidence.md`
- `specs/155-form-api-shape/spec.md`
- `specs/199-form-source-companion-boundary-second-wave/spec.md`
- `specs/200-docs-examples-public-residue-sweep/spec.md`
- `specs/201-kernel-stability-report-gate/spec.md`
- `specs/223-converge-dirty-reachable-execution-gate/spec.md`
- `specs/224-validate-static-ir-list-incremental-gate/spec.md`
- `specs/225-source-externalstore-ingest-dirty-gate/spec.md`
- `specs/228-fieldkernel-focused-before-after-evidence-gate/spec.md`

If any authority conflicts with this spec, update the authority first, then implement. Do not keep both versions alive.

## Non-Negotiable Cutover Rule

The repository must become single-track.

Forbidden:

- compatibility shims;
- deprecation-period implementations;
- dual-write or shadow paths;
- stale public documentation that still reads as current;
- "watch-only" residue when the code/doc is clearly obsolete;
- helper layers that create second truth, second host read law, second source owner, second final-truth owner, or second evidence/report truth.

Allowed:

- internal execution waves;
- focused specs or tasks as execution mechanics;
- archived trace files only when they are tombstoned and cannot be read as current authority;
- toolkit helpers only when mechanically reducible to canonical primitives and not exported as core/Form public law.

## Final Single-Track Model

```text
Form.make(id, config, define)
  -> FormProgram
  -> Program.make / Runtime.make / Runtime.run/check/trial
  -> FormHandle for effectful mutation/submit commands
  -> useModule + useSelector for host reads
```

Owner lanes:

| Lane | Owner | Surviving route | Must remove / reject |
| --- | --- | --- | --- |
| declaration | Form | `Form.make(id, config, define)` | `Form.from`, wrappers as canonical route, raw field fragments |
| remote fact | source edge + Query resource owner | `field(path).source(...)` | `Form.Source`, `field.options`, `source.refresh`, rule fetch, React sync |
| local soft fact | field-local companion | `field(path).companion(...)` | async companion, remote IO, companion final truth, list/root baseline |
| final truth | rule/root/list/submit/reason | `field.rule`, `root`, `list`, `submit` | source verdict truth, companion errors, second issue tree |
| row/list identity | Form row owner | `fieldArray(...).byRowId`, `Form.Companion.byRowId` | public row token, index truth, React-key truth |
| host read | core React host law | `useModule + useSelector` | `@logixjs/form/react`, `useForm*`, `useCompanion`, `useFieldSource` |
| field-kernel hot path | core internal kernel | dirtyPlan / fallback reason protocol | full-topo default, legacy dirty override, unreasoned fallback |
| verification | runtime control plane | `Runtime.check`, `Runtime.trial`; `compare` only under admitted gate | Form scenario API, second report object, raw-evidence default compare |
| performance | release evidence protocol | comparable default/soak evidence | quick-only success claims, missing suites, unstable artifacts |
| docs/spec governance | SSoT + accepted ADR + tombstone discipline | authority map and trace-only status | stale candidate body as active narrative |
| toolkit/DX | secondary helper layer | mechanical reduction to canonical primitives | hidden source/host/truth owner, compatibility shim |

## Functional Requirements

- **FR-001 Authority Map**: Add and maintain one final authority map that tells agents which files are current authority, trace-only, archived, or deferred.
- **FR-002 Tombstone Sweep**: Every stale Form/source/companion/React-hook/root-helper narrative in docs/specs/proposals/examples must be deleted, moved to archive, or replaced with a trace-only tombstone that points to current authority.
- **FR-003 Public Surface Erasure**: Live package source and package exports must not expose forbidden Form public nouns: `Form.Source`, `Form.Path`, `Form.SchemaPathMapping`, `Form.SchemaErrorMapping`, `Form.Row`, `Form.Fact`, `Form.SoftFact`, `@logixjs/form/react`, `useForm*`, `useCompanion`, `useFieldSource`, `useFormSelector`.
- **FR-004 Source Boundary**: `field(path).source(...)` remains a consumer-attached remote fact edge. Query/resource owns remote behavior. Source must not become options/candidates API or Form-owned refresh API.
- **FR-005 Companion Boundary**: `field(path).companion(...)` must stay synchronous, lightweight, local, and field-scoped. Promise, Effect, fetch, remote IO, final-truth writes, list/root baseline, and writeback side effects must be rejected.
- **FR-006 Final Truth Funnel**: Final verdict, blocking, errors, and reason backlinks must converge through rule/root/list/submit/reason. Source and companion may contribute facts but must not own final truth.
- **FR-007 Row/List Continuity**: Row identity must remain internal and rowId-based. Reorder/swap/move/replace/remove/nested-list operations must not use index truth, stale row writes, or React key identity.
- **FR-008 Host Read Gate**: Form reads in React must use `useModule + useSelector` with descriptors. No Form-owned React hook family may be introduced in code, docs, examples, package exports, or toolkit as canonical law.
- **FR-009 DirtyPlan Single Source**: Converge must use dirtyPlan as the execution authority. Legacy dirty inputs must not override dirtyPlan. Full topo fallback must be reason-coded and visible in evidence.
- **FR-010 Unified Fallback Reason Protocol**: field-kernel, selector, runtime-store, external-store, Form list, and source scheduling fallback must share one reason-code protocol for fallback/cost migration reporting.
- **FR-011 Verification Clarification**: `Runtime.check` and `Runtime.trial` are the current verification route. `Runtime.compare` remains non-default for Form root compare productization until an explicit authority-intake gate admits it.
- **FR-012 Performance Gate**: No release claim may pass while broad/focused performance evidence has unexplained `budgetExceeded`, instability warnings, missing suites, incomparable artifacts, or after-only blockers on core hot paths.
- **FR-013 Toolkit Mechanical Reduction**: Any Form helper under toolkit must include an expansion proof to canonical Form/core primitives and must not carry private state or second owner law.
- **FR-014 Devtools/Live/CLI Evidence Discipline**: Devtools/live/CLI may surface evidence and projections but must not become authoring API, final truth owner, runtime owner, or second report shell.
- **FR-015 Spec Governance**: Future specs must use single folder per spec, status vocabulary, authority input table, file touch matrix, residue tombstone, verification matrix, and stop conditions.
- **FR-016 Implementation Sweep**: Delete or rewrite any compatibility-shaped source code rather than preserving it with comments or no-op aliases.

## Non-Functional Requirements

- **NFR-001 Zero Compatibility Debt**: No old shell, alias, or migration bridge may survive solely for backward compatibility.
- **NFR-002 Agent-Generation Safety**: A medium model reading only search snippets must not generate forbidden routes as current API.
- **NFR-003 Diagnostics-Off Budget**: Production/default diagnostics-off paths must avoid trace payload allocation and second-order fixed costs.
- **NFR-004 Evidence Quality**: Hard claims require real local command evidence. Cloud-prepared patches cannot claim local validation.
- **NFR-005 Performance Comparability**: Perf evidence must include env/profile/matrix identity, before/after artifacts, comparable flag, regressions, budgetExceeded count, stability warnings, timeouts, missing suites, and risk migration notes.

## Mandatory Witness Set

| Witness | Required proof |
| --- | --- |
| country -> province remote candidates | source owns remote data; companion/UI owns local shaping; rule/submit owns legality |
| invite code / username uniqueness | remote fact impacts submit via reason; no rule direct fetch; no React sync |
| row-local sku / quote lookup | source receipt follows row owner across reorder/remove; stale row id retired |
| hard Query trigger | invalidate/refetch/prefetch/pagination/cross-scope reuse uses Query/control route, not Form source public refresh |
| `Form.Rule.custom` fetch rejection | final truth cannot fetch directly |
| React `useEffect` remote-sync rejection | React cannot become remote fact owner |
| companion async rejection | Promise/Effect/fetch rejected |
| final-truth contributor matrix | schema/rule/list/root/sourceImpact/manual merge into one reason/error carrier |
| listScopeCheck focused perf | diagnostics off/light/full measured; incremental route validated |
| no-tearing/render fanout | host selector remains core-owned and bounded |
| compare non-productized wording | docs/tests prevent Form compare default truth |
| docs retrieval pressure | search snippet generation cannot revive old API |

## Acceptance Criteria

- **AC-001**: Root/public export allowlists pass for core/Form/React/Query/toolkit relevant packages.
- **AC-002**: Residue scanner reports zero live-current forbidden narratives. Trace-only files either tombstoned or archived.
- **AC-003**: Owner-collision tests reject source/options, companion/async, companion/final-truth, rule/fetch, React/useEffect-sync, Form-owned hooks, public row token, and scenario authoring API.
- **AC-004**: Required witness tests pass in packages and examples.
- **AC-005**: Kernel fallback reason protocol is shared by dirtyPlan/converge, selector, runtime-store, external-store, Form list, and source scheduling evidence.
- **AC-006**: Focused default/soak performance gates pass for dirtyPattern, converge.txnCommit, form.listScopeCheck, externalStore.ingest.tickNotify, runtimeStore.noTearing.tickNotify, react.strictSuspenseJitter or else final status is blocked.
- **AC-007**: Final report classifies result as `success`, `success_with_limited_evidence`, `migrated_risk`, `migrated_cost`, `blocked`, or `deferred` with supporting artifacts.

## Forbidden Reinterpretations

- Do not introduce compatibility code because applying the cutover is large.
- Do not move old public nouns into a different package and call them toolkit unless they mechanically reduce to canonical primitives and do not hide owner law.
- Do not keep stale documents with only a footer note; the current-status warning must be at the top or the body must be replaced.
- Do not treat quick perf as hard release evidence.
- Do not use packed XML/Repomix snapshots as edit targets.
