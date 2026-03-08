# StageGateRecord: GP-1

- gate: `GP-1`
- result: `NOT_PASS`
- mode: `strict_gate`
- timestamp: `2026-03-07T12:10:00+08:00`

## criteria

- `main_contains_prereq_commit`: `NOT_PASS`（`origin/feat/perf-dynamic-capacity-maxlevel=6dde14cb`，`origin/main=cd127327`，`origin/main..origin/feat` 计数=`1`，前置提交尚未进入 `main`）
- `workflow_strict_diff_and_guards`: `PASS`（`logix-perf-{quick,sweep}.yml` 具备 strict/triage 分流、并发保护、超时、pinned matrix、normalize 步骤）
- `github_scripts_present`: `PASS`
- `perf_evidence_scripts_present`: `PASS`

## commands

```bash
git rev-parse --short origin/feat/perf-dynamic-capacity-maxlevel
git rev-parse --short origin/main
git rev-list --count origin/main..origin/feat/perf-dynamic-capacity-maxlevel
git log --oneline origin/main -- .github/workflows/logix-perf-quick.yml .github/workflows/logix-perf-sweep.yml
```

## evidenceRefs

- `.github/workflows/logix-perf-quick.yml`
- `.github/workflows/logix-perf-sweep.yml`
- `.github/scripts/logix-perf-normalize-ci-reports.cjs`
- `.github/scripts/logix-perf-quick-summary.cjs`
- `.codex/skills/logix-perf-evidence/scripts/collect.ts`
- `.codex/skills/logix-perf-evidence/scripts/diff.ts`
- `.codex/skills/logix-perf-evidence/scripts/validate.ts`
- `.codex/skills/logix-perf-evidence/scripts/bench.traitConverge.node.ts`

## notes

- `GP-1` 现在已经不是陈旧快照：上面的哈希与计数对应 2026-03-07 当前远端事实。
- 它仍然限制“宣称 G1/G2/G5 性能 gate 通过”，但不阻塞主线下继续推进实现阶段。
- 完整的发布级性能放行仍需在 `103` 主线后续阶段满足前置条件后重新执行。
