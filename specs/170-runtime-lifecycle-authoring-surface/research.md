# Research: Runtime Lifecycle Authoring Surface

## Decision 1: Public Authoring Removes Lifecycle As A Noun

**Decision**: The public Logic authoring surface removes `lifecycle` as an authoring noun. Lifecycle remains valid only for internal runtime substrate, diagnostics / evidence, archived history, and negative examples.

**Rationale**: The old public family groups readiness, run scheduling, cleanup, error observation, and host signals under one noun even though those concerns have different owners. Removing the noun gives Agents one smaller generation target and gives reviewers one rejection rule.

**Alternatives considered**:

- Keep `$.lifecycle.*`: rejected because it preserves a broad public family with mixed owners.
- Keep only `$.lifecycle.onInitRequired`: rejected because the lifecycle namespace invites sibling hooks to return.
- Rename the family to a new phase namespace: rejected because it keeps the same expansion pressure under another name.

## Decision 2: Readiness Uses A Root Builder Method

**Decision**: The only public readiness declaration API is `$.readyAfter(effect, { id?: string })`.

**Rationale**: Readiness is the only ordinary Logic contribution that must remain visible. `readyAfter` gives the human-facing scenario directly: the runtime instance becomes ready after the effect succeeds. A root builder method avoids a namespace that can grow into timeout, optionality, ordering, or start-hook APIs. The surrounding contract supplies the required failure rule: if the effect fails, acquisition fails.

**Alternatives considered**:

- `$.startup.require(...)`: rejected because `startup` creates a namespace and can grow into `startup.onStart` or `startup.timeout`.
- `$.ready.require(...)`: rejected because it implies a dynamic ready-state family.
- `$.beforeReady(...)` / `$.afterReady(...)`: rejected because they invite timing-hook siblings and revive phase-family grammar.
- `$.resources.onDispose(...)`: rejected because cleanup is already owned by Effect Scope.
- `$.signals.*`: rejected because host signals are owned by Platform / host carrier.

## Decision 3: Readiness Options Stay Sealed

**Decision**: The option bag is sealed to `{ id?: string }`.

**Rationale**: The first public contract should preserve one stable coordinate for diagnostics without adding policy knobs. Timeout, fatal policy, retry, optionality, ordering, and progress UI would each add public behavior that belongs in runtime policy or a later evidence-backed spec.

**Alternatives considered**:

- Add `timeout`: rejected in this wave because it changes runtime policy surface.
- Add `optional`: rejected because it weakens the meaning of required readiness.
- Add `fatalOnFailure`: rejected because failure already fails instance acquisition.
- Add explicit `order`: rejected because declaration order is sufficient and simpler.

## Decision 4: Registration Is Synchronous, Execution Is Runtime Startup

**Decision**: `$.readyAfter` registers synchronously during the Logic builder root. The effect executes later during runtime startup under the instance environment.

**Rationale**: This keeps declaration pure and predictable while allowing readiness work to use Effect services when the runtime instance exists. It also keeps Env reads out of the builder root.

**Alternatives considered**:

- Execute readiness effects during builder evaluation: rejected because builder root must remain declaration-only.
- Return a separate setup object: rejected because it adds a second public phase object.
- Allow late readiness registration in returned run effect: rejected because it creates hidden readiness mutation after startup begins.

## Decision 5: Returned Run Effect Owns Long-Lived Behavior

**Decision**: The returned run effect starts after readiness requirements succeed and does not block readiness.

**Rationale**: Long-lived work needs one public run path. A separate `onStart` hook duplicates the returned run effect and makes Agent generation less stable.

**Alternatives considered**:

- Keep public `onStart`: rejected because it creates two equivalent long-lived behavior entries.
- Run returned effect before readiness: rejected because it creates ordering ambiguity and can observe partially initialized instances.
- Make run effect block readiness: rejected because readiness gates already own blocking startup work.

## Decision 6: Dynamic Cleanup Uses Scope

**Decision**: Dynamic resources acquired during run release through Effect Scope / finalizers or runtime-owned internal finalizers.

**Rationale**: Cleanup belongs to the acquisition owner. Scope-based cleanup keeps release tied to the resource and avoids global public destroy registration.

**Alternatives considered**:

- Public `$.lifecycle.onDestroy`: rejected because it duplicates Scope and preserves lifecycle authoring.
- Public `$.resources.onDispose`: rejected because it creates a replacement family.
- Manual cleanup registry in Logic: rejected because it weakens ownership and finalizer ordering.

## Decision 7: Provider Error Handling Is Observation-Only

**Decision**: `RuntimeProvider.onError` is an observation sink for runtime diagnostics. It does not register per-logic handlers and does not decide recovery, retry, suppression, or instance lifetime.

**Rationale**: Unhandled failures need a runtime-level diagnostic route. Per-logic global observers would duplicate runtime policy and make failure handling harder to reason about.

**Alternatives considered**:

- Public `$.lifecycle.onError`: rejected as a per-logic global observer.
- Public `$.errors.onUnhandled`: rejected in this wave because it creates a new family and duplicates Runtime / Provider observation.
- Provider as recovery controller: rejected because recovery policy belongs to runtime or host-specific specs.

## Decision 8: Host Signals Stay With Host Owners

**Decision**: Suspend, resume, reset, and hot update are owned by Platform / host carrier / dev lifecycle internals, with `158-runtime-hmr-lifecycle` retaining dev lifecycle authority.

**Rationale**: Host signals are not ordinary Logic readiness. They depend on host environment, hot replacement, and platform carrier contracts.

**Alternatives considered**:

- Public `$.lifecycle.onSuspend` / `onResume` / `onReset`: rejected because ordinary Logic would own host-specific signals.
- Public `$.signals.*`: rejected because it creates a replacement signal family.
- Fold HMR into `$.readyAfter`: rejected because readiness and hot lifecycle have different timing and evidence.

## Decision 9: Old Mentions Need Explicit Classification

**Decision**: Every non-archived hit of old lifecycle names must be classified as `removed-public`, `internal-only`, `negative-only`, or `archived`.

**Rationale**: Text drift is the most likely way the old surface returns. A small classification rule lets reviewers reject drift without reopening the whole design.

**Alternatives considered**:

- Only update docs and leave tests / skills for later: rejected because Agents learn from skills and examples.
- Search only public docs: rejected because active tests can become positive examples.
- Delete every lifecycle word: rejected because internal substrate and diagnostics still need the vocabulary.

## Decision 10: Performance Evidence Is Required

**Decision**: Implementation must record before / after evidence for instance creation, readiness execution, run scheduling, close / finalizer execution, and diagnostics paths.

**Rationale**: Runtime startup and close paths are core paths. Removing public facade should not add hidden allocation, ordering, or diagnostic overhead.

**Alternatives considered**:

- Rely on focused functional tests only: rejected because NFR-001 requires a measurable baseline.
- Treat this as docs-only: rejected because implementation will touch runtime authoring and startup behavior.
- Measure only React Provider: rejected because the core readiness and close paths are the primary affected runtime paths.
