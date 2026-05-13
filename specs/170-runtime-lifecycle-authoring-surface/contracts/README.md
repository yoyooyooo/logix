# Contracts: Runtime Lifecycle Authoring Surface

This directory defines observable authoring and runtime contracts for `170`. It intentionally does not define REST or GraphQL endpoints.

## C1 Public Readiness API

Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-011, FR-015.

Contract:

- Public Logic authoring exposes exactly one readiness declaration method: `$.readyAfter(effect, { id?: string })`.
- `$.readyAfter` is a root builder method.
- `$.readyAfter` is declaration-only and registers synchronously.
- The effect executes later during runtime startup under the instance environment.
- The runtime instance is ready after the effect succeeds.
- Failed readiness fails instance acquisition.
- The option bag is sealed to `{ id?: string }`.
- Public authoring has no `$.lifecycle`, `$.startup`, `$.ready`, `$.resources`, or `$.signals` namespace and no `$.beforeReady(...)` / `$.afterReady(...)` sibling methods.

Proof:

- Type-surface witness accepts `$.readyAfter(effect, { id?: string })`.
- Type-surface or public contract witness rejects old and replacement families.
- Canonical docs and Agent guidance use only `$.readyAfter` for readiness.

## C2 Readiness Execution And Failure

Requirements: FR-003, FR-004, FR-005, FR-006, NFR-002, NFR-003.

Contract:

- Readiness requirements execute in declaration order.
- Runtime instance ready status is reached only after all requirements succeed.
- Failed readiness fails instance acquisition.
- Readiness diagnostics include stable module id, instance id, readiness id or deterministic declaration coordinate, phase, and serializable failure summary.
- Diagnostics-off mode does not require lifecycle evidence for correctness.

Proof:

- Runtime tests cover ordered readiness execution.
- Runtime tests cover acquisition failure.
- Diagnostic serialization tests cover stable readiness coordinates.

## C3 Returned Run Effect

Requirements: FR-007, NFR-005.

Contract:

- Long-lived behavior uses the returned run effect from `Module.logic(...)`.
- Returned run effect starts after readiness succeeds.
- Returned run effect does not block ready status.
- Unexpected run failure routes through Runtime / Provider / diagnostics.

Proof:

- Runtime tests prove run starts after readiness.
- Runtime tests prove ready status is not held by a long-lived run effect.
- Error observation tests prove no public lifecycle error hook is needed.

## C4 Dynamic Cleanup

Requirements: FR-008, FR-014.

Contract:

- Dynamic run-phase resource cleanup uses Effect Scope / finalizers.
- Internal runtime finalizers may remain runtime-owned.
- Public Logic authoring does not expose destroy registration.

Proof:

- Scope cleanup test proves `Effect.acquireRelease` finalizer runs on runtime close.
- Public surface witness rejects public destroy hook use.
- Internal substrate tests are classified as internal-only.

## C5 Error Observation

Requirements: FR-009, FR-006, NFR-002.

Contract:

- Runtime owns unhandled logic error observation.
- `RuntimeProvider.onError` consumes runtime diagnostics as an observation sink.
- Provider observation does not register per-logic handlers.
- Provider observation does not decide recovery, retry, suppression, or instance lifetime.

Proof:

- React Provider tests cover observation for assembly, readiness, run, and close failures where applicable.
- Runtime diagnostics tests prove payloads are slim and serializable.
- Text sweep proves diagnostics no longer tell authors to add public lifecycle handlers as the default solution.

## C6 Host Signal Ownership

Requirements: FR-010, FR-014.

Contract:

- Suspend, resume, reset, hot update, and dispose are owned by Platform / host carrier / dev lifecycle internals.
- Ordinary Logic authoring has no public signal hooks.
- `158-runtime-hmr-lifecycle` remains the dev lifecycle authority.

Proof:

- React dev lifecycle tests keep host carrier ownership.
- Platform signal tests are rewritten or classified so ordinary Logic examples do not use public signal hooks.
- SSoT pages route host signal ownership outside public Logic authoring.

## C7 Forbidden Public Routes

Requirements: FR-001, FR-011, FR-012, FR-015, NFR-004, NFR-006.

Contract:

- The following public routes are forbidden in success-path authoring:
  - `$.lifecycle.*`
  - `$.startup.*`
  - `$.ready.*`
  - `$.resources.*`
  - `$.signals.*`
  - `{ setup, run }`, `lifecycle`, `processes`, or `workflows` as public phase objects replacing readiness / run effect
- Old terms may remain only as `removed-public`, `internal-only`, `negative-only`, or `archived`.

Proof:

- Text sweep covers `docs`, `specs`, `packages`, `examples`, and skills.
- Every remaining active hit is classified.
- Public examples and skills have zero success-path occurrences of lifecycle as authoring noun.

## C8 Performance And Diagnostics

Requirements: NFR-001, NFR-002, NFR-003, SC-003, SC-005.

Contract:

- Runtime instance creation, readiness gate execution, run scheduling, runtime close, and diagnostics paths have before / after evidence.
- Diagnostics payloads stay slim, serializable, and stable.
- Diagnostics disabled path avoids lifecycle evidence dependency.

Proof:

- Perf artifacts are stored under `specs/170-runtime-lifecycle-authoring-surface/perf/`.
- Comparable diff is produced before claiming performance success.
- Diagnostic tests pass with diagnostics enabled and disabled.

## C9 Result Writeback

Requirements: FR-012, FR-013, SC-001, SC-002, SC-004, SC-006.

Contract:

- SSoT, standards, specs, skills, examples, and public tests share one terminal story:
  - lifecycle truth belongs to runtime instance
  - Logic only contributes readiness through `$.readyAfter`
  - long-lived behavior returns run effect
  - cleanup uses Scope
  - errors route through Runtime / Provider / diagnostics
  - host signals route through Platform / host carrier

Proof:

- Authority pages listed in [plan.md](../plan.md#result-writeback) are updated after implementation.
- `011` and `136` supersession notes remain aligned.
- `spec.md` status reaches Done only after all success criteria and writebacks pass.
