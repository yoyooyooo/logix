# Evidence And Workbench Bridge

172 inspect data plane 必须能进入 evidence/workbench 闭环，同时不能让 Workbench 成为 Runtime fact owner。

## Chain

```text
LiveInspectFacetEnvelope
  -> LiveInspectArtifact(section=...)
    -> daemon lineage artifact
      -> logix live export evidence --from <daemon-lineage-ref>
        -> CanonicalEvidencePackageRef
          -> Workbench projection / runtime.trial / runtime.compare
```

## Rules

- CLI live command output is not a verification verdict.
- Inspect/state/actions/events/timeline/fields/summary are live inspect artifacts.
- `logix live export evidence --from <daemon-lineage-ref>` is the unified handoff.
- Workbench consumes canonical evidence packages, owner-approved artifact refs, normalized live evidence facets, lineage artifact refs and evidence gaps.
- Workbench does not reinterpret raw Runtime objects.
- Workbench does not turn inspect output into standalone truth.

## Lineage Artifact

Each daemon-backed inspect artifact should record:

- command route and normalized argv digest.
- target coordinate and attachment id.
- request id and WebSocket connection identity used for isolation proof.
- source authority and producer.
- artifact section.
- payload digest or file ref.
- budget, redaction, dropped and degraded markers.
- gaps.

The lineage ref is the stable input to `export evidence`. A bare capture id or target id is only a non-ambiguous alias.

## Evidence Export

`export evidence` maps live inspect artifacts into canonical evidence package contents:

| Input | Export mapping |
| --- | --- |
| `LiveInspectArtifact(section="target-detail")` | host/runtime target context artifact |
| `section="state"` / `section="state-path"` | bounded runtime state artifact or redacted gap |
| `section="actions"` | reflection/live binding artifact |
| `section="events"` | bounded debug event batch artifact |
| `section="timeline"` | timeline artifact with stateAfter refs or gaps |
| `section="fields"` / `section="field-graph"` / `section="field-summary"` | field runtime inspect artifact |
| `section="summary"` | operation summary artifact |
| `section="snapshot"` | bundle artifact with facet refs |
| structured gaps | canonical evidence gap entries |

Profile summary is not mapped through `LiveInspectArtifact(section="profile")` in 172. The existing profile lane may export `LiveProfileSummary` or `EvidenceGap` under the 171/15 contract.

## Workbench Projection

Workbench may display:

- sessions / targets from canonical evidence context.
- artifacts and drilldown refs.
- operation facets.
- gaps, redaction and degraded notices.
- links from verification report artifacts back to live evidence refs.

Workbench may not:

- own `stateAfter` derivation.
- own action validator availability.
- own field graph truth.
- treat `LiveInspectArtifact` as a report verdict.

## Verification Handoff

`runtime.trial` and `runtime.compare` may consume canonical evidence packages exported from live inspect artifacts.

Rules:

- repair hints remain owned by verification control plane reports.
- live output can improve focus and evidence locality, not directly tell Agent what to edit.
- missing live facts stay as evidence gaps and may produce inconclusive verification, not fabricated findings.
