# CLI Command Lane

172 的 CLI lane 把 `logix live` 打造成 Agent-first Runtime inspect route。

`parity-matrix.md` 是 route SSoT。本文件只冻结 grammar、输出规则和维护规则。

## Frozen Grammar

```text
logix live inspect <target> [--attachment <attachmentId>]
logix live state --target <target> [--attachment <attachmentId>] [--path <path>]
logix live actions --target <target> [--attachment <attachmentId>]
logix live dispatch --target <target> [--attachment <attachmentId>] --action <tag> [--payload <json-or-file>]
logix live events --target <target> [--attachment <attachmentId>] [--kind <kind>] [--limit <n>]
logix live timeline --target <target> [--attachment <attachmentId>] [--field <path>] [--limit <n>]
logix live fields --target <target> [--attachment <attachmentId>]
logix live field-graph --target <target> [--attachment <attachmentId>]
logix live field-summary --target <target> [--attachment <attachmentId>]
logix live summary --target <target> [--attachment <attachmentId>]
logix live snapshot --target <target> [--attachment <attachmentId>]
logix live export evidence --from <daemon-lineage-ref> [--out <path>]
```

`inspect` intentionally uses positional `<target>` because `docs/ssot/runtime/15-cli-agent-first-control-plane.md` already freezes that shape. Drilldown commands use `--target` so options compose predictably with `--path`, `--field`, `--kind` and `--limit`.

## Command Semantics

| Command group | Semantics |
| --- | --- |
| `inspect <target>` | target detail + host context + manifest digest + available facet refs |
| `state/actions/events/timeline/fields/field-graph/field-summary/summary` | single facet drilldown |
| `dispatch` | mutation-capable declared action operation with owner-backed validation/admission |
| `snapshot` | bounded target bundle composition of facet refs |
| `capture` from 171 | event window / evidence capture, not inspect drilldown |
| `export evidence` | daemon lineage artifact -> canonical evidence package |

## CLI Output Rules

- stdout is `LiveCommandResult`.
- inspect drilldown artifacts use `LiveInspectArtifact(section=...)`.
- `dispatch` uses `LiveOperationFacet`.
- `export evidence` uses `CanonicalEvidencePackageRef`.
- artifact refs must be usable by `logix live export evidence --from`.
- gap must be structured, not hidden in stderr or human log.
- no `VerificationControlPlaneReport` in successful live output.
- no `repairHints`, `nextRecommendedStage`, CLI-owned verification verdict or session truth.

## Attachment Rule

All target-scoped commands:

- support `--attachment`.
- return `ambiguous-live-target` when `--attachment` is omitted and multiple attachments match.
- keep daemon response guard on `requestId + attachmentId + WebSocket connection`.
- include target coordinate and attachment id in `inputCoordinate`.

## Kind Filter

`events --kind <kind>` is a bounded filter over owner-backed event projection.

First-wave accepted kind values:

- `diagnostic`
- `process`
- `operation`
- `state`
- `field`

Unknown kind returns a structured user error. Missing producer returns `EvidenceGap(reason="unsupported-event-kind")`.

## Parser / Schema / Skill Tasks

Need to update together:

- `packages/logix-cli/src/internal/args.ts`
- `packages/logix-cli/src/internal/commandSchema.ts`
- `packages/logix-cli/src/schema/commands.v1.json`
- CLI command result contract tests
- public surface guard tests
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `skills/logix-cli`
- `skills/logix-best-practices`

## Root Command Guard

The following are forbidden as root commands:

```text
logix state
logix actions
logix events
logix timeline
logix fields
logix field-graph
logix field-summary
logix summary
```

They are allowed only under `logix live ...`.
