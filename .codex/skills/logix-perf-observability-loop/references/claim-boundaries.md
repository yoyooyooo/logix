# Claim Boundaries

Use this file before writing any performance conclusion.

## Claim Strength

| Evidence | Allowed claim |
| --- | --- |
| local quick | clue |
| local default | preflight |
| PR/push default CI | candidate evidence |
| nightly default | candidate evidence with trend value |
| manual/nightly soak | hard-evidence candidate |
| release/spec final gate | hard only if complete |

## Forbidden Claims Without Full Artifacts

Do not claim:

- 235 complete
- global runtime performance improved
- no regressions exist globally
- soak passed
- release-safe performance
- missing counter equals zero
- browser/product cost is isolated unless P2 evidence says so
- LLM advisory or reviewer notes override machine-readable gates

## Machine-Readable Boundary

Reports should carry structured boundary fields when available:

```text
artifactRole
claimStrength
allowedClaimKinds
forbiddenClaimKinds
```

Snapshot reports allow `current-state` only. Trend reports allow `trend-prioritization` only. Advisory summaries can explain evidence, but final gates ignore them when counters, suites, migration, timeout, or stability fields block the claim.

## Required Hard-Claim Conditions

Hard claim requires:

```text
comparable default evidence
soak collected or explicitly scoped
required suites present
required counters present + value
no hard regressions
no unexplained timeouts
no unexplained stabilityWarnings
no unaccepted migratedCost/migratedRisk
final gate classification=complete
claimStrength=hard
```

## Good Wording

Use:

```text
This is candidate evidence from PR/push default CI.
This is local preflight only.
This is blocked because required counters are missing.
This improvement is not a hard claim until soak/final gate artifacts exist.
```

Avoid:

```text
fixed performance
final complete
globally faster
soak passed
all regressions gone
```
