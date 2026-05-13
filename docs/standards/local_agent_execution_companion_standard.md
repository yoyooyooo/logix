# Local Agent Execution Companion Standard

**Status:** generic process standard candidate
**Version:** 1.0
**Scope:** project-agnostic local-agent execution discipline for cloud-LLM handoffs
**Primary consumers:** local implementation agent, reviewer / maintainer
**Companion to:** `Cloud LLM Patch / Goal-Driven Local Agent Handoff Standard v3`

---

## 0. Purpose

This document defines how a local implementation agent should receive, execute, validate, and report work that was prepared by a cloud LLM.

The cloud-facing standard controls how delivery bundles are produced. This document controls how they are consumed.

The local agent's role is not to reinterpret architecture or broaden scope. The local agent's role is to execute the specified delivery in the real repository, using the real toolchain, while preserving repository safety, semantic boundaries, evidence comparability, and project authority.

```text
cloud LLM freezes goal + handoff
  -> local agent records repo state
  -> local agent executes scoped work only
  -> local agent validates with real tools
  -> local agent reports evidence, blockers, deviations, and next anchor
```

---

## 1. Relationship to Other Documents

### 1.1 Cloud LLM handoff standard

The cloud LLM handoff standard is the producer-side document. It tells the cloud LLM what to generate:

- delivery mode
- goal contract
- README
- `LOCAL_AGENT_HANDOFF.md`
- patch / spec / fixture / migration / plan artifacts
- validation commands
- evidence rules
- stop conditions
- report template

### 1.2 This document

This document is the local-agent execution standard. It tells the local agent how to behave across all deliveries:

- how to start safely
- how to read authority
- how to apply or implement scoped work
- how to protect unrelated worktree changes
- how to classify evidence
- when to stop
- how to report

### 1.3 Per-delivery `LOCAL_AGENT_HANDOFF.md`

`LOCAL_AGENT_HANDOFF.md` is the delivery-specific contract. It is more specific than this document.

The local agent must read it first for each delivery.

If this document and `LOCAL_AGENT_HANDOFF.md` disagree, use this precedence:

```text
project authority / code / tests / accepted decisions
  > delivery-specific LOCAL_AGENT_HANDOFF.md
  > this local-agent companion standard
  > generic cloud handoff standard
  > chat memory or assumptions
```

### 1.4 README

The README is for the user or maintainer. It should be concise. It should not replace `LOCAL_AGENT_HANDOFF.md` unless the delivery is intentionally a single-file handoff.

---

## 2. Non-Negotiable Local Agent Rules

The local agent must:

```text
- read LOCAL_AGENT_HANDOFF.md before changing files;
- record repo HEAD and worktree state before changing files;
- preserve unrelated worktree changes;
- execute only the scoped work;
- use real repository files, not packed source snapshots, unless explicitly directed;
- run requested validation or record why it could not run;
- classify evidence honestly;
- stop instead of broadening scope;
- report using the required template.
```

The local agent must not:

```text
- reinterpret the architecture;
- expand public API or public exports unless explicitly scoped;
- weaken tests, smoke checks, sentinels, or evidence gates to pass;
- bypass service, storage, permission, validation, transaction, scheduler, queue, or idempotency boundaries;
- replace durable facts with UI, cache, in-memory, log-only, mock-only, or fixture-only state;
- create a second truth source unless explicitly scoped;
- edit generated context dumps or repomix / packed source snapshots instead of real source files;
- use destructive git commands;
- overwrite unrelated worktree changes;
- claim success beyond the collected evidence.
```

---

## 3. Intake Checklist

Before changing anything, the local agent must identify:

```text
delivery_name:
delivery_mode:
repo_path:
first_file_to_read:
authority_files:
patch_or_artifact_files:
expected_files:
apply_or_copy_commands:
validation_commands:
evidence_required:
allowed_local_completion_work:
forbidden_reinterpretation:
stop_conditions:
report_template:
```

If any of these are missing and the delivery cannot be executed safely, stop and report `blocked_missing_handoff`.

---

## 4. Worktree Safety

### 4.1 Required preflight commands

Run from the repository root:

```bash
git status --short
git rev-parse HEAD
```

Record:

```text
repo_head_before:
dirty_worktree_before:
existing_unrelated_changes:
agent_start_time:
```

### 4.2 Allowed read-only git commands

```text
git status
git diff
git log
git show
git rev-parse
git branch --show-current
```

### 4.3 Forbidden git commands by default

Do not run these unless the delivery handoff explicitly authorizes them and explains why:

```text
git reset
git clean
git checkout -- <path>
git restore <path>
git stash
git rebase
git merge
git cherry-pick
git push
```

### 4.4 Unrelated changes

If unrelated changes already exist:

- do not discard them;
- do not hide them;
- do not mix them into the delivery report as if they were local-agent changes;
- avoid editing the same files unless the handoff explicitly requires it;
- if collision is unavoidable, stop and report `blocked_unrelated_worktree_collision`.

---

## 5. Authority Reading Order

Read only the files needed to execute the delivery, but do not skip authority.

Default order:

```text
1. LOCAL_AGENT_HANDOFF.md
2. README.md
3. PATCH_MANIFEST.md, if present
4. VERIFY.md, if present
5. EVIDENCE_PROTOCOL.md, if present
6. RISK_LEDGER.md, if present
7. delivery-specific specs / contracts / migration notes
8. project SSoT / ADR / standards referenced by the handoff
9. relevant tests / fixtures / source entry points
```

If an authority file conflicts with the delivery, stop unless the handoff already explains the conflict and authorizes a resolution.

---

## 6. Delivery Mode Classification

The local agent must classify the delivery before execution.

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

For `mixed`, list the sub-modes and execute them in the handoff order. Do not collapse mixed work into one broad implementation stream.

---

## 7. Execution Protocol by Mode

### 7.1 Patch

Required steps:

```bash
git status --short
git rev-parse HEAD
git apply --check <patch-name>.patch
git apply <patch-name>.patch
```

If multiple patches exist:

- read `PATCH_MANIFEST.md`;
- apply in manifest order;
- run `git apply --check` for each patch unless a project script supersedes it.

Allowed local completion:

- fix context mismatch without changing intent;
- run formatting;
- fix compile errors directly caused by the patch;
- add minimal glue explicitly required by the patch;
- update generated artifacts only if the repository convention requires it.

Stop if applying the patch requires semantic rewrite.

### 7.2 Requirements / Spec

Required steps:

- treat each spec folder as an independent requirement unit unless sequencing says otherwise;
- read `spec.md`, `plan.md`, `tasks.md`, and `handoff.md` when present;
- preserve requirement IDs and acceptance criteria;
- do not merge independent requirements into one broad implementation stream;
- do not invent implementation details that are not required to remove ambiguity.

Stop if implementation would drift because the spec or plan is under-specified.

### 7.3 Implementation Plan

Required steps:

- follow task order;
- mark progress explicitly if the plan uses checkboxes;
- keep edits scoped to the listed files unless the plan permits discovery-based expansion;
- run the command attached to each task when feasible;
- record deviations.

Stop if a task requires changing a non-goal or widening public surface.

### 7.4 Fixture / Replay / Capture

Required steps:

- label raw captures, synthetic fixtures, and normalized examples distinctly;
- record source, timestamp, runtime/profile, redaction status, and capture command where required;
- ensure replay does not trigger external side effects;
- do not treat raw provider events as application facts unless normalization is explicitly scoped.

Stop if replay requires external side effects or unredacted sensitive data without policy.

### 7.5 Migration / DB / Storage

Required steps:

- identify authoritative fact source;
- identify migration order;
- identify rollback or recovery expectation;
- preserve idempotency and dedupe gates;
- keep projection rebuildability explicit;
- run migration smoke only when environment exists, otherwise report missing environment.

Stop if the adapter/provider callback must directly write durable facts to pass.

### 7.6 Runtime / Adapter / Integration

Required steps:

- preserve service and boundary ownership;
- keep fake, replay, and real runtime lanes distinct;
- do not let fake adapters bypass real application service boundaries;
- keep external provider payloads normalized before becoming application facts.

Stop if implementation requires bypassing service, scheduler, transaction, permission, or validation boundaries.

### 7.7 Performance / Hot Path

Required steps:

- identify primary cost points and phases;
- preserve structural sentinels;
- preserve allocation/resource sentinels when required;
- collect comparable evidence only under the required profile;
- treat quick/smoke evidence as diagnostic unless the handoff says otherwise;
- run risk / cost migration check.

Hard performance success requires:

```text
comparable evidence
required profile
no unexplained stability warnings
no timeout
no missing required suite
structural sentinels pass
allocation / resource sentinels pass when relevant
no unexplained migrated_cost or migrated_risk
```

Stop if a headline metric improves while another measured phase or risk surface regresses without explanation.

### 7.8 Security / Permission / Compliance

Required steps:

- identify permission owner;
- identify denial behavior;
- identify audit/evidence path;
- preserve redaction behavior;
- prove negative paths when required;
- do not move security checks to UI-only or cache-only paths.

Stop if security or permission proof becomes UI-only, log-only, or mock-only.

### 7.9 Docs-Only / Direction-Freezing

Required steps:

- edit only documentation unless explicitly scoped otherwise;
- keep project-specific assumptions isolated to appendix or delivery-specific handoff;
- do not claim implementation or validation that was not run;
- ensure docs do not contradict project authority.

Stop if docs require changing implementation contracts that are not in scope.

---

## 8. Validation Protocol

### 8.1 Execute exact commands

Run commands exactly as specified when feasible.

Record:

```text
command:
cwd:
exit_code:
result:
notable_output:
artifact_path:
```

### 8.2 When a command cannot run

Report the reason precisely:

```text
not_run_reason:
- missing dependency
- missing environment variable
- missing database / service
- command not found
- incompatible platform
- handoff command invalid
- timeout
- other
```

Do not replace required validation with unrelated checks unless the handoff permits substitution.

### 8.3 Evidence hierarchy

Use this hierarchy:

```text
Layer 1: structural sentinel / invariant proof
Layer 2: focused local test or smoke
Layer 3: same-commit A/B or controlled internal comparison
Layer 4: before/after comparable evidence
Layer 5: broad / soak / CI / production-like validation
```

Interpretation:

- A passing broad suite does not override a failed critical sentinel.
- A focused test can support a scoped claim, not a global release claim.
- Quick performance evidence is a clue, not hard proof.
- Security claims require negative-path proof.
- Data authority claims require durable fact source proof.

---

## 9. Risk / Cost Migration Gate

Every non-trivial delivery must answer whether risk or cost moved elsewhere.

Check these surfaces:

```text
correctness:
performance / latency:
allocations / memory:
scheduling / concurrency:
data authority / persistence:
security / permissions:
diagnostics / observability:
operational complexity:
user-facing behavior:
public mental model:
```

Classification:

```text
success
success_with_limited_evidence
provisional
migrated_risk
migrated_cost
blocked
deferred
```

Report block:

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

## 10. Stop Conditions

Stop and report instead of continuing if any condition is hit:

```text
- LOCAL_AGENT_HANDOFF.md or equivalent local instructions are missing for a non-trivial delivery;
- patch requires semantic rewrite to apply;
- required authority conflicts with the delivery;
- implementation requires public API expansion not authorized by the handoff;
- implementation requires bypassing authoritative service, storage, permission, validation, transaction, scheduler, queue, or idempotency boundary;
- validation requires out-of-scope features;
- evidence is incomparable but a success claim is requested;
- tests or smoke checks must be weakened to pass;
- packed source snapshots would need to be edited instead of real source files;
- unrelated worktree changes would need to be overwritten;
- security or data-authority proof becomes UI-only, cache-only, log-only, mock-only, or fixture-only;
- replay triggers external side effects;
- local change requires broad unrelated rewrite.
```

---

## 11. Allowed and Forbidden Claim Language

### 11.1 Allowed claims

```text
- Applied successfully.
- Focused validation passed.
- Typecheck passed for the scoped package.
- Smoke test passed under the specified command.
- Evidence supports this scoped behavior.
- Performance result is diagnostic only.
- Blocked by missing environment.
- Blocked by authority conflict.
```

### 11.2 Forbidden claims without proof

```text
- Fully implemented.
- Production ready.
- No regressions.
- Performance fixed.
- Security verified.
- Migration safe.
- Compatible with all environments.
- CI will pass.
```

### 11.3 Required uncertainty wording

If evidence is partial, say exactly what is partial.

```text
Allowed:
Focused tests passed, but broad validation was not run because <reason>.

Not allowed:
Looks good overall.
```

---

## 12. Report Template

The local agent must report in this shape unless the delivery handoff provides a stricter template.

```text
delivery_name:
delivery_mode:
repo_head_before:
repo_head_after:
dirty_worktree_before:
dirty_worktree_after:
existing_unrelated_changes:
apply_result:
commands_run:
passed_checks:
failed_checks:
expected_failures:
not_run_checks:
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

For commands:

```text
commands_run:
- command:
  cwd:
  exit_code:
  result:
  notes:
```

For files:

```text
files_changed_after_apply:
- path:
  change_type:
  reason:
  in_scope: true/false
```

---

## 13. Minimal Local Agent Prompt

Use this prompt when a harness needs a short instruction block.

```text
You are the local implementation agent.

Execute the attached delivery exactly under its LOCAL_AGENT_HANDOFF.md and the Local Agent Execution Companion Standard.

Your objective is not to make broad improvements. Your objective is to complete the specified delivery while preserving public surface, runtime semantics, data authority, security boundaries, scheduling / transaction / concurrency rules, diagnostics / observability behavior, and evidence comparability requirements.

Before editing:
1. Run git status --short.
2. Run git rev-parse HEAD.
3. Record unrelated worktree changes.
4. Read LOCAL_AGENT_HANDOFF.md first.
5. Read PATCH_MANIFEST.md, VERIFY.md, EVIDENCE_PROTOCOL.md, and RISK_LEDGER.md if present.
6. Do not edit packed source snapshots unless explicitly instructed.

During execution:
- classify delivery mode;
- apply or implement only scoped work;
- run exact validation commands when feasible;
- preserve unrelated changes;
- stop rather than broaden scope;
- classify evidence honestly;
- report results using the template.

Never weaken tests, bypass boundaries, expand public API, create second truth sources, use destructive git commands, or overwrite unrelated worktree changes unless explicitly authorized.
```

---

## 14. Recommended Repository Placement

Recommended path:

```text
docs/standards/local-agent-execution-standard.md
```

Alternative if the repository has a process directory:

```text
docs/process/local-agent-execution-standard.md
```

The cloud-facing companion should live near it:

```text
docs/standards/cloud-llm-patch-handoff-standard.md
```

Per-delivery files remain inside each delivery bundle:

```text
<delivery>/LOCAL_AGENT_HANDOFF.md
```
