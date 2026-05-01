# Data Model: Logix Playground

## PlaygroundProject

Minimal public project declaration consumed by the Playground shell.

Fields:

- `id`: stable project id, URL-safe, unique in a registry.
- `files`: readonly map of file path to `PlaygroundFile`.
- `preview`: optional preview entry.
- `program`: optional Program entry using fixed `Program` and `main` exports.
- `capabilities`: preview/run/check/startup-trial capability flags.
- `fixtures`: minimal curated fixture data required by the project.

Validation rules:

- `id` must be deterministic and must not depend on random/time values.
- At least one of `preview` or `program` must exist.
- Every preview/program entry must reference an existing file.
- Program files must use fixed exports `Program` and `main`.
- Public declaration does not accept `programExport` or `mainExport`.
- Title, description, docs route, dependency catalog, generated-file policy and adapter config are consumer-local catalog or internal metadata, not v1 public contract.

Relationships:

- A registry owns many `PlaygroundProject` declarations.
- An open project creates one mutable workspace and derives `ProjectSnapshot` values.

## PlaygroundFile

Public source file declaration.

Fields:

- `language`: `ts`, `tsx`, `js`, `jsx`, `json`, `css`, `md` or package-approved extension.
- `content`: original content.
- `editable`: whether user can edit in Playground.

Validation rules:

- Path keys must be normalized POSIX-style paths.
- File paths must be unique inside a project.
- Hidden generated files are not public declaration entries; they are added by the internal snapshot builder and remain traceable to visible sources or project metadata.

Relationships:

- Materializes into `ProjectSnapshotFile`.

## PlaygroundWorkspace

Mutable in-memory state for one open Playground project.

Fields:

- `projectId`: owning project id.
- `revision`: monotonic integer revision.
- `files`: current map of file path to current source content.
- `dirtyFiles`: sorted file path set whose current content differs from original content.
- `activeFile`: current source tab path.
- `preview`: current `PreviewSession`.
- `program`: current `ProgramSession` summary, if any.

State transitions:

- `open(project)` -> revision `0`, clean files, initial preview idle/loading.
- `edit(path, content)` -> revision increments, dirty file set updates.
- `resetFiles()` -> revision increments, current files return to original content.
- `reloadPreview()` -> preview reset count increments and preview remounts from current revision.
- `runProgram(kind)` -> Program session enters running and records output/failure/report.

Validation rules:

- All consumer operations receive a `ProjectSnapshot` tied to a single revision.
- Preview and internal runner must not mutate workspace files directly.
- Workspace does not store an independent evidence ledger.

## ProjectSnapshot

Single execution coordinate derived from a workspace revision.

Fields:

- `projectId`: owning project id.
- `revision`: workspace revision.
- `files`: current visible file snapshots.
- `generatedFiles`: generated file snapshots, each traceable to visible source or project metadata.
- `previewEntry`: resolved preview entry, if available.
- `programEntry`: resolved Program entry, if available.
- `dependencies`: dependency versions required by preview/runtime execution.
- `fixtures`: fixture/mock material used by preview and runtime operations.
- `diagnostics`: `check` and `trialStartup` capability/options.
- `envSeed`: deterministic seed used for run/session correlation.

Validation rules:

- `revision` is monotonic per workspace.
- `envSeed` is deterministic for project id and explicit session seed.
- Preview adapter and internal runner must consume this object.
- Internal runner must not read original project files after a snapshot exists.
- Same-source proof means same `ProjectSnapshot`, not only same source text.

## ProjectSnapshotFile

Current source file value at a snapshot revision.

Fields:

- `path`: file path.
- `content`: current content.
- `originalContent`: original content when available.
- `revision`: workspace revision when this file value was produced.
- `hash`: stable digest of current content for comparison and summary.
- `editable`: copied from file metadata.

Validation rules:

- `hash` is deterministic for path and content.
- Generated snapshot files must retain trace metadata.

## PreviewSession

One isolated React preview lifecycle.

Fields:

- `sessionId`: deterministic id derived from project id plus reset count or explicit seed.
- `projectId`: project id.
- `revision`: `ProjectSnapshot` revision used by preview.
- `status`: `idle`, `loading`, `ready`, `failed`, `disposed`.
- `adapter`: internal preview adapter id, initially `sandpack`.
- `resetCount`: number of preview remounts.
- `viewport`: selected viewport descriptor.
- `theme`: selected theme.
- `strictMode`: boolean.
- `logs`: bounded ordered preview logs.
- `errors`: bounded preview compile/runtime errors.
- `mountedAt`: optional timestamp metadata.

State transitions:

- `idle` -> `loading` when preview mounts.
- `loading` -> `ready` after non-empty content renders.
- `loading|ready` -> `failed` on compile/runtime/iframe error.
- `ready|failed` -> `disposed` on reset or page close.

Validation rules:

- Preview failures must not crash the outer shell.
- Reset must clear captured errors/logs for the new session.
- Internal automated preview witnesses may replace the third-party iframe in tests, but they must derive state from the same `ProjectSnapshot` and must not become public project declaration fields.

## ProgramSession

One internal Logix Program operation over a `ProjectSnapshot`.

Fields:

- `runId`: stable id derived from project id, operation kind and sequence.
- `projectId`: project id.
- `revision`: `ProjectSnapshot` revision used by operation.
- `kind`: `run`, `check`, `trialStartup`.
- `status`: `idle`, `running`, `passed`, `failed`, `unavailable`.
- `durationMs`: operation duration metadata.
- `result`: bounded JSON-safe result projection for `run`.
- `report`: core `VerificationControlPlaneReport` for `check` or `trialStartup`.
- `failure`: optional classified failure.
- `logs`: bounded ordered worker logs.

Validation rules:

- `run` must not carry `VerificationControlPlaneReport` fields.
- `check` and `trialStartup` reports must come from core control plane.
- Scenario trial, replay and compare are unavailable in v1.
- Failure kind must be one of `compile`, `runtime`, `timeout`, `serialization`, `worker`, `unavailable`.

## DerivedPlaygroundSummary

Compact machine-readable projection for UI, tests and Agents.

Fields:

- `projectId`: project id.
- `revision`: snapshot revision.
- `changedFiles`: sorted file path list.
- `preview`: preview status summary.
- `programRun`: optional Program Run status summary.
- `check`: optional Check status summary.
- `trialStartup`: optional startup Trial status summary.
- `errors`: bounded user-visible error summaries.
- `truncated`: whether display omitted details due to budgets.

Validation rules:

- Summary is derived from workspace, snapshot, sessions and core reports.
- Summary must not be stored as an independent mutable truth source.
- Summary may reference core reports, but it must not redefine their schema.
- Summary must be JSON-safe and stable enough for tests after removing timing fields.
