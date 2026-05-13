# Cloud LLM Patch / Goal-Driven Local Agent Handoff Standard

**Status:** generic process standard candidate
**Version:** 3.0
**Scope:** project-agnostic cloud-LLM → local-agent implementation handoff
**Primary consumers:** cloud LLM, local implementation agent, reviewer / maintainer
**Compatibility note:** this is a generalized replacement for `fermi_cloud_llm_patch_handoff_standard`; project-specific terms must live in an appendix or in the delivery bundle, not in the base standard.

---

## 0. Purpose

This standard defines how a cloud LLM packages implementation work for a local agent, and how the local agent receives, applies, validates, completes, and reports that work.

The base standard is project-agnostic. It applies to any repository where a cloud LLM cannot reliably run the full local toolchain, but can crystallize direction, scope, guardrails, patches, plans, fixtures, and verification instructions.

The central rule is goal-driven delivery:

```text
user intent / authority / accepted state
  -> cloud LLM freezes a goal contract and delivery bundle
  -> local agent executes that contract in the real repo
  -> local agent validates with real tools
  -> local agent reports evidence, deviations, blockers, and next anchor
```

A patch diff is never enough. Every delivery must include local-agent-facing handoff instructions that make the goal, boundaries, validation path, stop conditions, and report format explicit.

---

## 1. Core decision

Every cloud-LLM delivery that expects local execution must include a local handoff document.

Default file name:

```text
LOCAL_AGENT_HANDOFF.md
```

If the delivery is constrained to a single document, the `README.md` must contain a standalone section:

```text
## Local Agent Handoff
```

The local handoff must tell the agent:

```text
- what goal this delivery must accomplish
- what it must not accomplish
- what authority documents or accepted states control the work
- what files or subsystems are in scope
- what files or subsystems are out of scope
- how to apply or copy the delivery
- what verification commands to run
- what evidence counts as success
- what evidence only counts as a clue
- what local completion work is allowed
- what reinterpretation is forbidden
- when to stop and report
- how to report results back
```

If these instructions are missing, the delivery is incomplete.

---

## 2. Vocabulary

```text
Delivery bundle
  Any artifact handed from cloud LLM to local agent: patch package, spec bundle,
  implementation plan, fixture bundle, migration bundle, performance bundle, or mixed bundle.

Goal contract
  The explicit objective, non-goals, semantic boundaries, evidence gates, and stop conditions
  for this delivery.

Authority
  The documents, accepted decisions, code contracts, tests, schemas, or prior validated state
  that control the current work.

Local completion work
  Minimal work the local agent may do to make the delivery apply and validate without changing
  the goal.

Forbidden reinterpretation
  Any scope expansion, semantic rewrite, proof weakening, or product direction change not
  authorized by the delivery.

Evidence gate
  The exact commands, artifacts, and interpretation rules required before a claim can be made.

Risk migration
  A situation where one measured problem improves but cost, risk, or complexity moves to another
  phase, subsystem, security boundary, data authority, allocation path, operational path, or UX path.
```

---

## 3. Delivery modes

The cloud LLM must classify the bundle before writing handoff instructions.

Allowed modes:

```text
- docs-only
- direction-freezing
- patch
- source skeleton
- requirements/spec
- implementation plan
- fixture / replay / capture
- API / DTO / contract
- migration / DB / storage
- runtime / adapter / integration
- smoke / command
- performance / hot path
- security / permission / compliance
- mixed
```

For `mixed`, the handoff must list each sub-mode and define execution order. Do not allow a mixed bundle to become one broad undifferentiated implementation stream.

---

## 4. Minimum package structure

Recommended structure:

```text
<delivery>/
  README.md
  LOCAL_AGENT_HANDOFF.md
  PATCH_MANIFEST.md              # when one or more patches exist
  VERIFY.md                      # when validation is non-trivial
  EVIDENCE_PROTOCOL.md           # when claims depend on evidence interpretation
  RISK_LEDGER.md                 # when risk or cost migration matters
  <patch-name>.patch             # when applicable
  SHA256SUMS                     # when packaged as archive / zip
  optional-files/
```

Minimum for a patch package:

```text
<delivery>/
  README.md
  LOCAL_AGENT_HANDOFF.md
  <patch-name>.patch
  SHA256SUMS
```

Minimum for a docs-only or prompt-only handoff:

```text
<delivery>/
  README.md or LOCAL_AGENT_HANDOFF.md
```

Packed repository snapshots, merged-source XML, generated context dumps, and repomix outputs are read-only context unless the handoff explicitly says otherwise. Local edits must happen in the real repository files, not in packed snapshots.

---

## 5. README.md requirements

`README.md` is for the user and maintainer. It should be short.

It must answer:

```text
- What is this delivery?
- What does it change or prepare?
- Where should it be applied?
- Which file should the local agent read first?
- What is intentionally out of scope?
- What did the cloud LLM not verify?
```

Template:

```markdown
# <Delivery Name>

## Purpose

## Contents

## Where to Apply

## First File for Local Agent

Read `LOCAL_AGENT_HANDOFF.md` before applying or implementing this delivery.

## Apply Summary

## Validation Summary

## Non-goals

## Known Cloud LLM Limitations
```

Do not put long execution detail in the user-facing README when `LOCAL_AGENT_HANDOFF.md` exists.

---

## 6. LOCAL_AGENT_HANDOFF.md required template

````markdown
# Local Agent Handoff — <Delivery Name>

## 1. Objective

One paragraph describing the exact goal. This must be specific enough that the agent can tell whether an attempted change is in scope.

## 2. Delivery Mode

One or more of:

- docs-only
- direction-freezing
- patch
- source skeleton
- requirements/spec
- implementation plan
- fixture / replay / capture
- API / DTO / contract
- migration / DB / storage
- runtime / adapter / integration
- smoke / command
- performance / hot path
- security / permission / compliance
- mixed

## 3. Goal Contract

```text
Goal:
- What this delivery must accomplish:
- User / product / engineering value:
- Required semantic invariants:
- Required public-surface behavior:
- Required data / storage / authority behavior:
- Required security / permission / compliance behavior:
- Required performance / resource behavior:
- Required evidence:

Non-goals:
- What this delivery must not change:
- What must remain deferred:
- What must not be reinterpreted:

Stop conditions:
- Conditions that require stopping and reporting instead of continuing:
```

## 4. Authority and Anchor

```text
Expected repo state:
Base branch or commit if known:
Prior accepted delivery if relevant:
Current project stage:
Authority docs / contracts / tests:
Known unresolved decisions:
Known deferred seams:
```

If authority is ambiguous, the local agent must stop before implementation or produce a minimal clarification report.

## 5. Scope

This delivery may change:

| Path / subsystem | Allowed change | Why |
|---|---|---|
| ... | ... | ... |

## 6. Non-goals

This delivery must not change:

| Path / subsystem | Forbidden change | Why |
|---|---|---|
| ... | ... | ... |

## 7. Files Changed or Expected

| Path | Status | Purpose |
|---|---|---|
| ... | create / modify / inspect-only / generated | ... |

## 8. Execution Order

```text
1. Record preflight state.
2. Read authority files.
3. Inspect bundle / patch / spec before editing.
4. Run apply check or structure validation.
5. Apply or copy the delivery.
6. Write failing test / sentinel when applicable.
7. Implement minimal change.
8. Run focused verification.
9. Run broader verification only if required.
10. Update handoff notes / report.
11. Classify evidence and claims.
```

## 9. Apply Procedure

```bash
git status --short
git rev-parse HEAD
# If patch package:
git apply --check <patch-name>.patch
git apply <patch-name>.patch
```

Use project-specific scripts when provided:

```bash
./scripts/inspect_patch_context.sh /path/to/repo
./scripts/apply_patch.sh /path/to/repo
./scripts/verify_patch.sh /path/to/repo
```

## 10. Validation Procedure

List exact commands and expected results.

```bash
<focused command>
# Expected: <pass/fail-before-implementation/pass-after-implementation>

<typecheck or package check if scoped>
# Expected: <pass>

<broad verification if required>
# Expected: <pass>
```

## 11. Evidence Interpretation

```text
Hard success claim requires:
- ...

Local diagnostic only:
- ...

Invalid / insufficient evidence:
- ...
```

If this is performance-sensitive, include:

```text
- before artifact:
- after artifact:
- diff artifact:
- envId:
- profile:
- matrixId / matrixHash if applicable:
- comparable:
- regressions:
- stability warnings:
- timeouts:
- missing suites:
- phase deltas:
```

## 12. Risk / Cost Migration Watch

The local agent must check whether the delivery moves cost or risk elsewhere.

```text
Potential migration points:
- correctness:
- performance / latency:
- allocations / memory:
- scheduling / concurrency:
- data authority / persistence:
- security / permissions:
- diagnostics / observability:
- operational complexity:
- user-facing behavior:
```

Classify final result as one of:

```text
success
success_with_limited_evidence
provisional
migrated_risk
migrated_cost
blocked
deferred
```

## 13. Allowed Local Completion Work

The local agent may:

- fix patch context mismatch without changing intent;
- run formatting;
- fix compile errors directly caused by the delivery;
- add minimal glue explicitly required by the delivery;
- update generated artifacts if the repo convention requires it;
- add focused tests or sentinels required by the handoff;
- document limitations honestly.

## 14. Forbidden Reinterpretation

The local agent must not:

- expand scope;
- convert future seams into current implementation;
- weaken tests, smoke checks, or evidence gates to pass;
- bypass public API, service, storage, permission, idempotency, scheduling, or transaction boundaries;
- replace authoritative facts with UI, cache, in-memory, log-only, or mock-only state;
- create a second truth source unless the delivery explicitly requires it;
- introduce compatibility shims or dual paths unless explicitly in scope;
- use performance-only code paths that change production semantics;
- edit packed source snapshots instead of real source files;
- discard unrelated worktree changes.

## 15. Stop Conditions

Stop and report if:

- patch requires semantic rewrite to apply;
- required authority conflicts with this delivery;
- implementation requires public API expansion not authorized by the handoff;
- implementation requires bypassing an authoritative service, storage, permission, transaction, scheduler, or validation boundary;
- verification requires out-of-scope features;
- evidence is incomparable but a success claim is requested;
- total performance improves but another measured phase, allocation path, or risk surface regresses without explanation;
- diagnostics/off, security/off, or disabled feature paths become non-structural no-ops;
- idempotency, replay, or dedupe creates duplicate facts;
- local changes require broad unrelated rewrites;
- unrelated worktree changes would need to be overwritten.

## 16. Expected Result

The delivery is locally accepted only when:

- apply / copy succeeds;
- required commands pass or failures are explicitly expected and documented;
- expected files exist;
- evidence artifacts are produced where required;
- risk / cost migration is checked;
- no stop condition was bypassed;
- final claims are limited to what evidence supports.

## 17. Cloud LLM Validation Limitations

State exactly what the cloud LLM could not run.

Examples:

- Did not run full test suite.
- Did not run typecheck.
- Did not run database migrations.
- Did not run browser tests.
- Did not run production build.
- Did not run benchmark / perf diff.
- Did not execute external provider / real runtime.

## 18. Report Template

```text
delivery_name:
delivery_mode:
repo_head_before:
repo_head_after:
dirty_worktree_before:
dirty_worktree_after:
apply_result:
commands_run:
passed_checks:
failed_checks:
expected_failures:
local_fixes:
files_changed_after_apply:
evidence_artifacts:
risk_or_cost_migration:
stop_conditions_hit:
scope_deviations:
unresolved_questions:
allowed_claims:
forbidden_claims:
recommended_next_anchor:
```
````

---

## 7. Cloud LLM responsibilities

The cloud LLM must:

```text
- read current user intent and known authority;
- classify the delivery mode;
- freeze the goal contract before producing patch/detail;
- separate current scope from future seams;
- generate README.md when packaging;
- generate LOCAL_AGENT_HANDOFF.md or equivalent local section;
- generate patch / skeleton / spec / fixture artifacts when requested;
- write exact apply and validation instructions;
- write stop conditions;
- write evidence interpretation rules;
- state what it could not verify;
- avoid fake proof;
- avoid claiming local validation it did not run.
```

The cloud LLM must not:

```text
- assume the local agent remembers chat context;
- leave boundary decisions implicit;
- treat patch diff as sufficient handoff;
- claim full implementation success without local evidence;
- convert project-specific assumptions into generic standard text;
- hide uncertainty behind confident language.
```

---

## 8. Local agent responsibilities

The local agent must:

```text
- read LOCAL_AGENT_HANDOFF.md first;
- record repo head and worktree state;
- preserve unrelated worktree changes;
- apply or implement only the scoped work;
- run the requested focused validation;
- add missing sentinels or tests only when allowed;
- classify evidence honestly;
- report blockers instead of broadening scope;
- use the report template.
```

The local agent does not own architecture reinterpretation. If the delivery conflicts with the real repository, the agent must report the conflict and make only the smallest safe correction.

---

## 9. Worktree safety

Before any change:

```bash
git status --short
git rev-parse HEAD
```

Record:

```text
repoHead:
dirtyWorktree:
existingUnrelatedChanges:
agentStartTime:
```

Forbidden by default:

```text
git reset
git clean
git checkout -- <path>
git restore <path>
git stash
git rebase
git cherry-pick
git push
```

Read-only git commands are allowed:

```text
git status
git diff
git log
git show
git rev-parse
```

---

## 10. Evidence hierarchy

Use this hierarchy when the delivery affects correctness, performance, security, data authority, or user-visible behavior.

```text
Layer 1: structural sentinel / invariant proof
Layer 2: focused local test or smoke
Layer 3: same-commit A/B or controlled internal comparison, if relevant
Layer 4: before/after comparable evidence
Layer 5: broad / soak / CI / production-like validation
```

Interpretation rules:

```text
- A passing broad test does not override a failed critical structural sentinel.
- Same-commit A/B is useful for local localization, not enough for release claims.
- Quick / smoke profile is a clue, not a hard performance claim.
- Hard performance claims require comparable before/after evidence under the required profile.
- Security claims require negative-path evidence and permission / denial proof.
- Data authority claims require durable fact source proof, not UI/cache/log-only proof.
```

---

## 11. Generic risk / cost migration gate

A delivery cannot be called successful merely because the headline metric improved.

Classify as `migrated_cost` or `migrated_risk` when improvement in one place moves cost or risk to another place.

Examples:

```text
- latency improves but allocations increase materially;
- hot-path time improves but queue / scheduler / commit / publish phase regresses;
- backend work reduces but frontend cache becomes a second truth source;
- test passes only because assertions were weakened;
- a fake adapter passes by bypassing the real application service boundary;
- retry improves success rate but idempotency risk appears;
- security checks move from authoritative backend path to UI-only path;
- observability improves but disabled path now allocates or serializes;
- a new helper reduces authoring boilerplate but creates a second public mental model.
```

Required report block:

```text
Risk / Cost Migration:
- improved area:
- regressed or shifted area:
- evidence:
- classification:
- can release with this risk:
- required follow-up:
```

---

## 12. Performance / hot-path addendum

Use this section only when the delivery touches performance-sensitive paths.

The handoff must define:

```text
- primary cost points;
- phases to measure;
- structural sentinels;
- allocation sentinels;
- before/after or A/B protocol;
- quick vs hard-claim interpretation;
- migration gate;
- allowed and forbidden performance claims.
```

Hard performance success claim requires, unless the project defines stricter rules:

```text
profile = default / release / soak, not quick-only
same environment or valid normalized environment
comparable = true
regressions = 0 or explicitly accepted by authority
no unexplained stability warning
no timeout
no missing required suite
structural sentinels pass
allocation / resource sentinels pass when relevant
no unexplained migrated_cost / migrated_risk
```

Forbidden without full proof:

```text
performance is fixed
no regressions exist
production performance improved globally
release-safe on performance grounds
```

---

## 13. Security / permission / data-authority addendum

Use this section when the delivery touches authentication, authorization, data persistence, event publication, tenancy, external providers, secrets, or user data.

The handoff must identify:

```text
- authoritative fact source;
- permission owner;
- idempotency / dedupe key;
- replay behavior;
- redaction behavior;
- denial behavior;
- audit / evidence path;
- storage migration path if applicable;
- external side-effect boundary.
```

Forbidden unless explicitly scoped:

```text
- UI-only proof of business facts;
- cache-only persistence;
- log-only audit as authority;
- bypassing application service or permission checks;
- writing durable facts directly from adapter/provider callback;
- accepting raw provider events as application facts without normalization;
- running replay that triggers external side effects;
- storing secrets or raw sensitive payloads in fixtures without redaction policy.
```

---

## 14. Patch content checklist

Before delivery, the cloud LLM must check:

```text
[ ] Delivery mode is stated.
[ ] Goal contract exists.
[ ] Authority / anchor exists.
[ ] Scope exists.
[ ] Non-goals exist.
[ ] Files changed or expected files are listed.
[ ] Apply / copy procedure exists.
[ ] Validation commands exist.
[ ] Evidence interpretation exists.
[ ] Cloud LLM validation limitations are stated.
[ ] Allowed local completion work is stated.
[ ] Forbidden reinterpretation is stated.
[ ] Stop conditions exist.
[ ] Report template exists.
[ ] User-facing README stays concise.
[ ] Project-specific assumptions are isolated to project appendix or bundle-specific handoff.
[ ] No fake proof.
[ ] No future seam is silently promoted to current implementation.
```

For patch packages:

```text
[ ] Patch is unified diff.
[ ] Patch order is defined if multiple patches exist.
[ ] git apply --check instruction is present.
[ ] Conflict handling is defined.
```

For fixture / replay packages:

```text
[ ] Raw captures are clearly labeled.
[ ] Synthetic examples are clearly labeled.
[ ] Manifest records source, timestamp, runtime/profile, and redaction status.
[ ] Replay does not trigger external side effects.
```

For migration / storage packages:

```text
[ ] Migration order is defined.
[ ] Rollback or recovery expectation is stated.
[ ] Fact source and projection relationship is explicit.
[ ] Idempotency / dedupe expectation is documented.
```

For performance packages:

```text
[ ] Baseline and after protocol are defined.
[ ] Environment/profile requirements are defined.
[ ] Structural sentinels are defined.
[ ] Migration gate is defined.
[ ] Claim language is constrained.
```

---

## 15. Copy-paste local agent prompt

```text
You are the local implementation agent.

You must execute the attached delivery under the Cloud LLM Patch / Goal-Driven Local Agent Handoff Standard v3.

Your objective is not to make broad improvements. Your objective is to complete the specified delivery while preserving the stated public surface, runtime semantics, data authority, security boundaries, scheduling / transaction / concurrency rules, diagnostics or observability behavior, and evidence comparability requirements.

First classify the delivery mode:

- docs-only
- direction-freezing
- patch
- source skeleton
- requirements/spec
- implementation plan
- fixture / replay / capture
- API / DTO / contract
- migration / DB / storage
- runtime / adapter / integration
- smoke / command
- performance / hot path
- security / permission / compliance
- mixed

Then perform preflight:

1. Run `git status --short`.
2. Run `git rev-parse HEAD`.
3. Record existing unrelated changes.
4. Read `README.md` and `LOCAL_AGENT_HANDOFF.md` if present.
5. Read `PATCH_MANIFEST.md`, `VERIFY.md`, `EVIDENCE_PROTOCOL.md`, and `RISK_LEDGER.md` if present.
6. Do not edit packed source snapshots or generated context dumps unless the handoff explicitly says they are editable.

For patch work:

- Inspect patches before applying.
- Run `git apply --check` unless a project script supersedes it.
- Apply patches in manifest order.
- Resolve conflicts minimally.
- Do not rewrite unrelated files.

For spec or plan work:

- Treat each spec / requirement folder as an independent unit unless sequencing says otherwise.
- Read `spec.md`, `plan.md`, `tasks.md`, and `handoff.md` when present.
- Work in the prescribed order.
- Do not merge independent requirements into one broad implementation stream.
- If a detailed implementation plan is missing and implementation would drift, stop or create the minimum plan required by the handoff.

For performance or hot-path work:

- Build or update the cost/risk ledger before optimizing.
- Track phase-level changes, not just total time.
- Add or preserve structural and allocation sentinels where required.
- Treat total improvement plus phase/resource regression as `migrated_cost` unless explained and accepted.
- Use quick/smoke evidence only as a clue.
- Do not make hard performance claims without comparable required-profile evidence and passing sentinels.

For security, permission, storage, or external-provider work:

- Identify the authoritative fact source.
- Preserve permission and idempotency gates.
- Do not replace durable facts with UI/cache/log-only state.
- Do not let replay trigger external side effects.
- Keep redaction and audit expectations explicit.

Never do these unless the active handoff explicitly requires them:

- expand public API or public exports
- broaden scope
- add compatibility or dual-run paths
- bypass service, storage, permission, validation, transaction, scheduler, or queue boundaries
- weaken tests or smoke expectations to pass
- create benchmark-only behavior that changes production semantics
- edit packed source snapshots instead of real source files
- use destructive git commands
- overwrite unrelated worktree changes

After each unit, update the report with:

- what changed
- files changed
- commands run
- evidence collected
- risks checked
- migrated_cost / migrated_risk status
- stop conditions hit
- allowed claims
- forbidden claims

Stop and report if continuing would require unauthorized public API changes, semantic rewrites, boundary bypasses, incomparable evidence, weakened proof, or broad unrelated rewrites.
```

---

## 16. Allowed and forbidden conclusion language

Allowed:

```text
Implemented the specified structural changes.
Focused tests pass.
Local evidence indicates improvement in the targeted phase.
No migrated_cost / migrated_risk was detected in the collected focused evidence.
Formal performance or release success is deferred until required comparable evidence is available.
Cloud LLM could not run local validation; local agent report is required for final acceptance.
```

Forbidden unless fully proven:

```text
Implementation is complete globally.
No regressions exist.
Production performance improved globally.
Security is fully solved.
This is release-safe.
All edge cases are covered.
```

---

## 17. Project appendix rule

Project-specific content must be added as an appendix or delivery-specific handoff, not embedded in the generic base standard.

Appendix examples:

```text
Appendix A — Project-specific authority map
Appendix B — Project-specific smoke commands
Appendix C — Project-specific performance matrix
Appendix D — Project-specific storage / event rules
Appendix E — Project-specific local agent prompt additions
```

This keeps the standard portable across unrelated projects while still allowing a project to enforce stricter local rules.
