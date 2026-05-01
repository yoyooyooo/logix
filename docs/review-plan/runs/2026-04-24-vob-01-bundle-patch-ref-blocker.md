# VOB-01 BundlePatchRef Blocker

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-blocker` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `accepted` |
| decision_question | `当前是否已经存在可复用的 runtime-owned bundlePatchRef 提取路径` |

## Decision

Current answer: `no`.

The repo currently exposes:

- `bundlePatchPath`
- ownership/exporter-side path seeds

but it does not expose:

- a runtime-owned `bundlePatchRef` constructor
- a stable `bundlePatchRef` extraction path from proof-kernel context

So the next step cannot honestly be “finish real W5 extraction”.  
The next step must be: define and land the smallest runtime-owned `bundlePatchRef` constructor or fixture-local extraction path.

## Evidence

- [impl.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts)
  - exports `bundlePatchPath` seed at authoring/ownership level
- [artifacts.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/artifacts.ts)
  - exports ownership contracts, not runtime bundle-head refs
- [trace-i1-evidence-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/trace-i1-evidence-map.md)
  - explicitly records no `reasonSlotId -> bundlePatchRef` evidence feed today
- [challenge-runtime-scenario-execution-carrier.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-runtime-scenario-execution-carrier.md)
  - treats `bundlePatchRef` as run-session owned and still deferred

## Rejected Alternatives

- pretend `bundlePatchPath` is already `bundlePatchRef`
  - rejected because path seed and runtime ref are different owner levels
- invent a synthetic constructor and call it done
  - rejected because it would recreate the same fake progress problem we just removed from `reasonSlotId` and row locality
- jump directly to compare truth substrate
  - rejected because compare truth is downstream of carrier and ref extraction

## Consequence

- `bundlePatchRef` remains the last unresolved coordinate for `CAP-15`
- current cursor should move from generic “bundlePatchRef extraction” to a narrower question:
  - `what is the smallest runtime-owned bundlePatchRef constructor we can land without reopening compare truth`

## Next Action

Draft a minimal packet for `bundlePatchRef constructor / fixture-local extraction path`, and keep it strictly inside runtime verification internals.
