# CAP-15 To VOB-01 Routing Decision

## Meta

| field | value |
| --- | --- |
| artifact_kind | `routing-decision` |
| target_capability | `CAP-15` |
| owner | `coordination-main-agent` |
| status | `accepted` |
| decision_question | `CAP-15 exact backlink 是否可以直接由当前 state truth 证明闭合` |

## Decision

Current answer: `no`.

`CAP-15` exact backlink cannot be proven from current state truth alone.  
The residual must route to `VOB-01 scenario trial carrier`, not back into Form surface or rule-lane redesign.

## Why Current State Truth Is Insufficient

- `submitAttempt` only exports `reasonSlotId=submit:<seq>` plus summary counts and blocking basis
- row-scoped final errors project as `reasonSlotId=field:<path>` with `sourceRef=errors...` and optional `subjectRef.kind="row"`
- current state truth does not export `bundlePatchRef`
- current state truth does not export `ownerRef`
- current state truth does not export `transition / retention`
- current host projection can explain the row subject and the final error path, but it cannot prove `reasonSlotId -> current live evidence head`

## Source Evidence

- [packages/logix-form/src/internal/form/errors.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/errors.ts)
  - submit summary stays on `submit:<seq>` and does not carry bundle-head linking
- [packages/logix-react/src/FormProjection.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/FormProjection.ts)
  - row error projection derives `field:<path>` plus `sourceRef / subjectRef`, without bundle-head linking
- [specs/155-form-api-shape/trace-i1-evidence-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/trace-i1-evidence-map.md)
  - `W5 rule-submit-backlink` already records: `partial state truth has reasonSlotId; no reasonSlotId -> bundlePatchRef evidence feed`
- [2026-04-24-pf-04-rule-submit-backlink-packet.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-pf-04-rule-submit-backlink-packet.md)
  - `PF-04` is executable and proves rule-lane sufficiency, but leaves exact backlink unresolved

## Rejected Alternatives

- prove `CAP-15` from current state truth anyway
  - rejected because the required backlink coordinates are absent
- reopen rule lane or companion lane
  - rejected because `PF-04` already proves current final-truth owner lanes are sufficient
- add a new public diagnostics helper
  - rejected because it would grow a second explanation surface without solving evidence ownership

## Accepted Routing

- keep `CAP-15` as `partial`
- keep `PF-04` as executable state-level floor
- route exact backlink residual to `VOB-01`
- next required substrate is scenario carrier or equivalent evidence feed that can carry:
  - `reasonSlotId`
  - `bundlePatchRef`
  - `ownerRef`
  - `transition`
  - `retention`

## Consequence

- `SC-D` remains `partially-covered`
- next cursor should move from `PF-04 floor` to `VOB-01 scenario carrier for CAP-15`
- no public API reopen is needed at this point
