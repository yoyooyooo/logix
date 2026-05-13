# Implementation Plan: Reflection Live Binding Model

## Goal

Make reflection live binding the single owner-backed source for live action projection and declared-action dispatch admission.

The implementation should challenge existing fallback paths where they dilute binding authority. The terminal shape is one binding decision path, many carrier projections.

## Technical Context

Primary package surfaces:

- `packages/logix-core/src/internal/reflection/staticLiveBinding.ts`
- `packages/logix-core/src/internal/reflection/programManifest.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`
- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts`
- `packages/logix-react/src/internal/hooks/useModule.ts`

Primary proof surfaces:

- `packages/logix-core/test/internal/LiveBridge/live-static-binding.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`

## Authority Boundaries

Reflection live binding owns static binding facts and dispatch binding headers.

Runtime-live owns target coordinate, operation envelope and later operation ledger.

React host owns lifecycle context only.

Browser adapter, daemon and CLI are carriers only.

Canonical evidence owns export packaging only.

## Phase 1 - Binding Authority Cutover

Promote `checkStaticLiveBinding` from a useful helper to the terminal owner path.

Implementation requirements:

- Define one binding decision DTO that can feed both inspect projection and dispatch admission.
- Keep the outcome taxonomy fixed to `matched`, `missing`, `mismatch`, `stale`, `unknown`.
- Add schema digest comparison and validator availability handling to the decision path.
- Add a manifest-scoped action lookup index or equivalent bounded lookup strategy.
- Make missing binding emit structured reflection gaps instead of silent unknown defaults.
- Keep the helper pure and free of runtime coordinate creation.
- Keep the index derived from owner-approved manifest data and keyed by manifest digest or target binding ref.

Expected landing files:

- `packages/logix-core/src/internal/reflection/staticLiveBinding.ts`
- `packages/logix-core/src/internal/runtime/core/liveTypes.ts`
- `packages/logix-core/src/internal/live-bridge-api.ts`

## Phase 2 - Producer Path Unification

Unify React lifecycle binding and direct runtime binding so both expose the same target coordinate plus reflection manifest binding fact.

Implementation requirements:

- React lifecycle carrier must expose enough manifest binding data to resolve a `LiveManifestBindingRef`.
- Direct runtime binding must use the same resolver shape as React lifecycle binding.
- `resolved.reflectionManifest` in the browser adapter may remain an input, but final action projection must be produced through the owner binding path.
- Target lifecycle cleanup must remove binding entries together with live target entries.
- Binding indexes and projection caches must be cleaned when target binding closes or manifest digest is superseded.
- Browser adapter, daemon and CLI must not retain full manifest or schema payloads as long-lived authority.

Expected landing files:

- `packages/logix-react/src/internal/dev/lifecycleCarrier.ts`
- `packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts`
- `packages/logix-react/src/internal/hooks/useModule.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`

## Phase 3 - Inspect Actions Projection

Make `inspect.actions` a pure projection from binding authority.

Implementation requirements:

- `makeLiveActionsInspectArtifact` must receive a matched binding or explicit binding gap.
- Action rows must derive from the bound manifest action list.
- Payload summary and schema digest must not be created by adapter-local logic.
- Default `manifest:unknown` output must be used only for explicit unknown/degraded output, never for matched proof.
- Action row projection must be generated on demand for explicit inspect requests.
- Large manifests must use bounded output, truncation, artifact refs or degraded markers.
- Canonical dogfood target must return matched binding.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveInspect.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`

## Phase 4 - Dispatch Admission Binding

Make `dispatch.declaredAction` admission consume the same binding decision path as `inspect.actions`.

Implementation requirements:

- Remove terminal reliance on `declaredActions` and `currentManifestDigest` fallback for reflected mutation proof.
- Deny mutation for missing, unknown, stale, mismatched, unknown action, schema mismatch and missing-validator cases.
- Attach the matched binding header to admitted dispatch requests.
- Completed and failed operation facets may cite the header but must not rewrite reflection facts.
- Dispatch admission must allocate only minimal binding header and denial metadata.
- Full payload validation must run only when explicitly required by debug dispatch admission.

Expected landing files:

- `packages/logix-core/src/internal/runtime/core/liveAdmission.ts`
- `packages/logix-core/src/internal/runtime/core/liveOperations.ts`
- `packages/logix-react/src/internal/dev/liveBrowserAdapter.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-static-binding.contract.test.ts`

## Phase 5 - Cost And Memory Proof

Prove the binding owner stays cheap when disabled and bounded when enabled.

Implementation requirements:

- Add focused disabled-allocation tests for live inspect off.
- Add large-manifest tests proving indexed or bounded action lookup.
- Add cleanup tests for binding indexes and projection caches.
- Add carrier memory assertions proving browser adapter, daemon and CLI do not retain full manifests or schema payloads as authority.
- Record the chosen measurement method in tests or notes so future regressions can be compared.

Expected landing files:

- `packages/logix-core/test/internal/LiveBridge/live-static-binding.perf.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-binding-cleanup.guard.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`

## Phase 6 - Evidence Export Proof

Prove that canonical evidence and carriers package binding facts without owning them.

Implementation requirements:

- Binding refs must be serializable and stable.
- Structured gaps must preserve owner `reflection`, code, target and reopen bar.
- CLI and daemon tests must verify transport of owner-derived binding projection.
- No verification verdict fields may appear in live inspect output.

Expected landing files:

- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`
- any existing canonical evidence packaging tests touched by 172 live inspect output

## Phase 7 - Documentation Writeback

Update only the facts whose owner changes during implementation.

Required writebacks:

- Keep SSoT 18 as owner law unless implementation exposes a missing proof obligation.
- Keep 173 as umbrella; mark 174 implementation tasks complete there when implementation closes.
- Keep 167 static-live binding law aligned if the binding DTO changes.
- Do not expand 172 beyond handoff and route closure.

## Verification Matrix

## Cost Measurement Method

174 cost proof uses focused deterministic counters rather than wall-clock thresholds:

- `StaticLiveBindingIndexDiagnostics.actionLookupCount` and `linearScanCount` prove repeated large-manifest lookup goes through a manifest-scoped index.
- `projectionRowAllocationCount` proves action rows are allocated only by explicit `inspect.actions` projection, not by index construction or disabled paths.
- `LiveBindingRegistryDiagnostics.targetBindingCount`, `manifestIndexCount`, `projectionCacheCount` and `disposedIndexCount` prove target unbind and manifest supersession cleanup.
- React carrier snapshot assertions prove carriers expose binding refs without retaining full manifest action/schema projection as long-lived transport truth.

Wall-clock performance remains out of scope for this guard because the 174 risk is repeated linear lookup, disabled-path allocation and lifecycle retention.

Required focused checks:

```text
rtk pnpm --filter @logixjs/core test -- --run packages/logix-core/test/internal/LiveBridge/live-static-binding.contract.test.ts packages/logix-core/test/internal/LiveBridge/live-operation-admission.guard.test.ts packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts
rtk pnpm --filter @logixjs/core test -- --run packages/logix-core/test/internal/LiveBridge/live-static-binding.perf.guard.test.ts packages/logix-core/test/internal/LiveBridge/live-binding-cleanup.guard.test.ts
rtk pnpm --filter @logixjs/react test -- --run packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts
rtk pnpm --filter @logixjs/cli test -- --run packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts
rtk pnpm typecheck
```

Required text checks:

```text
rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/174-reflection-live-binding-model packages/logix-core/src packages/logix-react/src packages/logix-cli/src
rtk rg -n "[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*Runtime" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/174-reflection-live-binding-model
rtk rg -n "missing-live-manifest-binding|LiveManifestBindingRef|checkStaticLiveBinding" specs/174-reflection-live-binding-model packages/logix-core/src packages/logix-react/src packages/logix-core/test packages/logix-react/test packages/logix-cli/test
```

## Exit Gates

174 exits only when:

- canonical target `inspect.actions` returns matched binding
- dispatch admission uses the same binding fact as inspect actions
- missing binding is target-scoped and transient
- adapter and CLI tests prove they do not invent payload schema authority
- binding checks are pure and disabled overhead is bounded
- disabled live inspect does not allocate action projections or binding collectors
- large-manifest action lookup is indexed or otherwise bounded
- binding indexes and projection caches are lifecycle-cleaned
- carrier memory remains lease-bound
- SSoT 18, 167 and 173 remain aligned
- forbidden public surface and second-truth sweeps pass

## Reopen Rules

Reopen the plan if:

- the owner binding path cannot support both inspect projection and dispatch admission
- dispatch denial requires IO inside transaction windows
- direct runtime binding and React lifecycle binding need incompatible target coordinates
- canonical evidence requires a new owner law rather than packaging owner facts
