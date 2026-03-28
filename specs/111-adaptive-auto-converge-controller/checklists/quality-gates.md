# Quality Gates: Adaptive Auto-Converge Controller

## Shadow-Only Gate

- [x] `110` ledger and residual latest updated
- [x] `E-1B` docs-only scout completed and consumed
- [x] entry decision is at least `inconclusive_after_clean_scout`
- [x] `data-model.md` and `contracts/*` exist
- [x] shadow summary fields have single-source contract
- [x] write scope stays inside converge controller files

## Cheap Local Gate

- [x] `bench:traitConverge:node` run on targeted matrix
- [x] focused same-node `converge-steps` quick run completed
- [x] `executedMode` remains unchanged
- [x] shadow telemetry exports `bandKey / costEstimate / fallbackReason`
- [x] no browser/runtime sidecar experiment mixed in

## Heavier Local Gate

- [ ] same-node soak completed
- [ ] high-dirty rerun completed
- [ ] browser long-run only used as veto gate
- [ ] heavier-local shadow package collected for future live decision
- [ ] shadow telemetry remains additive and zero-impact on live decision

## Live Candidate Gate

- [ ] all shadow-only, cheap-local and heavier-local gates passed
- [ ] residual still points controller rather than browser long-run capture/order noise
- [ ] PR/CI purpose explicitly declared
- [ ] replay to `v4-perf` still blocked until `110` marks candidate `accepted_with_evidence`
