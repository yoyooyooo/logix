# StageGateRecord: GP-1

- gate: `GP-1`
- result: `NOT_PASS`
- mode: `strict_gate`
- timestamp: `2026-03-02T19:53:41+0800`

## criteria

- `main_contains_prereq_commit`: `NOT_PASS`（`origin/feat/perf-dynamic-capacity-maxlevel=dfec0166`，`origin/main=8d4f36b1`，`merge-base=b927f45c`，`origin/main..origin/feat` 计数=27，分支尚未并入 main）
- `workflow_strict_diff_and_guards`: `PASS`（strict/triage 分流、并发保护、超时、pinned matrix、normalize 步骤均存在）
- `github_scripts_present`: `PASS`（目标脚本已存在）
- `perf_evidence_scripts_present`: `PASS`（目标脚本已存在）

## commands

```bash
git rev-parse --short origin/feat/perf-dynamic-capacity-maxlevel
git rev-parse --short origin/main
git merge-base origin/feat/perf-dynamic-capacity-maxlevel origin/main
git rev-list --count origin/main..origin/feat/perf-dynamic-capacity-maxlevel
git log --oneline origin/main -- .github/workflows/logix-perf-quick.yml
git log --oneline origin/main -- .github/workflows/logix-perf-sweep.yml
ls .github/scripts
ls .codex/skills/logix-perf-evidence/scripts
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

- 阻塞原因：仅剩“前置分支尚未合入 main”这一条未满足。
- 复核说明：2026-03-02T19:53:41+0800 再次核验，结论不变。
- 放行条件：`criteria` 全部变为 `PASS` 后，才允许宣称 G1/G2/G5 的性能 gate 通过。
