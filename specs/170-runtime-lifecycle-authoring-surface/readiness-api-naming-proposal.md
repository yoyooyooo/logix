# Readiness API Naming Proposal

**Feature**: [spec.md](./spec.md)
**Status**: Reviewed naming proposal; current planning spelling selected
**Created**: 2026-04-30

## Purpose

This proposal isolates the naming question for the single public readiness gate method in `170-runtime-lifecycle-authoring-surface`.

The original frozen placeholder was:

```ts
$.requireReady(effect, { id?: string })
```

User feedback: the use case is now understandable as "per module instance once + ready gate", but `requireReady` feels awkward. The naming needs a stable shortlist that is easier for humans and Agents to understand before implementation starts.

## Current Planning Spelling

The current planning spelling is:

```ts
$.readyAfter(effect, { id?: string })
```

Adoption status: selected for current planning writeback on 2026-04-30. This remains changeable by a later naming decision, but all current active spec, plan, contracts, quickstart, tasks, SSoT, standards, and skill guidance should use `$.readyAfter(...)`.

Meaning:

- The call registers a readiness requirement.
- The runtime instance becomes ready after the effect succeeds.
- If the effect fails, instance acquisition fails.
- It is a root builder method and must not grow into `$.ready.*`, `$.beforeReady(...)`, `$.afterReady(...)`, or another lifecycle-like family.

## Fixed Semantics

The naming review must not reopen these semantics:

- Public authoring must not expose `lifecycle` as a noun.
- The method is a root builder method, not a namespace.
- It registers synchronously in the `Module.logic(...)` builder root.
- The registered effect runs later during runtime startup under the instance environment.
- Requirements run in declaration order.
- Failure fails instance acquisition.
- The returned run effect starts only after readiness requirements succeed.
- The returned run effect does not block readiness.
- The option bag is sealed to `{ id?: string }`.
- No public timeout, retry, optionality, ordering, fatal policy, progress UI, or recovery option is added in this wave.
- No replacement family such as `$.startup.*`, `$.ready.*`, `$.resources.*`, or `$.signals.*` may be introduced.

## Naming Goal

The selected name should help both humans and Agents infer:

- this is about instance readiness
- the effect is a required readiness gate
- registration happens at authoring time
- execution happens during startup
- it is per runtime instance, not a global once
- it is not a long-running worker hook
- it is not cleanup
- it is not an error observer
- it is not a namespace

## Candidate Set

### C1: `$.ensureReady(effect, { id?: string })`

Example:

```ts
Module.logic("user", ($) => {
  $.ensureReady(restoreSession, { id: "restore-session" })

  return runUserLogic
})
```

Strengths:

- Communicates that ready must be ensured before public use.
- More natural than `requireReady`.
- Root method shape discourages namespace expansion.
- "ensure" implies failure matters.

Risks:

- Could be read as "make the module ready" rather than "register a prerequisite".
- Could be confused with idempotent repair if docs do not say acquisition fails on failure.

### C2: `$.beforeReady(effect, { id?: string })`

Example:

```ts
Module.logic("user", ($) => {
  $.beforeReady(restoreSession, { id: "restore-session" })

  return runUserLogic
})
```

Strengths:

- Easy to understand on first read.
- Clearly describes timing.
- Good for "ready 前一次性做完" intuition.

Risks:

- Sounds like a lifecycle hook.
- Does not strongly communicate that failure fails acquisition.
- May attract sibling names such as `afterReady`.

### C3: `$.requireReady(effect, { id?: string })`

Example:

```ts
Module.logic("user", ($) => {
  $.requireReady(restoreSession, { id: "restore-session" })

  return runUserLogic
})
```

Strengths:

- Strongly communicates requirement and blocking semantics.
- Matches "readiness requirement" data model.
- Less likely to imply a timing hook.

Risks:

- Awkward English.
- Ambiguous subject: who requires what.
- First-time readers may not infer per-instance once behavior.

### C4: `$.prepare(effect, { id?: string })`

Example:

```ts
Module.logic("user", ($) => {
  $.prepare(restoreSession, { id: "restore-session" })

  return runUserLogic
})
```

Strengths:

- Scenario-friendly and terse.
- Fits "prepare module before use" mental model.

Risks:

- Too broad.
- Does not say ready.
- Could grow into generic setup, initialization, resource, or workflow family.

### C5: `$.readyWhen(effect, { id?: string })`

Example:

```ts
Module.logic("user", ($) => {
  $.readyWhen(restoreSession, { id: "restore-session" })

  return runUserLogic
})
```

Strengths:

- Expresses readiness as condition.
- Suggests ready depends on the effect.

Risks:

- Not idiomatic for an Effect that executes.
- May imply predicate / signal semantics.
- Could confuse with dynamic ready state.

### C6: `$.gateReady(effect, { id?: string })`

Example:

```ts
Module.logic("user", ($) => {
  $.gateReady(restoreSession, { id: "restore-session" })

  return runUserLogic
})
```

Strengths:

- Strong gate semantics.
- Signals blocking behavior.

Risks:

- Mechanistic and less natural as public authoring.
- Verb phrase is uncommon.
- May overfit internal runtime vocabulary.

## Rejection Constraints

Names should be rejected if they:

- introduce or imply a namespace
- revive lifecycle / setup / startup hook mental model
- imply dynamic ready-state control
- imply a cleanup or long-running task route
- hide failure semantics
- are too broad to constrain Agent generation
- require a second concept to explain the first concept

## Preliminary Ranking Before Review

1. `$.ensureReady(effect, { id?: string })`
2. `$.beforeReady(effect, { id?: string })`
3. `$.requireReady(effect, { id?: string })`

Preliminary rationale:

- `ensureReady` appears to best balance readability and blocking semantics.
- `beforeReady` is easier to understand but weaker on failure semantics and more hook-like.
- `requireReady` is precise but awkward.

## Optimality Loop Result

**Status**: Round 1 synthesized and frozen for converge.

Reviewer convergence:

- A1, A2, A3, and A4 all rejected `$.beforeReady(...)` as a top-three candidate.
- A1, A3, and A4 pushed the shortlist toward `readiness` terminology because it matches the SSoT entity "Readiness Requirement".
- A2 pushed compression and warned that the method name should not carry startup timing, per-instance once, and run-effect ordering alone.
- A4 challenged the target function and put failure-blocking semantics above first-read smoothness.

Adopted naming objective:

1. Encode required readiness gate and acquisition failure risk first.
2. Avoid timing-hook grammar and sibling-family gravity.
3. Keep one root method, with no namespace implication.
4. Prefer Agent-stable wording over casual smoothness when they conflict.
5. Leave startup execution, per-instance once, declaration timing, and returned run ordering to the contract and tests.

### User Current Planning Selection

Current planning selection: `$.readyAfter(effect, { id?: string })`.

Status: current planning selection, written back to active planning artifacts.

Why it was selected:

- It directly communicates the scenario: the module instance becomes ready after this effect succeeds.
- It is easier for human authors to infer than the contract-heavy candidates.
- It can remain a single root method and does not require a namespace.

Risks to keep closed in docs, tests, and diagnostics:

- It uses timing grammar and may invite `beforeReady` / `afterReady` style phase thinking if docs are loose.
- It must explicitly mean "ready after successful completion"; failure fails acquisition.
- It must not become a general `ready.*` or lifecycle-like family.

Writeback status:

- Active authority artifacts now use `$.readyAfter(...)` as the current planning spelling.
- First-use wording must keep the acquisition-failure sentence near the method definition.

### Stable Top Three From Review

#### 1. `$.requireReadiness(effect, { id?: string })`

Recommended when the project wants the public name to carry the strongest contract signal.

Why it survives:

- `require` communicates required gate and failure significance.
- `readiness` maps to the SSoT entity and diagnostics vocabulary.
- It avoids hook timing words such as `before`.
- It avoids replacement-family pressure.

Risk:

- Slightly more formal than the most ergonomic option.
- Docs should phrase it as "register a readiness requirement" to avoid reading it as "require that the module is already ready".

#### 2. `$.ensureReady(effect, { id?: string })`

Recommended when the project prioritizes first-read usability while keeping one root method.

Why it survives:

- It is the easiest candidate for humans to understand without glossary lookup.
- It keeps `ready` in the public name.
- It does not imply a namespace or `before/after` hook family.

Risk:

- `ensure` can sound like repair or dynamic ready-state control.
- Docs and diagnostics must state that failure fails instance acquisition.

#### 3. `$.readinessRequirement(effect, { id?: string })`

Recommended when the project prioritizes exact SSoT terminology and diagnostics alignment.

Why it survives:

- It directly names the data model concept.
- It reads as a declaration, which matches the builder-root contract.
- It avoids immediate execution, worker, cleanup, observer, and hook implications.

Risk:

- It is verbose.
- It is less idiomatic as a method call than the verb-based options.

### Close But Not Top Three

- `$.readinessGate(effect, { id?: string })`: strong gate signal, but `gate` is more runtime-ish than public authoring language.
- `$.requireReady(effect, { id?: string })`: strong failure signal and lowest existing-doc change cost, but the English remains awkward and it is less precise than `requireReadiness`.

### Rejected For This Naming Decision

- `$.beforeReady(...)`: rejected because it reads like a lifecycle timing hook and invites `afterReady`.
- `$.prepare(...)`: rejected because it is too broad and can grow into generic setup.
- `$.readyWhen(...)`: rejected because it can imply dynamic predicate or signal semantics.
- `$.gateReady(...)`: rejected because the verb phrase is uncommon and overfits internal gate vocabulary.

## Review Request

Use `$plan-optimality-loop` to challenge this proposal with open scope.

Review goal:

- Produce a stable top-three naming shortlist that the user can choose from.
- Preserve fixed semantics.
- Prefer names that are easy for humans and Agents.
- Reject names that create replacement lifecycle families or second public phase systems.

Reviewers should score candidates on the workflow dominance axes:

- concept-count
- public-surface
- compat-budget
- migration-cost
- proof-strength
- future-headroom

Add naming-specific lenses:

- human first-read comprehension
- Agent generation stability
- failure semantics clarity
- anti-namespace pressure
- fit with current Logix authoring style
