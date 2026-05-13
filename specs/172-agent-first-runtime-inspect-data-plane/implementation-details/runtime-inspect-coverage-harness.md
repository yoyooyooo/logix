# Runtime Inspect Coverage Harness

本 harness 是 172 的最终覆盖证明。它回答一个问题：

```text
After 172 and the post-172 owner closures, does every currently inspectable Runtime fact family have a CLI-visible route, owner-backed facet, explicit deferred owner or rejected/future row?
```

它不替代 [../parity-matrix.md](../parity-matrix.md)。matrix 是 route SSoT；本 harness 验证 matrix 没有漏掉当前内核已经具备稳定 owner 的 Runtime fact。

通用资产卫生看 [../../../docs/standards/harness-and-proof-assets-standard.md](../../../docs/standards/harness-and-proof-assets-standard.md)。本 harness 允许在测试 metadata 与 spec notes 中保留 `R172-*` row refs；生产 `src/**`、CLI machine output、daemon/browser adapter payload 不得保留 row helper、matrix row 字段或 `runtime-inspect-coverage@172` 这类 spec 编号 schema version。

## 目标

172 不能只证明新增命令能跑通，还必须证明没有留下这类空洞：

- core 里已有稳定 owner fact，但 CLI 没有 route。
- core 里已有稳定 owner fact，但只在 raw debug hook 或 DevTools UI compute 里可见。
- CLI 返回了 gap，但 gap 没有 owner、reopen bar 或 matrix row。
- 一个 fact family 被 daemon、browser adapter 或 CLI 私下拼成第二套 truth。

## Harness 输入

Coverage harness 至少读取这些来源：

| Source | Purpose |
| --- | --- |
| `parity-matrix.md` | finite route / authority / artifact SSoT |
| `packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts` | current internal runtime capability index |
| `packages/logix-core/src/internal/runtime/core/DebugSink*.ts` | runtime event and diagnostic fact producers |
| `packages/logix-core/src/internal/reflection/**` | static action / payload / validator / manifest facts |
| `packages/logix-core/src/internal/runtime/core/ModuleFields.ts` and field-runtime internals | field list / provenance / graph-adjacent facts |
| `packages/logix-core/src/internal/repoBridge/live.ts` and live wire types | live attachment / target / lineage bridge |
| 172 core/CLI contract tests | evidence that routes produce owner-backed facets or gaps |

If implementation moves these modules, update this harness file and `notes/verification.md` in the same change.

## Coverage Inventory Shape

Implementation should materialize a deterministic inventory in test output or fixture form:

```ts
interface RuntimeInspectCoverageInventory {
  readonly schemaVersion: "runtime-inspect-coverage.v1"
  readonly factFamilies: ReadonlyArray<{
    readonly factFamily:
      | "target"
      | "state"
      | "state-path"
      | "action-manifest"
      | "dispatch-validation"
      | "snapshot"
      | "event-window"
      | "timeline"
      | "operation-summary"
      | "field-converge"
      | "field-list"
      | "field-graph"
      | "field-summary"
      | "diagnostics"
      | "process-events"
      | "static-summary"
      | "evidence-export"
      | "react-host"
      | "profile-summary"
      | "browser-deep-profile"
      | "mutation-debug"
    readonly owner:
      | "171-live-attachment"
      | "runtime-live"
      | "reflection"
      | "field-runtime"
      | "evidence"
      | "future-react-host"
      | "future-profile-owner"
    readonly matrixRows: ReadonlyArray<string>
    readonly cliRoutes: ReadonlyArray<string>
    readonly artifactSections: ReadonlyArray<string>
    readonly status: "owner-backed" | "structured-gap" | "deferred" | "rejected"
    readonly proofRefs: ReadonlyArray<string>
  }>
}
```

The inventory may be produced by a test helper rather than a generated repository file. If it is generated only during tests, `notes/verification.md` must record the command and output digest. Matrix row refs are test/spec trace metadata only and must not leak into production DTO fields.

## Mandatory Mapping

172 completion requires this minimum mapping:

| Runtime fact family | Required route / outcome |
| --- | --- |
| active live target / attachment / host coordinate | `logix live targets`, `logix live inspect <target>` |
| latest state | `logix live state --target ...` |
| state path | `logix live state --target ... --path ...` |
| action manifest / payload summary | `logix live actions --target ...` via `LiveManifestBindingRef` |
| dispatch validation / result | `logix live dispatch --target ... --action ...` |
| event window | `logix live events --target ... --kind ...` |
| timeline / `stateAfter` | `logix live timeline --target ...` true post-event state or item gap |
| operation summary | `logix live summary --target ...` |
| field list | `logix live fields --target ...` |
| field graph / plan adjacency | `logix live field-graph --target ...` |
| latest field summary | `logix live field-summary --target ...` |
| diagnostics | `logix live events --target ... --kind diagnostic` via 179 source bridge |
| process/effect events | `logix live events --target ... --kind process` via 179 source bridge |
| static imports/services/process summary | `logix live inspect <target>` target-detail facet or gap via `LiveManifestBindingRef` |
| evidence export | `logix live export evidence --from <daemon-lineage-ref>` |
| React render/selector evidence | explicit deferred owner until SSoT 18 React host reopen bar passes |
| runtime profile summary | existing 171/15 profile lane with explicit deferred local profiler owner |

## Proof Layers

Runtime Inspect Coverage Harness is not a single shallow test. It is a four-layer proof:

| Layer | Required proof | Suggested file |
| --- | --- | --- |
| Core inventory contract | Matrix rows and current core inspectable fact families produce deterministic coverage inventory with zero unmapped facts | `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts` |
| Core facet contract | Each owner-backed family has facet/gap proof for DTO shape, sourceAuthority, budget, redaction/degraded markers and forbidden raw values | `packages/logix-core/test/internal/LiveBridge/live-inspect-*.contract.test.ts` |
| CLI/schema contract | `logix live state/actions/events/timeline/fields/field-graph/field-summary/summary` exist only under `logix live`, produce `LiveCommandResult`, and cannot emit verification verdict fields | `packages/logix-cli/test/**/live-inspect-*.contract.test.ts` |
| Browser E2E + evidence handoff | Playwright dev-only import page can serve every P0/P1 owner-backed route or structured gap; exported inspect artifacts enter canonical evidence | `examples/logix-react` Playwright E2E and `packages/logix-core/test/internal/LiveBridge/live-inspect-evidence-bridge.contract.test.ts` |

All four layers are required. A pure unit harness is not enough because it cannot prove daemon/browser attachment and CLI route wiring. A pure E2E is not enough because it cannot prove current core fact-family coverage or owner boundaries.

## Required Tests

Add a dedicated coverage test, preferably:

```text
packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts
```

The test must prove:

1. Every P0/P1 `parity-matrix.md` row has a corresponding coverage inventory entry.
2. Every coverage inventory entry has at least one of:
   - owner-backed facet proof.
   - structured gap proof with stable gap reason.
   - explicit deferred owner and reopen bar.
   - explicit rejected/future row.
3. No coverage entry uses CLI, daemon or browser adapter as fact authority.
4. `RuntimeInternals` capability groups that expose inspectable runtime facts are either mapped, deferred or rejected with reason.
5. `LiveManifestBindingRef`, true-post-event `stateAfter`, and fieldPath-keyed field graph adjacency appear as proof obligations, not optional details.
6. Production `src/**` has no `R172-*`, `matrixRow`, `matrixRowForSection`, test inventory schema, temporary probe/witness/pressure helper, or CLI-side fact-authority mapping.

Add package-level tests as implementation requires:

- core contract tests for inventory generation.
- CLI schema tests proving required routes exist.
- daemon/browser E2E proving the route can request each owner-backed family.
- evidence export tests proving facet artifacts enter canonical evidence.

## Minimum E2E Scenario

The E2E must use the same dev-only injection strategy planned for 171/172:

1. Start a lightweight Playwright page.
2. Import the live adapter through the dev-only import path, not production app code.
3. Mount a minimal Logix Program with:
   - one state value.
   - one declared action with payload summary or validator.
   - one state-changing dispatch.
   - at least one field contribution and field summary source.
   - at least one diagnostic/process-style event if current producers support it.
4. Simulate CLI or call the local daemon IPC exactly as CLI would.
5. Run:
   - `targets --tree`
   - `inspect <target>`
   - `state`
   - `state --path`
   - `actions`
   - `dispatch`
   - `events --kind operation`
   - `timeline`
   - `summary`
   - `fields`
   - `field-graph`
   - `field-summary`
   - `export evidence`
6. Assert each P0/P1 result is one of:
   - owner-backed `LiveInspectArtifact(section=...)`.
   - `LiveOperationFacet`.
   - `CanonicalEvidencePackageRef`.
   - stable structured gap with matrix row and owner.
   P2 rows may remain explicit deferred owners.
7. Assert no result includes verification-only fields such as `repairHints`, `nextRecommendedStage`, `verdict` or `primaryReportOutputKey`.

## Skill Verification

172 completion must update the Agent-facing skills:

- `skills/logix-cli/SKILL.md` must document the new live inspect drilldown routes, live evidence handoff, and the coverage harness command.
- `skills/logix-best-practices/SKILL.md` must keep live debugging outside business authoring and point Agents to the 172 CLI inspect routes for active runtime context.

The final text sweep must include both skill files. 172 is not complete if the skills still describe only the 171 live command surface.

## Failure Conditions

The harness must fail 172 completion when:

- A P0/P1 matrix row has no coverage inventory entry.
- A current core fact family has no route, gap, deferred owner or rejected/future row.
- A gap reason is free-form or has no owner/reopen bar.
- CLI, daemon or browser adapter becomes `Fact authority`.
- Field graph coverage relies on raw `nodes[] / edges[] / from / to`.
- Timeline coverage relies on latest state as historical `stateAfter`.
- Action/dispatch coverage bypasses `LiveManifestBindingRef`.
- Workbench consumes raw runtime inspect payload as standalone fact.
- Production code exposes spec row refs, planning matrix helpers, or coverage inventory schema as runtime concepts.

## Verification Note Requirement

`notes/verification.md` must include a `Runtime Inspect Coverage Harness` section and append post-owner-closure records when promoted specs change the inventory:

- command run.
- inventory digest or inline summarized table.
- unmapped fact families count.
- structured gaps count by reason.
- deferred rows count.
- rejected/future rows count.
- evidence package export proof refs.
- production source hygiene sweep result.

172 is not complete if this section is missing.
