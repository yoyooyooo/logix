# VOB-01 BundlePatchRef Constructor Law Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `能否定义最小 runtime-owned bundlePatchRef constructor contract，并保持它只服务 verification evidence` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `single truth`, `single authority`, `evidence boundary`, `fixture-local-until-promoted` |
| non_claims | public API, compare truth, exact authoring surface, Form-side helper noun |
| generator_hypothesis | one internal constructor can turn domain artifact seeds into deterministic evidence refs without creating a new public concept |

## Constructor Contract

Minimum input:

- `bundlePatchPath`

Allowed optional input:

- `domain`

Minimum output:

- `bundlePatch:<domain>:<bundlePatchPath>` when domain exists
- `bundlePatch:<bundlePatchPath>` when domain is omitted

Hard rules:

- reject empty `bundlePatchPath`
- trim surrounding whitespace
- do not parse or normalize domain payload
- do not allocate random ids
- do not read runtime state
- do not enter compare truth
- do not expose a public authoring API

## Proof Requirement

The executable proof must show:

- deterministic output for the same seed
- different seeds produce different refs
- empty seed fails closed
- Form-artifact reason-link fixture calls the constructor rather than formatting refs inline

## Executed Step

Touched files:

- [scenarioCarrierFeed.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts)
- [scenarioCarrierReasonLinkFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts)
- [ScenarioBundlePatchRef.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts)

Landed contract:

- `makeScenarioBundlePatchRef(input)`
- accepts `bundlePatchPath`
- optionally accepts internal `domain`
- rejects empty seeds
- trims surrounding whitespace
- returns deterministic `bundlePatch:*` refs
- Form-artifact fixture now calls the constructor instead of formatting inline

## Status Delta

| item | before | after if proof lands |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |
| `bundlePatchRef constructor law` | `missing` | `fixture-local internal contract proven` |

## Promotion Boundary

Even if this packet lands, it still does not promote:

- public `Runtime.trial(mode="scenario")`
- compare admission
- global evidence summary shape
- final `CAP-15` exact closure

Promotion to authority can only happen after a later packet proves the constructor is consumed by the scenario carrier route that will own `VOB-01`.

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `3` test files passed
- `6` tests passed
- `packages/logix-core` typecheck passed

## Next Action

Open the next packet for scenario carrier route consumption. The next proof must show this constructor is consumed by the route that owns `VOB-01`, while compare truth and public API stay out of scope.
