# Requirement Index

| ID | Spec | Priority | Kind | Goal |
| --- | --- | --- | --- | --- |
| 202 | `202-runtime-transaction-fixed-cost-tax-wave` | P0 | group | Coordinate the transaction fixed-cost wave without duplicating member implementation details. |
| 203 | `203-dispatch-shell-preflight-and-tax-ledger` | P0 | member | Establish the local preflight snapshot and tax map before any transaction shell optimization starts. |
| 204 | `204-dispatch-scope-acquisition-fastpath` | P1 | member | Reduce `resolveEach` acquisition overhead without changing module/runtime acquisition semantics. |
| 205 | `205-txn-queue-lane-empty-fastpath` | P1 | member | Make no-backlog/default-lane transaction enqueue pay only the minimal queue and lane policy cost. |
| 206 | `206-transaction-noop-phase-elision` | P1 | member | Skip field/source/validate/selector phases when a module has no assets or no subscribers requiring those phases. |
| 207 | `207-commit-publish-empty-fastpath` | P1 | member | Make empty subscriber/topic/hook commit publish path a structural no-op. |
| 208 | `208-diagnostics-instrumentation-zero-alloc-sentinels` | P1 | member | Prevent instrumentation added for phase proof from becoming a new hot-path allocation tax. |
| 209 | `209-txn-buffer-clear-and-key-materialization-sentinels` | P1 | member | Catch second-order costs caused by buffer reuse, collection clearing, and cache-key materialization. |
| 210 | `210-dispatch-shell-ab-comparison-harness` | P1 | member | Provide a test-only same-commit A/B harness for transaction shell fast-path changes. |
| 211 | `211-focused-perf-evidence-and-tax-migration-gate` | P1 | member | Define the evidence set and post-change report required to decide whether the fixed-cost wave moved or removed tax. |
