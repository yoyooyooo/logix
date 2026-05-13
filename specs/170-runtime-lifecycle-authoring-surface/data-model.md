# Data Model: Runtime Lifecycle Authoring Surface

This document describes planning entities for `170`. Names are contract vocabulary unless implementation or SSoT pages later freeze exact type names.

## Readiness Requirement

Represents one Logic-declared gate that must complete before a runtime instance becomes ready.

Attributes:

- `moduleId`: stable module coordinate
- `instanceId`: stable runtime instance coordinate
- `logicUnitId`: optional internal logic unit coordinate when available
- `readinessId`: explicit `id` from `{ id?: string }` or deterministic declaration-order coordinate
- `declarationOrder`: monotonic order within the module instance
- `effect`: Effect value registered during the builder root and executed during startup
- `status`: registered, running, succeeded, failed
- `failureSummary`: serializable summary when failed

Rules:

- Registered only by `$.readyAfter(effect, { id?: string })`.
- Registration is synchronous and declaration-only.
- Execution happens during runtime startup under instance environment.
- The runtime instance becomes ready after the effect succeeds.
- Failure fails instance acquisition.
- No public timeout, retry, optionality, ordering, or fatal-policy field exists in this wave.

## Runtime Instance Lifecycle

Runtime-owned status truth for instance creation, readiness, run, failure, close, and termination.

Attributes:

- `moduleId`
- `instanceId`
- `status`: creating, running-readiness, ready, failed, closing, closed
- `readinessRequirements`: ordered readiness requirement list
- `runFibers`: returned run effect fibers or equivalent runtime handles
- `scope`: runtime scope used for finalizers
- `diagnosticsLevel`

Rules:

- Owns lifecycle status and transition truth.
- Executes readiness requirements before ready.
- Starts returned run effect after readiness succeeds.
- Closes runtime scope and finalizers during instance close.
- Keeps diagnostics optional for correctness.

## Run Effect

The single public long-lived behavior path returned from `Module.logic(...)`.

Attributes:

- `logicUnitId`
- `effect`
- `startCondition`: after readiness succeeds
- `readinessBlocking`: always false
- `failureRoute`: Runtime / Provider / diagnostics

Rules:

- Starts after all readiness requirements succeed.
- Does not block readiness.
- Replaces the public `onStart` use class.
- Unexpected failure is observed by runtime-owned diagnostics.

## Scope Finalizer

Resource release mechanism tied to dynamic acquisition and runtime scope close.

Attributes:

- `owner`: Effect Scope or runtime internal finalizer owner
- `resourceLabel`: optional diagnostic label
- `releaseEffect`
- `closeOrder`: runtime / Effect-defined finalizer ordering
- `failureSummary`: serializable summary when release fails

Rules:

- Used for dynamic run-phase resource cleanup.
- Public Logic authoring does not register destroy hooks.
- Release failure is reported through runtime diagnostics.

## Host Signal

Suspend, resume, reset, hot replace, or dispose boundary owned by Platform / host carrier / dev lifecycle internals.

Attributes:

- `signalKind`: suspend, resume, reset, hot-replace, dispose
- `carrierId`
- `moduleId`
- `instanceId`
- `evidenceRef`: optional host / dev lifecycle evidence reference

Rules:

- Ordinary Logic authoring has no public signal hook.
- React dev lifecycle and hot lifecycle evidence remain host-carrier concerns.
- `158-runtime-hmr-lifecycle` remains the authority for dev lifecycle details.

## Unhandled Runtime Error Observation

Runtime / Provider / diagnostics route for unexpected failures.

Attributes:

- `moduleId`
- `instanceId`
- `phase`: readiness, run, cleanup, platform, assembly, or equivalent
- `causeSummary`
- `diagnosticCode`
- `observer`: Runtime, RuntimeProvider, DebugSink, or test harness

Rules:

- Observation does not register per-logic handlers.
- Provider observation does not decide recovery, retry, suppression, or instance lifetime.
- Diagnostics payloads must be slim and serializable.

## Old Lifecycle Mention Classification

Classification record for old lifecycle or replacement-family vocabulary in active material.

Attributes:

- `term`: matched old name or replacement family
- `path`
- `line`
- `classification`: removed-public, internal-only, negative-only, archived
- `action`: remove, rewrite, keep with classification, or move to archive
- `owner`

Rules:

- Every active hit must have exactly one classification.
- Success-path public authoring examples cannot keep old lifecycle names.
- Internal runtime substrate and diagnostics can keep lifecycle vocabulary when clearly internal.

## Public Surface Drift Candidate

A proposed API, doc, example, skill, or test shape that may reintroduce lifecycle authoring.

Attributes:

- `surface`: public API, docs, examples, skills, tests, diagnostics, or implementation
- `candidateShape`
- `matchedForbiddenFamily`
- `reopenEvidence`
- `decision`: reject, classify, or reopen spec

Rules:

- Default decision is rejection when the shape matches a forbidden public route.
- Reopen requires evidence listed in [spec.md](./spec.md#reopen-bar).
- Replacement namespaces are treated as lifecycle surface drift.

## Performance Evidence

Evidence package for runtime startup, readiness, run scheduling, close, and diagnostics paths.

Attributes:

- `envId`
- `profile`
- `beforeArtifact`
- `afterArtifact`
- `diffArtifact`
- `focusArea`
- `comparable`
- `stabilityWarning`

Rules:

- No performance success claim without comparable before / after evidence.
- Missing suite, timeout, or instability requires rerun or narrower scope.
- Diagnostics-off and diagnostics-enabled readiness failure paths are both covered.

## State Transitions

Readiness path:

```text
builder root
  -> $.readyAfter registration
  -> runtime startup executes ordered requirements
  -> success: instance ready
  -> failure: acquisition fails with diagnostics
```

Run path:

```text
builder returns run effect
  -> readiness succeeds
  -> runtime starts returned run effect
  -> ready status remains non-blocked by long-lived work
```

Cleanup path:

```text
run effect acquires resource
  -> Effect Scope records finalizer
  -> runtime close closes scope
  -> finalizer releases resource and reports release failure if any
```

Drift path:

```text
text sweep hit
  -> classify as removed-public / internal-only / negative-only / archived
  -> remove or rewrite unclassified public success-path hit
```
