# Agent Start Here

## Immediate Steps

```bash
git status --short
git rev-parse HEAD
./scripts/validate_bundle_structure.sh
./scripts/copy_into_repo.sh /path/to/logix/repo
./scripts/list_focused_commands.sh
./scripts/print_evidence_commands.sh
```

Record existing unrelated worktree changes. Do not use destructive git commands.

## What This Wave Is

This wave targets non-empty selector notification cost. The previous dispatch-shell wave made the empty/no-op transaction shell thinner. This wave checks what happens when selectors, topics, listeners, and React subscribers are present.

## Main Question

```text
Can an exact dirty commit notify only affected selector/readQuery topics,
without runSync fallback, retained topic leaks, listener clone fanout,
or unrelated React re-renders?
```

## Success Shape

- structural sentinels pass;
- no public API changes;
- no no-tearing breakage;
- focused evidence is comparable before hard claim;
- report classifies result honestly.
