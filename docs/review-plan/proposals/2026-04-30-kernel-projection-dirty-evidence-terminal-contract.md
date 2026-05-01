# Kernel Projection Dirty Evidence Terminal Contract Proposal

- date: 2026-04-30
- slug: kernel-projection-dirty-evidence-terminal-contract
- status: adopted-candidate

## Executive Summary

Playground is only the visible witness. The kernel issue is that ordinary React application code can still enter broad host reads, dynamic selector fallback, coarse dirty evidence, or module-topic subscription without a single core-owned failure surface.

The adopted candidate is:

`T2: Selector-Input Precision Law + Core Projection Quality Route`

Terminal rule:

- public React app reads use one gate: `useSelector(handle, selector, equalityFn?)`.
- public no-arg `useSelector(handle)` leaves the terminal public host contract.
- generated code uses sealed selector inputs, such as `fieldValue(path)` and domain-owned selector primitives.
- core selector law compiles every host read into an internal precision record and route decision.
- React host consumes the core route decision. It does not own a second strict gate.
- dirty paths and read paths must normalize through the same internal path-id authority.
- broad reads, dynamic fallback, missing path authority, dirty-all fallback, evaluate-all fallback, and selector identity collision are strict precision failures in dev/test.
- active SSoT must be cut over before implementation so no current authority still teaches no-arg host reads.

This proposal does not add a public `ReadQuery` noun, a second React hook family, a new selector namespace, or a Playground-specific API.

## Problem

The failure class is broader than Playground render fanout.

Any business app can reproduce it when a component:

- reads the whole module state from React.
- uses a selector function that falls into dynamic lane.
- selects a broad object in a parent and passes slices down.
- writes a nested field while the transaction marks a coarse root or dirty-all.
- relies on component splitting while the runtime subscription route remains broad.

The existing substrate is close:

- `ReadQuery.compile` already produces selector read metadata, selector id, equality kind, lane, producer, and strict-gate diagnostics.
- `SelectorGraph` already filters selector evaluation by dirty-path overlap when path ids are available.
- `StateTransaction` already records low-cost dirty path ids and dirty-all reasons.
- `RuntimeStore` already separates module topics and read-query topics.
- React host already chooses read-topic external stores for static selector inputs.

The missing terminal contract is a core-owned precision law that every host consumes.

## Evidence

- `packages/logix-react/src/internal/hooks/useSelector.ts`
  - currently exposes a public no-arg whole-state overload.
  - currently compiles selector functions only when a selector is passed.
  - currently falls back to module-topic external store when selector evidence is missing or dynamic.
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
  - currently classifies static and dynamic selector lanes.
  - currently strict-gates only dynamic lane, not broad-root, broad-state, unknown, or debug reads.
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - currently keys entries by `selectorId`.
  - currently evaluates all subscribed selectors when dirty evidence or path authority cannot support overlap filtering.
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - currently uses selector id in read topic identity.
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - currently carries dirty-all reason and dirty path ids.
  - currently needs clearer source marking for inferred dirty evidence.
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - currently lists `useSelector(handle)` as a public read rule.
- `docs/proposals/read-query-selector-law-internalization-contract.md`
  - already closes `ReadQuery` as a public noun.
  - leaves this proposal to close broad reads, selector precision, and host route enforcement.

## Terminal Claim

Logix must make selector precision a kernel contract.

Terminal success means:

- application authors and Agents get one public read gate with selector input.
- whole-state public host read is gone from terminal API shape.
- dynamic and broad host reads are rejected by default in dev/test.
- dirty-side precision loss is rejected by default in dev/test.
- React host cannot bypass core selector precision policy by falling back to a module topic.
- dirty/read overlap has one internal path-id authority.
- diagnostics can explain precision loss without exposing internal nouns as public authoring concepts.

## Adopted Candidate

### T2: Selector-Input Precision Law + Core Projection Quality Route

T2 combines the reviewer alternatives:

- hard projection gate minimalism.
- core-gated host route.
- diagnostic-only evidence public quarantine.
- projection fingerprint topic identity.
- control-plane layering.

T2 replaces the initial T1 candidate.

## Terminal Contract

### 1. Public Host Read Gate Is Single-Argument-Free

Terminal public React read surface:

```tsx
useSelector(handle, selector, equalityFn?)
```

Terminal public React read surface does not include:

```tsx
useSelector(handle)
```

Whole-state snapshot reads move to repo-internal Devtools, debug, or test harness routes. They do not occupy public host authoring.

Rules:

- docs, examples, LLM packages, and canonical tests must not teach no-arg host reads.
- no-arg host reads, if still present during implementation, must compile to internal broad-state precision and fail outside explicit internal debug/test markers.
- no compatibility overload is preserved for public authoring.

### 2. Selector Input Is The Public Concept

Public authoring language is:

- selector input.
- broad read.
- dynamic selector fallback.

Public authoring language must not make these internal nouns part of the main recipe:

- `ReadQuery`.
- projection evidence.
- dirty evidence.
- read topic.
- selector graph.
- registry.
- runtime topic key.

Current sealed selector inputs remain:

- `fieldValue(path)`.
- `rawFormMeta()`.
- `Form.Error.field(path)`.
- `Form.Companion.field(path)`.
- `Form.Companion.byRowId(listPath, rowId, fieldPath)`.
- expert selector functions only when core compile returns exact precision.

Generated L0/L1 React code must use descriptors first. Function selectors are tolerated expert inputs only after core precision admission. Function-source parsing is an optimization layer, not the generated recipe.

This proposal does not admit `select.value(path)` or any other new public selector helper. If `fieldValue(path)` fails future naming or type-safety review, that must reopen `runtime/10` as a separate public selector-input proposal.

### 3. Core Owns Selector Precision

Every host-visible read, including temporary whole-state reads, must pass through core selector precision classification.

The internal precision record must support these semantic fields:

- diagnostic label.
- selector fingerprint.
- selector id label.
- normalized read ids.
- equality kind.
- precision quality.
- route decision.
- fallback reason when degraded.

The exact internal structure is not public API.

Required precision qualities:

- `exact`.
- `broad-root`.
- `broad-state`.
- `dynamic`.
- `debug`.
- `unknown`.

Broad classification must use path kind, schema, and internal path authority when available. It must not rely only on dot-path depth.

Core route decision is the first implementation boundary. React host must not keep a parallel `selectorTopicEligible` style decision after the route API exists.

Route decisions:

- `read-topic`: allowed only for exact static precision.
- `reject`: default dev/test route for dynamic, broad, unknown, or unsafe debug precision.
- `module-topic`: internal resilience route only when explicitly enabled and diagnostic-visible.

React host may provide policy context, but core selector law owns classification and route selection.

The route API must be internal and exact enough to carry:

- precision quality.
- route decision.
- selector fingerprint.
- path-authority digest or epoch.
- debug/resilience marker status.
- structured failure reason.

### 4. React Host Consumes The Core Route

React host must invoke core selector precision for every host read.

Rules:

- static exact selector input subscribes to read topic.
- rejected selector input throws or records the configured strict failure.
- dynamic fallback cannot silently use the module topic.
- broad-state and broad-root cannot silently use the module topic.
- explicit internal debug/test broad reads must carry a marker that core can classify as `debug`.
- debug/resilience markers must be generated by internal runtime capability, DI, or repo-internal harness code only.

React host responsibilities:

- call the core classifier.
- subscribe according to the returned route.
- emit host trace metadata after commit.
- never redefine broad/dynamic policy locally.
- never expose debug/resilience markers through public types, root exports, README examples, or generated recipes.

### 5. Selector Fingerprint Is Topic Identity

`selectorId` must not be the only read-topic identity.

Terminal identity:

- `selectorFingerprint = digest(static shape + reads + equality kind + operator/projection shape + path-authority digest or epoch)`.
- read-topic key uses selector fingerprint.
- selector id remains a diagnostic label.

Rules:

- same selector id with different fingerprint fails in dev/test.
- `SelectorGraph.ensureEntry` must not reuse an entry only because selector id matches.
- manual selector ids are allowed only as labels unless their fingerprint matches.
- if path authority changes, existing fingerprints must stop matching.

### 6. Dirty And Read Paths Share One Internal Path-Id Authority

Read paths and dirty paths must normalize to the same internal path-id authority.

Ownership split:

- selector law owns read precision.
- `StateTransaction` owns dirty precision and dirty quality.
- `SelectorGraph` owns overlap routing.
- diagnostics consume precision failures from all three.

Rules:

- dirty-all requires a structured reason.
- inferred dirty evidence must carry source marking.
- coarse root dirty evidence is a precision downgrade.
- dirty-all, unmapped write paths, missing path authority, and unsafe coarse root dirty evidence reject under default dev/test policy.
- inferred dirty evidence is allowed only when source-marked and precision is sufficient for overlap routing.
- evaluate-all fallback must record why overlap routing failed and reject under default dev/test policy unless explicitly marked as internal debug/resilience.

Do not freeze the implementation word `registry` into public or terminal authoring language.

### 7. Dirty-Side And Evaluate-All Fallbacks Are Strict Failures

SelectorGraph fallback must be both diagnosable and gateable.

Required fallback kinds:

- `dirtyAll`.
- `missingPathAuthority`.
- `missingDirtyPath`.
- `noReads`.
- `selectorWithoutExactPrecision`.
- `unsafeCoarseDirtyRoot`.

Default dev/test policy rejects these fallback kinds when they affect a host projection path. Internal debug/resilience routes must carry explicit markers and still emit structured diagnostics.

The base events may stay `trace:selector:eval` and `trace:react-selector`. If they cannot express the fallback, add one slim aggregate diagnostic. Events must stay serializable and tied to stable `moduleId / instanceId / txnSeq`.

### 8. Control Plane Is Layered

`Runtime.check` must not pretend to observe React commits.

Rules:

- `Runtime.check` may report build/static selector-quality artifacts only when those artifacts exist.
- `Runtime.trial(mode="startup")` may verify selector policy wiring and static startup artifacts.
- host render isolation and component commit fanout belong to explicit host harnesses, `trial.scenario`, or repo-internal evidence artifacts.
- control-plane reports must give structured repair hints for precision failures.

Report classes:

- dynamic selector fallback.
- broad host read.
- dirty-all fallback.
- missing path authority.
- unsafe coarse dirty root.
- selector fingerprint collision or static shape mismatch.
- evaluate-all fallback.

### 9. Region Ownership Is Guidance, Not Kernel Law

The kernel law is selector precision plus dirty/read overlap.

React guidance derives from it:

- the component that renders a value owns that value's selector.
- parent layers pass handles, stable callbacks, and stable identities.
- parent layers do not pass fast-changing state projections.
- multiple independent values use multiple local selectors.
- semantic business derivations should live in `Module.logic(...).fields(...computed...)`.

Playground, tabs, file trees, command bars, and dashboards are product witnesses, not kernel vocabulary.

### 10. No Compatibility Budget

Terminal cutover is direct:

- remove public no-arg host read from SSoT, docs, examples, generated recipes, and public type tests.
- update every active SSoT that currently freezes no-arg host reads before implementation begins.
- keep any temporary internal witness behind explicit cleanup conditions.
- do not introduce compatibility wrappers.
- do not add a second hook family.
- do not expose `ReadQuery`.
- do not admit a new public selector namespace in this proposal.

## API Surface Decision

Frozen by T2:

- terminal public read gate: `useSelector(handle, selector, equalityFn?)`.
- no terminal public `useSelector(handle)`.
- current sealed selector inputs stay.
- function selectors are expert tolerated inputs only when core admits exact precision.
- no public `ReadQuery`.
- no new public `select.*` helper.
- no public object/struct projection descriptor.

Default generated shape:

```tsx
const value = useSelector(handle, fieldValue("path.to.value"))
const error = useSelector(form, Form.Error.field("warehouseId"))
const companion = useSelector(form, Form.Companion.field("warehouseId"))
```

Multi-value UI should use multiple local selectors, or move semantic derivation into module computed state.

## Rejected Alternatives

### UI-Only Component Splitting

Rejected because subscription route can still be broad.

### Public `ReadQuery`

Rejected because `ReadQuery` has already been internalized.

### Function Selectors As Generated Recipe

Rejected because Agent output can easily produce dynamic, broad, object-returning, or unstable selectors.

### New `select.value(path)` Namespace

Rejected in this proposal because it reopens selector helper naming and public surface. Reopen only through `runtime/10`.

### Public Object/Struct Projection Descriptor

Rejected for this contract. Multiple local selectors and module computed state are the smaller rule.

### React-Owned Strict Gate

Rejected because broad/dynamic classification must have one core owner.

## Proof Obligations

### Kernel Proofs

- every host read has a core precision classification.
- dynamic, broad-root, broad-state, unknown, and unsafe debug precision reject under default dev/test policy.
- selector fingerprint prevents mismatched static shapes from sharing a topic or graph entry.
- selector fingerprint includes path-authority digest or epoch.
- read and dirty paths normalize to one internal path-id authority.
- dirty-all, missing path authority, unmapped write path, unsafe coarse dirty root, and evaluate-all fallback reject under default dev/test policy when they affect host projections.
- inferred dirty evidence is source-marked and admitted only when overlap routing remains precise.

### React Host Proofs

- `useSelector(handle)` is absent from terminal public overload tests.
- static exact descriptor reads subscribe to read topics by fingerprint.
- dynamic selector fallback cannot silently subscribe to module topic.
- broad-state and broad-root cannot silently subscribe to module topic.
- host traces expose selector label, fingerprint, precision quality, route, and optional host subscription id.
- React host has no independent selector-topic eligibility decision after core route API exists.

### Authoring And Agent Proofs

- canonical examples use descriptor-first selector inputs.
- LLM guidance does not teach function selectors as L0/L1 defaults.
- docs and snippets do not teach no-arg host reads.
- lint or type tests reject no-arg host reads in public examples.
- text sweep classifies remaining function selectors as expert, internal, negative, or test-only.

### Business Witnesses

At least these non-Playground fixtures must pass:

- CRUD form row editing with Form error and companion reads.
- master-detail imported child reads.
- dashboard-style independent cards.

Each witness must prove:

- broad read rejected.
- dynamic fallback rejected.
- exact selector input updates only affected subscribers.
- dirty precision loss rejects under dev/test unless explicitly marked as internal debug/resilience.

Playground render isolation remains one product witness only.

### Control-Plane Proofs

- `Runtime.check` reports only static selector-quality artifacts it can actually see.
- host projection precision appears through explicit host harness, `trial.scenario`, or repo-internal evidence artifact.
- repair hints are structured.

### Performance Proofs

Because T2 changes host projection and likely selector identity or routing, implementation requires a reproducible matrix:

- selector count scale.
- dirty path count scale.
- nested path depth.
- selector fingerprint overhead.
- dynamic/broad rejection overhead.
- diagnostics off.
- dev/test diagnostics on.

## Expected Writeback Targets

Authority and guidance:

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`
- `docs/ssot/capability/03-frozen-api-shape.md`
- `docs/standards/logix-api-next-guardrails.md`
- `packages/logix-react/README.md`
- `skills/logix-best-practices/references/agent-first-api-generation.md`
- `skills/logix-best-practices/references/logix-react-notes.md`
- `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`
- previous Playground fanout proposal supersession note

Runtime and host:

- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`
- `packages/logix-react/src/internal/hooks/useSelector.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

Tests:

- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- `packages/logix-core/test/Runtime/Runtime.readQueryStrictGate.test.ts`
- `packages/logix-react/test/Hooks/useSelector.*`
- `packages/logix-react/test/Contracts/*`
- `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- `packages/logix-core/test-dts/canonical-authoring.surface.ts`
- Playground render isolation contract tests
- non-Playground business UI projection contract tests

## Implementation Boundary Addendum

Implementation must start with the internal route boundary:

1. core precision record and route decision.
2. selector fingerprint topic identity with path-authority digest or epoch.
3. React host consumes the core route and removes parallel route eligibility logic.
4. dirty-side fallback strict gate.
5. public no-arg overload deletion and type-level witnesses.
6. SSoT, README, generated recipe, and example sweep.

The implementation must not start by refactoring Playground components or by deleting examples before the core route boundary exists.

Debug/resilience markers are internal-only. They must not appear in public type exports, root exports, README snippets, cookbook examples, or Agent generation material.

## Final Reader Path Check

Public docs and examples use:

- selector input.
- broad read.
- dynamic selector fallback.
- `useSelector(handle, selector, equalityFn?)`.
- `fieldValue(path)`.
- domain selector primitive.

Public docs and examples do not use these as authoring concepts:

- `ReadQuery`.
- projection evidence.
- dirty evidence.
- read topic.
- selector graph.
- registry.
- runtime topic key.
- Playground workbench terms.

## Current One-Line Conclusion

Logix should remove public whole-state host reads, make selector precision a core-owned route decision, and force React, docs, examples, tests, and Agent recipes through exact selector inputs by default.

## Implementation Follow-Through

Status on 2026-04-30:

- Public no-arg React host read has been removed from the `useSelector` public type surface and is guarded by a `test-dts` negative witness.
- Core selector route files now own precision classification, route decision, fingerprint identity, path authority, dirty fallback classification, and slim selector-quality artifact serialization.
- React host consumes the core route and uses selector fingerprint for read-query topic identity; local selector topic eligibility logic has been removed.
- Verification control plane reports selector-quality evidence by layer: static artifact ref in `Runtime.check`, startup artifact ref in `Runtime.trial`, host-harness evidence only through explicit debug trace or harness evidence.
- Non-Playground business witnesses cover form row editing, master-detail imported child reads, and dashboard independent cards.
- Comparable selector-route performance evidence remains open under `specs/169-kernel-selector-route/perf/`.
