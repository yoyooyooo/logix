# Local Agent Handoff — RuntimeStore Selector Notify Wave

## 1. Objective

Implement the next focused performance wave after transaction fixed-cost work. Target only RuntimeStore / selector notification fanout and lifecycle costs. Preserve public API, transaction semantics, selector route ownership, React hook surface, no-tearing semantics, and diagnostics-off hot-path behavior.

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
- Reduce or structurally bound non-empty selector notification fanout.
- Add sentinels for selector overlap, RuntimeStore listener snapshots, React runSync fallback, topic retain/release, and render fanout.
- Add focused evidence and tax migration classification for runtimeStore/selector notify paths.

Required invariants:
- Core owns selector route and precision.
- React consumes route decisions; React does not create a parallel selector law.
- RuntimeStore preserves no-tearing and listener mutation isolation.
- diagnostics=off does not allocate debug payloads on exact fast paths.
- Public API and root exports do not change.

Non-goals:
- No dispatch shell fixed-cost edits except test maintenance.
- No public ReadQuery/selector authoring expansion.
- No examples/playground product route rewrites.
- No global Runtime performance claim.

Stop conditions:
- Implementation requires public API change.
- Implementation requires moving selector route policy into React.
- RuntimeStore no-tearing or listener mutation isolation breaks.
- Comparable evidence is missing but hard performance claim is requested.
- Total improves while render/runSync/retain/broadcast/listener clone cost rises without migration classification.
```

## 4. Authority and Anchor

```text
Prior accepted delivery:
- specs/202-211 transaction fixed-cost wave
- dispatchShell.fixedCost focused report: classification=tax_removed, claimStrength=hard

Current anchor:
- start from current real repo worktree after 211 accepted
- do not reset or overwrite unrelated worktree changes

Authority docs in this bundle:
- AGENT_START_HERE.md
- SEQUENCING.md
- DOD.md
- NOTIFY_TAX_LEDGER.md
- EVIDENCE_PROTOCOL.md
- BEFORE_AFTER_PLAYBOOK.md
- each specs/NNN-*/spec.md + plan.md + tasks.md + handoff.md
```

## 5. Scope

May change:

| Area | Allowed |
|---|---|
| `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts` | notify/listener/topic fast path and test-only counters |
| `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts` | exact dirty/read overlap and fallback reason accounting |
| `packages/logix-core/src/internal/runtime/core/selectorRoute.*.ts` | internal route evidence/counter plumbing only |
| `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` | readQuery snapshot/runSync fallback guards |
| `packages/logix-react/src/internal/hooks/useSelector.ts` | consume core route; render fanout sentinels |
| `packages/logix-perf-evidence/scripts/*selector-notify*` | report classifier and tests |
| focused tests/perf-boundary files | sentinels and evidence only |

## 6. Forbidden Reinterpretation

Do not:

- add public selector/readQuery APIs;
- add public fast-path config;
- reintroduce legacy selector store;
- use whole-module broadcast as normal exact path;
- weaken no-tearing tests;
- make diagnostics/off allocate payloads;
- claim global runtime performance;
- edit packed source XML / Repomix files.

## 7. Execution Order

```text
212 -> 213 -> 214 -> 215 -> 216 -> 217 -> 218 -> 219 -> 220
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
RuntimeStore Selector Notify Wave Handoff
- repo_head_before:
- repo_head_after:
- specs_completed:
- files_changed:
- commands_results:
- structural_sentinels:
- runSync_fallback_status:
- topic_lifecycle_status:
- render_fanout_status:
- focused_perf_artifacts:
- selector_notify_report:
- classification:
- claim_strength:
- migrated_cost:
- allowed_claims:
- forbidden_claims:
- next_recommended_wave:
```
