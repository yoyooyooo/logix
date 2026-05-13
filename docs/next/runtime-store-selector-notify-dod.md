# Definition of Done

## Structural DoD

- Exact dirty/read overlap does not mark unrelated selector topics.
- Broadcast fallback is explicit and reason-coded.
- RuntimeStore empty/no-subscriber topic path does not allocate listener arrays or invoke callbacks.
- RuntimeStore callback fast path preserves in-tick subscribe/unsubscribe isolation.
- Committed RuntimeStore snapshot path has `runSyncFallbackCount=0` for active listeners.
- First listener does not cause duplicate notify when snapshot is already committed.
- Topic retain/release count returns to zero after unmount, hot lifecycle replacement, and module dispose.
- React exact selectors do not re-render for disjoint dirty writes.
- diagnostics=off does not allocate debug/timing payloads on exact fast paths.
- Public API, public exports, hook signatures, and selector authoring surface do not change.

## Evidence DoD

Hard performance claim requires:

```text
profile=default or soak
same matrix/env/profile
comparable=true
summary.regressions=0
summary.budgetViolations=0
warnings=[] or fully explained as non-blocking
no timeout/fail/missing suite
required phase/counter evidence present
structural/allocation/lifecycle sentinels pass
selector notify tax report classification supports claim
```

## Allowed Outcomes

```text
tax_removed       -> focused selector notify path improved, no migration
stable_guarded    -> structural fanout improved/guarded, total timing stable/no regression
tax_migrated      -> total improved but another watched path increased
inconclusive      -> evidence missing/incomparable/quick-only
failed            -> hard regression, sentinel fail, no-tearing break, or missing required metric
```

## Forbidden Claims Unless Hard Evidence Exists

- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Transaction path is optimal.
