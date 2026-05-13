# Runtime Transaction Tax Ledger

## First-Order Tax Points

| Tax Point | Primary Evidence Field | Owner Spec | Notes |
| --- | --- | --- | --- |
| Scope/acquisition | `runtime.resolveScopeMsPerDispatch` | 204 | Compare `reuseScope` vs `resolveEach`. |
| Queue context/policy | `runtime.txnPhase.queueContextLookupMs`, `queueResolvePolicyMs` | 205 | No-backlog path should not pay backlog policy cost. |
| Backpressure/bookkeeping | `queueBackpressureMs`, `queueEnqueueBookkeepingMs`, `queueStartHandoffMs` | 205 | Backlog cases still use full path. |
| No-op phases | `fieldConvergeMs`, `scopedValidateMs`, `sourceSyncMs` | 206 | Skip only when assets are absent. |
| Commit publish | `commitPublishCommitMs`, `commitTotalMs` | 207 | Empty subscribers/topics/hooks should be no-op. |
| Diagnostics/debug | `commitStateUpdateDebugRecordMs`, sentinel counters | 208 | `off` must not allocate payloads. |

## Second-Order Tax Points

| Tax Migration | Symptom | Owner Spec | Required Response |
| --- | --- | --- | --- |
| Scope reduced, queue grows | total down but queue phase up | 205 | Inspect direct-idle branch and policy lookup. |
| Queue reduced, commit grows | total down but commit publish up | 207 | Add empty publish no-iteration guard. |
| Off path clean, light/full grows | off p95 stable but diagnostics tiers regress | 208 | Separate payload materialization from off path. |
| Alloc removed, clear cost appears | small txn after large txn regresses | 209 | Measure clear counters before generation stamping. |
| Key cache wins, key materialization grows | stable root hash tests pass but p95 tail grows | 209 | Count Array.from/join/split in txn window. |
| Median down, p95 up | faster average but worse tail | 211 | Treat as tax migration, not success. |

## Interpretation Rule

A change is not a success if it only moves cost from `bodyShellMs` to `commitPublishCommitMs`, from `resolveScopeMsPerDispatch` to `queueResolvePolicyMs`, or from time to allocation counters.
