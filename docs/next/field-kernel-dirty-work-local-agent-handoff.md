# Local Agent Handoff — Field Kernel Dirty Work Wave

## 1. Objective

Implement the next focused performance wave for FieldKernel dirty-work paths. Target only converge dirty-reachable execution, validate static-IR/list incremental behavior, source/externalStore dirty gating, and dirtyPlan/listEvidence allocation sentinels. Preserve public API, Program/Runtime assembly law, transaction semantics, fallback correctness, diagnostics-off behavior, and evidence comparability rules.

## 2. Delivery Mode

```text
requirements/spec
implementation plan
performance / hot path
runtime / adapter / integration
mixed
```

## 3. Goal Contract

```text
Goal:
- Reduce or structurally bound real FieldKernel dirty-work cost.
- Prevent exact dirty evidence from silently degrading to full converge, full validate, full source sync, or full list scan.
- Add sentinels for dirty-reachable converge, validateChanged, source row-scope, externalStore coalescing/lifecycle, and dirtyPlan/listEvidence allocation.
- Add focused evidence and tax migration classification for FieldKernel paths.

Required invariants:
- dirtyPlan remains the canonical transaction dirty evidence for field-kernel consumers.
- Full fallback remains allowed only when reason-coded and semantically required.
- diagnostics=off does not allocate debug/trace/fallback payload objects on exact fast paths.
- Converge rollback/no-partial-commit behavior is preserved.
- Validate/source/list semantics remain correct for reorder/remove/root-touched fallback.
- ExternalStore does not break scheduler priority, coalescing, or dispose cleanup.
- Public API and root exports do not change.

Non-goals:
- No dispatch shell fixed-cost edits except test maintenance.
- No RuntimeStore/React selector notify edits except adjacent test maintenance.
- No public FieldKernel namespace or field grammar expansion.
- No AOT/WASM/flat-store work.
- No global Runtime performance claim.

Stop conditions:
- Implementation requires public API expansion.
- Implementation requires bypassing transaction/queue/scheduler ownership.
- dirtyPlan exact evidence becomes less precise or legacy dirty input regains hot-path authority.
- Converge rollback or validate correctness breaks.
- ExternalStore urgent/interleave or dispose cleanup breaks.
- Comparable evidence is missing but hard performance claim is requested.
- Total improves while fallback/allocation/source/list/converge phase cost rises without migration classification.
```

## 4. Authority and Anchor

```text
Prior accepted evidence:
- specs/202-211 transaction fixed-cost wave: dispatchShell.fixedCost tax_removed, claimStrength=hard.
- specs/212-220 RuntimeStore selector notify wave must be accepted or explicitly waived before starting this wave.

Current anchor:
- Start from current real repo worktree after prior wave handoff.
- Do not reset or overwrite unrelated worktree changes.

Authority docs in this bundle:
- AGENT_START_HERE.md
- SEQUENCING.md
- DOD.md
- FIELD_KERNEL_DIRTY_WORK_LEDGER.md
- EVIDENCE_PROTOCOL.md
- BEFORE_AFTER_PLAYBOOK.md
- each specs/NNN-*/spec.md + plan.md + tasks.md + handoff.md
```

## 5. Scope

May change:

| Area | Allowed |
|---|---|
| `packages/logix-core/src/internal/field-kernel/converge-*` | dirty-reachable execution, plan keys, fallback reasons, sentinels |
| `packages/logix-core/src/internal/field-kernel/validate.impl.ts` | static IR selection, validateChanged/list incremental, fallback reason evidence |
| `packages/logix-core/src/internal/field-kernel/source.impl.ts` | source dirty gate, row-scope eval, fallback reason evidence |
| `packages/logix-core/src/internal/field-kernel/external-store.ts` | coalescing, urgent interleave, dispose cleanup, focused counters |
| `packages/logix-core/src/internal/runtime/core/StateTransaction.*` | dirtyPlan/listEvidence cache and test-only allocation sentinels only |
| `packages/logix-perf-evidence/scripts/*field-kernel*` | report classifier and tests |
| focused tests/perf-boundary files | sentinels and evidence only |

## 6. Forbidden Reinterpretation

Do not:

- add public field-kernel APIs or root exports;
- reopen public field grammar;
- make React/RuntimeStore owner of field-kernel dirty truth;
- turn reason-coded fallback into silent full work;
- weaken rollback, no-tearing, source, list, or validate tests;
- allocate diagnostics payloads on diagnostics=off exact path;
- edit packed source XML / Repomix files;
- claim broad/global performance improvement.

## 7. Execution Order

```text
221 -> 222 -> 223 -> 224 -> 225 -> 226 -> 227 -> 228
```

## 8. Validation

Run focused commands from:

```bash
./scripts/list_focused_commands.sh
./scripts/print_evidence_commands.sh
```

Final claim requires `DOD.md` and `EVIDENCE_PROTOCOL.md`.

## 9. Report Template

```text
FieldKernel Dirty Work Wave Handoff
- repo_head_before:
- repo_head_after:
- prior_wave_status:
- specs_completed:
- files_changed:
- commands_results:
- structural_sentinels:
- allocation_sentinels:
- fallback_reason_status:
- same_commit_ab_status_if_used:
- before_after_evidence:
- tax_migration_classification:
- unresolved_second_order_costs:
- allowed_claims:
- forbidden_claims:
- next_recommended_spec:
```
