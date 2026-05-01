# Contracts: CLI Verification Transport

This directory records implementation-facing contracts for `162`. Exact runtime report schema remains owned by `@logixjs/core/ControlPlane`.

## Contract 1: Public Command Surface

Allowed commands:

- `logix check`
- `logix trial`
- `logix compare`

Required proof:

- Help, parser and schema expose only these commands.
- Old toolbox commands remain rejected.

## Contract 2: CommandResult Transport

Input:

- command result inputs
- artifact outputs
- primary report output key

Output:

- `CommandResult`

Required proof:

- `primaryReportOutputKey` references a `VerificationControlPlaneReport` artifact.
- `CommandResult` does not become machine report authority.
- Artifact ordering is deterministic.

## Contract 3: Exact Rerun Coordinate

Input:

- command arguments
- Program entry
- evidence refs
- selection refs
- trial mode
- compare refs

Output:

- `CommandResult.inputCoordinate`

Required proof:

- Same command can be rerun from coordinate.
- Upgrade command can inherit relevant coordinate.
- Large or sensitive payloads use artifact ref or digest.

## Contract 4: Stdout Budget And Fallback

Input:

- primary report
- artifact outputs
- stdout budget

Output:

- deterministic stdout envelope
- truncation metadata
- file fallback when needed

Required proof:

- Small reports remain readable.
- Large reports are truncated predictably.
- Full report remains reachable through artifact refs.

## Contract 5: Evidence And Selection Roundtrip

Input:

- canonical evidence package
- optional DVTools selection manifest

Output:

- CLI evidence input model
- report/artifact/focus roundtrip

Required proof:

- Selection manifest remains hint-only.
- Selection artifact key matches canonical evidence artifact outputKey.
- CLI does not create a second evidence envelope.

## Contract 6: Compare Route

Input:

- before report ref
- after report ref
- optional evidence refs

Output:

- core-owned compare report

Required proof:

- CLI does not implement compare truth.
- Inadmissible inputs return core compare admissibility result or pre-control-plane input failure.
