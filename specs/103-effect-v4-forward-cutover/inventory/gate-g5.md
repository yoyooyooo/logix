# StageGateRecord: G5

- gate: `G5`
- result: `NOT_PASS`
- mode: `exploratory`
- timestamp: `2026-03-07T12:10:00+08:00`

## criteria

- `historical_release_snapshot_exists`: `PASS`
- `current_head_matches_historical_snapshot`: `NOT_PASS`
- `history_rewrite_tasks_authorized`: `NOT_PASS`
- `gp_1_allows_perf_claims`: `NOT_PASS`

## evidenceRefs

- `specs/103-effect-v4-forward-cutover/perf/gh-22588230728/before.8cb40d43.gh-Linux-X64.soak.json`
- `specs/103-effect-v4-forward-cutover/perf/gh-22588230728/after.8d4f36b1.gh-Linux-X64.soak.json`
- `specs/103-effect-v4-forward-cutover/perf/gh-22588230728/diff.8cb40d43__8d4f36b1.gh-Linux-X64.soak.json`
- `specs/103-effect-v4-forward-cutover/perf/s6.gh.soak.strict.summary.md`
- `docs/effect-v4/09-release-notes-v1.0.zh-CN.md`

## notes

- 历史 snapshot `8cb40d43 -> 8d4f36b1` 的 soak+strict artifact 仍然存在，且对当时的 release draft 有价值。
- 但当前 `HEAD` 为 `0ca18a73`，且 `origin/main..HEAD=70`；仓库策略也禁止在未显式授权时自动做 `rebase` / 历史压缩，因此该 snapshot 不能再被当成当前分支的放行结论。
- 本记录保留为历史 evidence index，不再承担当前 closure gate 角色。
