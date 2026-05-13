# Runtime Inspect Facets

172 采纳 facet-first inspect data plane，不采纳一个长期存在的大 bundle `RuntimeInspectProjection`。

## 目标

`LiveInspectFacetEnvelope` 是 repo-internal shared projection contract。它让 CLI、future DVTools、Playground dogfood host 消费同一组 owner-backed Runtime inspect facts，同时避免形成第二 Runtime model。

`parity-matrix.md` 是 route SSoT。本文件只冻结 facet envelope、artifact shape 和 snapshot 组合规则。

## Envelope Contract

```ts
interface LiveInspectFacetEnvelope<View extends string, Payload> {
  readonly kind: "live.inspect.facet"
  readonly view: View
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority:
    | "runtime-live"
    | "reflection"
    | "field-runtime"
    | "react-host"
    | "evidence"
  readonly producer: string
  readonly payload?: Payload
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly budget: LiveBudgetProfile
  readonly gaps: ReadonlyArray<LiveEvidenceGap>
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
}
```

Rules:

- `payload` is optional. Missing payload is valid only when `gaps` explains why.
- `artifactRef` is optional for inline bounded responses, but daemon-backed commands should mint lineage refs whenever the result can be exported.
- `sourceAuthority` names the fact family authority, not the low-level hook.
- `producer` names the internal hook/projection that produced the facet.
- High-cardinality data must be summarized or moved behind artifact refs.
- Non-serializable and sensitive values must become redaction markers or gaps.

## Artifact Contract

CLI `LiveCommandResult.artifacts[]` should use one inspect artifact family:

```ts
interface LiveInspectArtifact<Section extends string, Payload> {
  readonly kind: "LiveInspectArtifact"
  readonly section: Section
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: LiveInspectFacetEnvelope<Section, Payload>["sourceAuthority"]
  readonly producer: string
  readonly payload?: Payload
  readonly facetRefs?: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly gaps: ReadonlyArray<LiveEvidenceGap>
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
  readonly budget: LiveBudgetProfile
}
```

Allowed first-wave sections:

| Section | Source authority | Route |
| --- | --- | --- |
| `target-detail` | `runtime-live` + `reflection` | `logix live inspect <target>` |
| `state` | `runtime-live` | `logix live state --target <target>` |
| `state-path` | `runtime-live` | `logix live state --target <target> --path <path>` |
| `actions` | `reflection` | `logix live actions --target <target>` |
| `events` | `runtime-live` | `logix live events --target <target>` |
| `timeline` | `runtime-live` | `logix live timeline --target <target>` |
| `fields` | `field-runtime` | `logix live fields --target <target>` |
| `field-graph` | `field-runtime` | `logix live field-graph --target <target>` |
| `field-summary` | `field-runtime` | `logix live field-summary --target <target>` |
| `summary` | `runtime-live` + `field-runtime` | `logix live summary --target <target>` |
| `snapshot` | composition | `logix live snapshot --target <target>` |
| `react-host` | `react-host` | deferred gap |
| `profile` | future profile owner | not a 172 inspect facet; existing 171/15 profile lane returns `LiveProfileSummary` or `EvidenceGap` |

## Snapshot Rule

`snapshot` is not a new fact owner and not a second Runtime snapshot model.

It is a bounded bundle composition:

```ts
interface LiveInspectSnapshotPayload {
  readonly facets: ReadonlyArray<{
    readonly section: string
    readonly ref: VerificationControlPlaneArtifactRef
    readonly status: "included" | "gap" | "degraded"
  }>
  readonly summary: {
    readonly includedCount: number
    readonly gapCount: number
    readonly degradedCount: number
  }
}
```

Rules:

- Each included section must be sourced from a normal facet route.
- Snapshot may request multiple facets in one operation for transport efficiency, but it cannot own new derivation law.
- Over-budget sections become per-section gaps.
- Snapshot export uses the daemon lineage ref for the snapshot artifact plus referenced facet refs.

## Shape Rules

- No React view state.
- No raw runtime object.
- No unbounded object graph.
- No non-serializable value.
- No random identifiers in default diff surface.
- Digest-guarded field/source mappings must carry digest or return gap.
- `stateAfter` belongs to the timeline facet and must be true post-event state: recorded post-event state, event-carried state artifact ref, or current head state with an exact watermark match.
- Actions, dispatch and static summary reference `LiveManifestBindingRef`; adapters do not carry manifest contents as binding truth.
- Field graph/plan returns fieldPath-keyed semantic adjacency, dependency mapping and convergence hints, not raw node/edge objects or temporary graph identities.

## Rejected Shape

Do not introduce:

```ts
interface RuntimeInspectProjection {
  state?: unknown
  actions?: unknown
  events?: unknown
  timeline?: unknown
  fields?: unknown
  summary?: unknown
}
```

Reason: this becomes an attractive second Runtime model and makes `snapshot`, `inspect` and drilldown commands compete for truth. Facets keep ownership and budget boundaries visible.
