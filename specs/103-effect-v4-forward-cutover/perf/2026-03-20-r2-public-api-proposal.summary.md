# 2026-03-20 · R-2 public API proposal · evidence summary

- scope: `docs/evidence-only`
- decision: `do_not_open_impl_line`
- reason: `probe_next_blocker` returned `failure_kind=environment`
- proposal doc: `docs/perf/2026-03-20-r2-public-api-proposal.md`
- probe evidence: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-public-api-proposal.probe-next-blocker.json`

## Probe snapshot

- status: `blocked`
- blocker suite: `externalStore.ingest.tickNotify`
- failure_kind: `environment`
- stderr tail: `sh: vitest: command not found`

## Gate evaluation

- Gate-A (new product SLA): `pending`
- Gate-B (internal widening insufficient evidence): `pending`
- Gate-C (clean/comparable probe): `failed_at_2026-03-20(environment)`
- Gate-D (migration readiness): `ready_in_doc_only`

## Superseded notes

- `2026-03-20` 本文件只记录当时的 environment 阻塞快照，不作为 Gate-C 的最终裁决依据。
- `2026-03-21` 的 Gate-C 独立稳定性复核已给出可比样本，见：
  - `docs/perf/2026-03-21-r2-public-api-staging-plan.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json` ~ `r7.json`
- `R-2 Gate-A/B` 的触发口径以 trigger scout 为准：
  - `docs/perf/2026-03-21-r2-gate-ab-trigger-scout.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-ab-trigger-scout.summary.md`
- 当前 design package：
  - `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-r2-u-policyplan-design-package.summary.md`

结论：保持 `R-2 public API proposal watchlist`，等待 Gate-A/B 触发后再开实施线。
