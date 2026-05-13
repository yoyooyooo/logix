---
name: logix-cli
description: Use when an Agent needs to run Logix verification from shell or CI, consume DVTools or live-derived evidence, validate a Program entry, compare before/after reports, use logix live runtime debugging tasks, or test the Agent First CLI loop.
---

# logix-cli

Logix CLI is the Agent First shell route into two public lanes:

- verification lane: `logix check`, `logix trial --mode startup`, `logix compare`
- live lane: `logix live <task>`

Use verification commands to get machine-readable `VerificationControlPlaneReport` artifacts for code changes. Use live commands only to inspect an active runtime, run admitted live tasks, and export canonical evidence for a later verification command.

Prefer the package runner form:

```bash
npx @logixjs/cli <args>
```

If the package is installed locally or globally, `logix <args>` is equivalent.

## Machine Contract Files

This skill carries a copy of the CLI static command schema mirror for Agent discovery:

```text
references/commands.v1.json
```

Read that file before generating command lines or jq filters. It mirrors the package-published schema artifact, but the skill-local copy is the explicit path for Agents using this skill.

When answering users, refer to this schema as `references/commands.v1.json`. Do not expose implementation-specific filesystem locations.

The schema only describes command grammar and stdout envelope fields. It is a derived mirror, not the owner of runtime payload truth. Runtime payload schemas remain owner-defined by the primary artifact:

- verification commands: `VerificationControlPlaneReport`
- live commands: `LiveStatus`, `LiveTargetList`, `LiveInspectArtifact`, `LiveOperationFacet`, `LiveCapture`, `CanonicalEvidencePackage`, `EvidenceGap`, or `LiveTransportError`

## When To Use

- You changed Logix business code and need a fast self-check.
- You need to verify a `Program` entry from shell or CI.
- You have DVTools evidence or a selection manifest to feed back into Agent repair.
- You need runtime context from a live bridge before deciding what to repair.
- You need to export live-derived evidence and feed it into `trial` or `compare`.
- You need a before/after repair comparison.
- You are opening a subagent to validate CLI behavior.

Do not use this skill for runtime API authoring rules. Use `logix-best-practices` first for code generation.

## Kernel Release Gate Profile

When a user asks to absorb or run the kernel/CLI release gate profile, use existing CLI commands and proof files only. The profile is repo-local and lives in `specs/190-kernel-release-gate-profile`; it is not a public CLI feature.

Allowed profile inputs:

- `logix check`
- `logix trial --mode startup`
- explicit `logix compare`
- `logix live <task>` output that is later fed into trial or compare as canonical evidence
- package schema and skill mirror diff
- focused CLI contract tests
- active perf reports for touched hot-path rows
- text sweeps for rejected public vocabulary

Forbidden profile outputs:

- `logix challenge`
- public `KernelStabilityReport`
- live verdicts, live repair hints or live next-stage scheduling
- help-text based machine discovery
- Playground, DVTools, daemon or browser adapter owned runtime truth

Treat any release gate summary as a handoff artifact that points back to `CommandResult`, `LiveCommandResult`, `VerificationControlPlaneReport`, canonical evidence, perf reports and text sweep results. Do not present it as a runtime report schema.

## Command Surface

Only these public commands exist:

```bash
logix check
logix trial
logix compare
logix live <task>
```

Deleted public routes stay deleted: `describe`, `--describe-json`, `ir.*`, `contract-suite.run`, `transform.module`, `logix-devserver`, and `trialrun`.

Current live subcommands parsed by the CLI:

```text
live start
live stop
live status
live targets
live inspect <target>
live state
live actions
live events
live timeline
live fields
live field-graph
live field-summary
live summary
live capture
live snapshot
live wait
live dispatch
live profile start
live profile stop
live profile summary
live export evidence
```

`live inspect` is the exception to the `--target` pattern: it takes a positional target, for example `logix live inspect runtime:r/module:m/instance:i --runId inspect-1`. Other target-specific live tasks use `--target`.

Flat live roots are forbidden. Use the namespace form instead:

| Forbidden root | Use |
| --- | --- |
| `logix status` | `logix live status` |
| `logix state` | `logix live state` |
| `logix actions` | `logix live actions` |
| `logix events` | `logix live events` |
| `logix timeline` | `logix live timeline` |
| `logix fields` | `logix live fields` |
| `logix field-graph` | `logix live field-graph` |
| `logix field-summary` | `logix live field-summary` |
| `logix summary` | `logix live summary` |
| `logix capture` | `logix live capture` |
| `logix snapshot` | `logix live snapshot` |
| `logix wait` | `logix live wait` |
| `logix export` | `logix live export evidence` |
| `logix trigger` | `logix live dispatch` |

`trigger` is not public vocabulary; the live operation is `dispatch` and must map to declared action admission.

## Entry Rule

`--entry` must point to a `Program` export:

```bash
logix trial --runId demo --entry src/entry.ts#AppRoot --mode startup
```

`AppRoot` must be made with `Logix.Program.make(...)` and carry Logix runtime blueprint authority. Do not pass a `Module`, `Logic`, or fake object with only `_kind: "Program"`. Entry failures return a structured `CommandResult` error report with `nextRecommendedStage: null`.

## Normal Agent Loop

Use stable `runId` values and write artifacts under a predictable root. For fast repair feedback, rerun the same stage first:

```bash
npx @logixjs/cli check \
  --runId fix-001-check \
  --entry src/entry.ts#AppRoot \
  --outRoot .logix/runs

npx @logixjs/cli trial \
  --runId fix-001-trial \
  --entry src/entry.ts#AppRoot \
  --mode startup \
  --outRoot .logix/runs
```

Read stdout as `CommandResult`. Resolve `primaryReportOutputKey` against `artifacts[].outputKey`. Runtime-stage results select a `VerificationControlPlaneReport`; pre-control-plane gate failures select a transport error artifact with no stage, verdict, repair truth or scheduling authority. If an artifact is truncated or only has `file`, read that file; do not infer from the stdout preview.

Important fields:

- `ok`
- `inputCoordinate`
- `inputCoordinate.argvSnapshot.tokens`
- `primaryReportOutputKey`
- `artifacts[].outputKey`
- report `verdict`
- report `nextRecommendedStage`
- report `repairHints`
- transport error artifact `code` and `inputCoordinate` for pre-control-plane gate failures

Do not parse human logs for conclusions.

Primary report extraction:

```bash
result_json="$(npx @logixjs/cli trial --runId trial-001 --entry src/entry.ts#AppRoot --mode startup)"
primary_key="$(printf '%s\n' "$result_json" | jq -r '.primaryReportOutputKey')"
printf '%s\n' "$result_json" | jq --arg key "$primary_key" '.artifacts[] | select(.outputKey == $key)'
```

Report verdict and repair scheduling for runtime-stage results:

```bash
printf '%s\n' "$result_json" | jq -r --arg key "$primary_key" '
  .artifacts[]
  | select(.outputKey == $key)
  | .inline // empty
  | { verdict, nextRecommendedStage, repairHints }
'
```

If the selected artifact has `file`, prefer the file over `inline`:

```bash
report_file="$(printf '%s\n' "$result_json" | jq -r --arg key "$primary_key" '.artifacts[] | select(.outputKey == $key) | .file // empty')"
test -n "$report_file" && jq '{ verdict, nextRecommendedStage, repairHints }' "$report_file"
```

For a pre-control-plane gate failure, consume the selected transport error artifact only for error code and rerun coordinate. Do not treat it as a `VerificationControlPlaneReport`.

For a normal code edit, the first validation after repair is usually another `logix trial --mode startup` with the same entry and relevant refs. Prefer `inputCoordinate.argvSnapshot.tokens` when you need to reconstruct the same command shape. If you need a different `runId` to avoid overwriting artifacts, keep the validation inputs stable and only change `--runId`.

`nextRecommendedStage` is the only top-level scheduling authority. `repairHints[].upgradeToStage` can explain a local hint, but it must not override `nextRecommendedStage`.

## DVTools Evidence Loop

When DVTools exports canonical evidence and a selection manifest, pass them as inputs:

```bash
npx @logixjs/cli trial \
  --runId dvtools-fix-001 \
  --entry src/entry.ts#AppRoot \
  --mode startup \
  --evidence .logix/evidence/session-001 \
  --selection .logix/evidence/session-001/selection.json \
  --outRoot .logix/runs
```

`selection` is only a hint sidecar. It does not own evidence truth, report truth, or entry truth.

## Live Runtime Loop

Use `logix live <task>` when the Agent needs active runtime context or live-derived evidence. Prefer `npx @logixjs/cli live ...` unless a local `logix` binary is already installed.

The live connection shape is daemon-centered:

- Browser/dev host installs the dev-only React live adapter through the Vite plugin or `@logixjs/react/dev/live`.
- The browser adapter sends `host.offer` to the local daemon over WebSocket.
- CLI talks to the local daemon over IPC and reads targets, operation results, artifact refs or structured gaps.
- CLI, daemon and browser adapter are carriers only; they never own Runtime facts.
- Default transport locators are `LOGIX_LIVE_STATE_DIR` or `~/.logix/live`, `LOGIX_LIVE_HOST` or `127.0.0.1`, and `LOGIX_LIVE_PORT` or `8098`.

Task shapes are:

```bash
npx @logixjs/cli live start --runId live-001 --outRoot .logix/runs
npx @logixjs/cli live status --runId live-001 --outRoot .logix/runs
npx @logixjs/cli live targets --runId live-001 --tree --outRoot .logix/runs
npx @logixjs/cli live inspect runtime:r/module:m/instance:i --runId live-001 --outRoot .logix/runs
npx @logixjs/cli live state --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live state --runId live-001 --target runtime:r/module:m/instance:i --path count --outRoot .logix/runs
npx @logixjs/cli live actions --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live events --runId live-001 --target runtime:r/module:m/instance:i --kind operation --limit 20 --outRoot .logix/runs
npx @logixjs/cli live timeline --runId live-001 --target runtime:r/module:m/instance:i --limit 20 --outRoot .logix/runs
npx @logixjs/cli live timeline --runId live-001 --target runtime:r/module:m/instance:i --field total --limit 20 --outRoot .logix/runs
npx @logixjs/cli live timeline --runId live-001 --target runtime:r/module:m/instance:i --limit 20 --cursor <cursor.next> --outRoot .logix/runs
npx @logixjs/cli live summary --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live fields --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live field-graph --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live field-summary --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live capture --runId live-001 --target runtime:r/module:m/instance:i --window 500ms --outRoot .logix/runs
npx @logixjs/cli live snapshot --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live wait --runId live-001 --target runtime:r/module:m/instance:i --condition ready --timeout 5000 --outRoot .logix/runs
npx @logixjs/cli live dispatch --runId live-001 --target runtime:r/module:m/instance:i --action submit --payload '{"id":"a"}' --outRoot .logix/runs
npx @logixjs/cli live profile summary --runId live-001 --target runtime:r/module:m/instance:i --outRoot .logix/runs
npx @logixjs/cli live export evidence --runId live-001 --from capture:1 --outRoot .logix/runs
```

Read stdout as `LiveCommandResult`, not `CommandResult`. Resolve `primaryLiveOutputKey` against `artifacts[].outputKey`.

Important live fields:

- `ok`
- `inputCoordinate.task`
- `primaryLiveOutputKey`
- `artifacts[].kind`
- `artifacts[].outputKey`
- `artifacts[].reasonCodes`

Primary live artifact extraction:

```bash
live_json="$(npx @logixjs/cli live status --runId live-status-001)"
live_key="$(printf '%s\n' "$live_json" | jq -r '.primaryLiveOutputKey')"
printf '%s\n' "$live_json" | jq --arg key "$live_key" '.artifacts[] | select(.outputKey == $key)'
```

Select live targets from actual daemon output. Never build `--target` from a demo label, page text, fixture metadata, or source code comment. Only use target rows returned by `logix live targets --tree`.

```bash
targets_json="$(npx @logixjs/cli live targets --runId live-targets-001 --tree)"
printf '%s\n' "$targets_json" | jq -r '
  .artifacts[]
  | select(.outputKey == "liveTargets")
  | .inline.targets[]
  | [
      "target=runtime:\(.runtimeId)/module:\(.moduleId)/instance:\(.instanceId)",
      "attachment=\(.attachmentId)",
      "adapter=\(.adapterKind)",
      "url=\(.hostCoordinate.url // "")"
    ]
  | @tsv
'
```

Pick a target by exact runtime/module/instance fields only after those fields have been observed in `live targets --tree`. If an expected module id from route text, fixture metadata, or docs is not present in the target list, do not continue with that expected id. Print the real target rows and report `no matching attached target` instead.

Set the selection variables from a row printed by the previous command:

```bash
TARGET_RUNTIME_ID="${TARGET_RUNTIME_ID:?set from live targets output}"
TARGET_MODULE_ID="${TARGET_MODULE_ID:?set from live targets output}"
TARGET_INSTANCE_ID="${TARGET_INSTANCE_ID:?set from live targets output}"

target_row="$(
  printf '%s\n' "$targets_json" | jq -r \
    --arg runtime "$TARGET_RUNTIME_ID" \
    --arg module "$TARGET_MODULE_ID" \
    --arg instance "$TARGET_INSTANCE_ID" '
    .artifacts[]
    | select(.outputKey == "liveTargets")
    | .inline.targets[]
    | select(.runtimeId == $runtime and .moduleId == $module and .instanceId == $instance)
    | @base64
  ' | head -n 1
)"
```

Guard the selected row before running a target-specific command:

```bash
if [ -z "$target_row" ]; then
  printf '%s\n' "$targets_json" | jq -r '
    .artifacts[]
    | select(.outputKey == "liveTargets")
    | .inline.targets[]
    | [
        .runtimeId,
        .moduleId,
        .instanceId,
        .attachmentId,
        (.hostCoordinate.url // "")
      ]
    | @tsv
  '
  echo "no matching attached target; choose one of the rows above"
  exit 1
fi
```

Then decode the selected row and run the target-specific command:

```bash
target="$(printf '%s\n' "$target_row" | base64 --decode | jq -r '"runtime:\(.runtimeId)/module:\(.moduleId)/instance:\(.instanceId)"')"
attachment="$(printf '%s\n' "$target_row" | base64 --decode | jq -r '.attachmentId')"

npx @logixjs/cli live state \
  --runId live-state-001 \
  --target "$target" \
  --attachment "$attachment"
```

If multiple rows share the same `runtimeId/moduleId/instanceId`, pass `--attachment`. Without it, mutation-capable or target-specific live operations must return `ambiguous-live-target` instead of choosing a tab.

Read `LiveInspectArtifact` payloads through the primary artifact:

```bash
state_json="$(
  npx @logixjs/cli live state \
    --runId live-state-path-001 \
    --target "$target" \
    --attachment "$attachment" \
    --path programSession.projectId
)"

state_key="$(printf '%s\n' "$state_json" | jq -r '.primaryLiveOutputKey')"
printf '%s\n' "$state_json" | jq --arg key "$state_key" '
  .artifacts[]
  | select(.outputKey == $key)
  | {
      kind,
      section: .inline.section,
      view: .inline.facet.view,
      target: .inline.facet.target,
      payload: .inline.facet.payload,
      gaps: .inline.facet.gaps
    }
'
```

For `state --path`, the useful value is usually:

```bash
printf '%s\n' "$state_json" | jq -r --arg key "$state_key" '
  .artifacts[]
  | select(.outputKey == $key)
  | .inline.facet.payload.valuePreview
'
```

For a structured live gap:

```bash
printf '%s\n' "$state_json" | jq --arg key "$state_key" '
  .artifacts[]
  | select(.outputKey == $key)
  | .inline.facet.gaps // .inline
'
```

Timeline cursor continuation must read the cursor from the `LiveInspectArtifact` payload path, not from artifact top-level inline:

```bash
timeline_json="$(
  npx @logixjs/cli live timeline \
    --runId live-timeline-001 \
    --target "$target" \
    --attachment "$attachment" \
    --limit 20
)"

timeline_key="$(printf '%s\n' "$timeline_json" | jq -r '.primaryLiveOutputKey')"
cursor_next="$(printf '%s\n' "$timeline_json" | jq -r --arg key "$timeline_key" '
  .artifacts[]
  | select(.outputKey == $key and .kind == "LiveInspectArtifact")
  | .inline.facet.payload.timeline.cursor.next // empty
')"

if [ -n "$cursor_next" ]; then
  npx @logixjs/cli live timeline \
    --runId live-timeline-continued-001 \
    --target "$target" \
    --attachment "$attachment" \
    --limit 20 \
    --cursor "$cursor_next"
fi
```

Do not read `cursor.next` from `.inline.cursor.next`. Do not construct raw watermark JSON. Do not use `--since`, `--until`, `--before`, `--after` or `--after-watermark`. Timeline is live inspection output, not a verification verdict.

172 inspect artifacts use `LiveInspectArtifact(section=...)`:

| Section | Route |
| --- | --- |
| `target-detail` | `logix live inspect <target>` |
| `state` / `state-path` | `logix live state --target ... [--path ...]` |
| `actions` | `logix live actions --target ...` |
| `events` | `logix live events --target ... [--kind ...]` |
| `timeline` | `logix live timeline --target ... [--field ...] [--limit ...] [--cursor ...]` |
| `summary` | `logix live summary --target ...` |
| `fields` | `logix live fields --target ...` |
| `field-graph` | `logix live field-graph --target ...` |
| `field-summary` | `logix live field-summary --target ...` |
| `snapshot` | `logix live snapshot --target ...` |

Owner rules:

- `actions`, `dispatch` and static summary must cite owner-backed `LiveManifestBindingRef`; do not infer dispatchability from an action name alone.
- timeline `stateAfter` must be true post-event state or a structured gap; do not accept latest state as historical `stateAfter`.
- timeline `--cursor` is an opaque same-query continuation token. Do not decode it, construct raw watermark JSON, or treat ordinary timeline reads as evidence leases.
- `field-graph` must be fieldPath-keyed semantic adjacency; do not accept raw `nodes[] / edges[] / from / to` graph dumps.
- Missing runtime hooks, redaction, unsupported kind and over-budget results must be structured gaps, not stderr prose.
- `profile summary` is an implemented local-only adjunct route carried by `LiveCapture(captureKind="profile")`. It may return a live artifact or gap, but it is not Runtime truth and must not be used as an owner-backed repair conclusion.
- React host evidence is implemented only as adjunct sidecars over existing live artifacts and canonical evidence. Do not invent `HostEvidence` or `HostAdjunctEvidence` public artifact kinds.

`LiveCommandResult` must not contain `primaryReportOutputKey`, `repairHints`, `nextRecommendedStage`, or verification `verdict`. Live output can provide repair clues such as target coordinates, operation denial facets, evidence gaps, deferred profile summaries, and canonical evidence packages. Repair advice only becomes authoritative after live-derived evidence is fed into `logix trial` or `logix compare` and a `VerificationControlPlaneReport` returns `repairHints`.

Live evidence handoff:

```bash
npx @logixjs/cli live export evidence \
  --runId live-export-001 \
  --from capture:1 \
  --outRoot .logix/runs

# Use the exported canonical evidence package as an evidence directory.
# If the live result is inline-only, materialize the package first.
npx @logixjs/cli trial \
  --runId live-trial-001 \
  --entry src/entry.ts#AppRoot \
  --mode startup \
  --evidence .logix/evidence/live-export-001 \
  --outRoot .logix/runs
```

When materializing inline live export, write the canonical evidence package under the evidence directory shape expected by the current project, then pass that directory to `--evidence`. Keep the package id, artifact output keys, and gap/facet ids stable.

## Runtime Inspect Coverage

Current runtime inspect support covers target, state, action manifest, dispatch validation, snapshot, event window, timeline, operation summary, field list, field graph, field summary, diagnostics, process events, static summary and evidence export.

Use this smoke check to confirm the live carrier is reachable:

```bash
npx @logixjs/cli live status --runId coverage-smoke
```

Expected output is a `LiveCommandResult` with a `LiveStatus` artifact. A stopped daemon, missing browser attachment, unsupported host operation or redacted payload should appear as structured status or gap data, not as prose-only stderr.

Current limits: React host adjunct evidence and local profile summary are implemented as adjunct/local-only evidence, not public Runtime truth owners. Browser deep profile and mutation debug are not public CLI evidence routes.

## Compare Loop

`compare` is a closure proof tool. It is not required after every repair. Use it when you need to prove that an after report closes a known before report under comparable inputs:

```bash
npx @logixjs/cli compare \
  --runId fix-001-compare \
  --beforeReport .logix/runs/trial/before/trialReport.json \
  --afterReport .logix/runs/trial/after/trialReport.json \
  --outRoot .logix/runs
```

Use `compare` for:

- spec or CI closure where before/after evidence must be auditable
- fixing a known failure family such as Program assembly, source/declaration, dependency, lifecycle, or admissibility
- guarding against accidental input drift across entry, config, evidence, environment, declaration digest, scenario plan, or artifact refs
- handoff to another Agent that needs a machine-checkable closure record

Rerun `trial` without `compare` is enough for:

- local fast feedback
- exploratory repair where no before report is being claimed closed
- deliberate broader refactor where the Agent intentionally changed the verification scope

When the verification scope intentionally changes, start a new baseline instead of forcing old before/after reports through compare. In the final note, state which input changed and why the new baseline is the right proof target.

The compare result is authoritative only through the `VerificationControlPlaneReport` artifact. `INCONCLUSIVE` usually means the reports are not admissible for closure, not that the repair failed.

## Scenario Boundary

Current successful trial mode is:

```bash
npx @logixjs/cli trial --mode startup
```

`trial --mode scenario` is reserved until a core-owned scenario executor lands. Treat scenario mode as structured failure for now.

## Subagent Verification Prompt

Use this prompt when delegating CLI validation:

```text
Read the logix-cli skill and its `references/commands.v1.json` schema copy. Verify the Logix CLI Agent First loop for a Program entry from the user's project. Use `npx @logixjs/cli` unless a local `logix` binary is already installed. Run check and trial startup with stable runId values and --outRoot .logix/runs. Inspect stdout CommandResult. For runtime-stage results, inspect the primary VerificationControlPlaneReport artifact; for pre-control-plane gate failures, inspect the selected transport error artifact and confirm it has no stage, verdict, repair truth or scheduling authority. If live runtime behavior is in scope, run representative `npx @logixjs/cli live` inspect drilldown routes such as state/actions/events/timeline/fields/field-graph and confirm stdout is LiveCommandResult with LiveInspectArtifact or structured gap, without repairHints, nextRecommendedStage, verdict, or primaryReportOutputKey. Remember that `live inspect` takes positional `<target>`, while other target-specific live tasks use `--target`. Confirm no old public CLI route or flat live root is needed. Do not modify files unless explicitly asked. In the user-facing answer, mention only public commands and `references/commands.v1.json`.
```
