# Quality Gates: Adaptive Auto-Converge Controller

## Shadow-Only Gate

- [ ] `110` ledger and residual latest updated
- [ ] `E-1B` docs-only scout completed and consumed
- [ ] `data-model.md` and `contracts/*` exist
- [ ] shadow summary fields have single-source contract
- [ ] write scope stays inside converge controller files

## Cheap Local Gate

- [ ] `bench:traitConverge:node` run on targeted matrix
- [ ] focused same-node `converge-steps` quick run completed
- [ ] `executedMode` remains unchanged
- [ ] shadow telemetry exports `bandKey / costEstimate / fallbackReason`
- [ ] no browser/runtime sidecar experiment mixed in

## Heavier Local Gate

- [ ] same-node soak completed
- [ ] high-dirty rerun completed
- [ ] browser long-run only used as veto gate
- [ ] residual still points controller-related after clean scout
- [ ] shadow telemetry remains additive and zero-impact on live decision

## Live Candidate Gate

- [ ] all shadow-only, cheap-local and heavier-local gates passed
- [ ] residual still points controller rather than browser long-run capture/order noise
- [ ] PR/CI purpose explicitly declared
- [ ] replay to `v4-perf` still blocked until `110` marks candidate `accepted_with_evidence`
