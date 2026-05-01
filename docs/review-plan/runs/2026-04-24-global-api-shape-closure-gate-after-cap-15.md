# Global API Shape Closure Gate After CAP-15

## Meta

| field | value |
| --- | --- |
| artifact_kind | `global-closure-gate` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `failed-with-next-gap` |
| decision_question | `CAP-15 闭合后，整体 API shape 的下一阻断点是什么` |

## Input State

| input | status |
| --- | --- |
| `SC-A` | `covered` |
| `SC-B` | `covered` |
| `SC-C` | `covered` |
| `SC-D` | `covered` |
| `SC-E` | `covered` |
| `SC-F` | `covered` |
| `SURF-001` | `authority-linked` |
| `SURF-002` | `authority-linked` |
| open collision count | `0` |

## Closure Checklist

| check | result | evidence |
| --- | --- | --- |
| every `SC-*` covered or explicitly deferred | `pass` | `06` marks `SC-A..SC-F` covered |
| every required `CAP-* / VOB-*` covered by owner lane | `fail` | `VOB-02` remains `planned`; `CAP-18` remains partial |
| every active `PROJ-*` baseline / rejected / deferred / owner with close predicate | `fail` | `PROJ-07` remains under-pressure due to `VOB-02 / PF-09` |
| every open `COL-*` closed or deferred | `pass` | `COL-03..COL-08` relevant rows closed |
| every required `PF-* / VOB-*` executable / planned-with-blocker / out of scope | `fail` | `PF-09` remains planned |
| every adopted principle backpropagated | `partial` | `soft-fact-owner-split` remains candidate-level and should be revisited after PF-09 |
| every surface candidate terminal or authority-linked | `pass` | `SURF-001 / SURF-002` authority-linked |
| authority writeback targets known | `pass-local` | `SURF-002` boundary written to runtime/09 |
| shape snapshot reflects registry | `pass-local` | snapshot cites `SURF-002` and CAP-15 bridge state |
| housekeeping removed consumed noise | `partial` | proof ledgers are retained; no active proposal noise remains |

## Decision

Decision: `global-closure-failed`.

The next highest-leverage gap is `VOB-02 / PF-09 compare-perf admissibility`.

Reasoning:

- all current Form scenario rows are covered
- remaining proof gap belongs to verification control lane
- `COL-07` already states the close predicate: benchmark consumes witness whitelist and does not feed correctness truth
- the missing work is executable proof for `PF-09`
- this should not reopen Form authoring surface or `VOB-01` carrier boundary

## Next Slice

| field | value |
| --- | --- |
| target_scenarios | `SC-F` |
| target_caps | `VOB-02`, `CAP-18`, `CAP-25` |
| related_projections | `PROJ-07` |
| related_collisions | `COL-07` closed, may be used as close predicate guard |
| required_proofs | `PF-09` |
| generator_hypothesis | compare / perf can reuse the accepted scenario execution carrier and evidence digests without becoming correctness truth |
| non_claims | no benchmark truth, no authoring semantics, no new compare public surface, no report summary rewrite |

## Required Next Packet

Open `PF-09 compare-perf admissibility packet`.

It must prove or reject:

- a benchmark-admissible subset can reference an accepted witness carrier
- `compiledPlanDigest`, `fixtureIdentityDigest`, and `environmentFingerprint` can be produced or stubbed with stable deterministic evidence
- perf evidence does not alter correctness verdict
- compare/perf does not create a second evidence envelope
- no public Form API changes are needed

## Residual Risks

- If current compare/perf code has no stable substrate, keep `PF-09` planned with blocker and write the blocker explicitly.
- If proving PF-09 requires public compare surface changes, open a new `SURF-*` candidate before implementation.
- If benchmark wants to consume raw traces, reject or reroute because raw trace is not the first compare surface.
