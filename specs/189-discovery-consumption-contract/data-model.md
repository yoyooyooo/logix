# Data Model: Discovery And Consumption Contract

This file names the stable coordination objects for 189. It is not a database model and does not own runtime report or live artifact payload schemas.

## Command Schema Mirror

**Purpose**: Derived machine-readable command grammar for Agent discovery.

**Fields**:

- `version`: schema version
- `commands`: public roots and task families
- `inputs`: required, optional and forbidden inputs per command family
- `resultEnvelope`: stdout envelope family and primary output key field
- `authorityRefs`: docs or owner contracts this mirror derives from
- `derived`: marker that schema is not owner truth

**Validation Rules**:

- root commands are only `check`, `trial`, `compare` and `live`
- no archived command vocabulary appears in active schema
- package schema and skill mirror match for command grammar and envelope fields

## Verification Consumption Recipe

**Purpose**: Stable procedure for reading verification command results.

**Steps**:

- parse stdout as `CommandResult`
- read `primaryReportOutputKey`
- select matching `artifacts[].outputKey`
- prefer artifact `file` over truncated `inline`
- consume report `verdict`, `nextRecommendedStage` and structured `repairHints`

**Validation Rules**:

- works for non-zero command exits when structured output exists
- does not parse human logs
- scheduling uses top-level report `nextRecommendedStage`
- repair routing does not require prose fields

## Live Consumption Recipe

**Purpose**: Stable procedure for reading live command results as evidence or gaps.

**Steps**:

- parse stdout as `LiveCommandResult`
- read `primaryLiveOutputKey`
- select matching live artifact, operation facet, evidence ref or gap
- treat live output as evidence only
- feed exported evidence into trial or compare before consuming repair hints

**Validation Rules**:

- must not read `verdict`, `repairHints`, `nextRecommendedStage` or `primaryReportOutputKey` from live output
- does not treat live evidence as verification report truth
- works for daemon unavailable and structured gap outputs

## Archived Command Vocabulary

**Purpose**: Deleted route names that must not appear in active public command contracts.

**Examples**:

- `describe`
- `--describe-json`
- `debug`
- `contract-suite`
- `transform.module`
- `trialrun`
- `ir.*`
- `logix-devserver`
- flat live roots such as root `status`, `capture`, `snapshot`, `wait` or `export`

**Validation Rules**:

- may appear only in explicit forbidden, rejected or archived context
- absent from schema command list
- guard tests reject execution where applicable

## Drift Check

**Purpose**: Cheap proof that schema, skill mirror, docs recipes and guard tests agree.

**Fields**:

- `packageSchemaRef`: package schema path
- `skillMirrorRef`: skill-local schema path
- `docsRefs`: docs SSoT pages used by recipes
- `guardTests`: package-level tests
- `textSweeps`: archived vocabulary and forbidden route sweeps

**Validation Rules**:

- fails on command grammar drift
- fails on primary output key field drift
- fails on live forbidden field drift
- does not require daemon/browser startup for schema-only checks

## Derived Authority Reference

**Purpose**: Link from a mirror or recipe back to its owner page.

**Fields**:

- `topic`: command grammar, verification report, live artifact, repair recipe or scheduling
- `authorityPath`: docs/SSoT/spec/skill path
- `scope`: what the reference owns

**Validation Rules**:

- mirrors must not become authority by omission
- docs recipes avoid duplicating payload truth
- changed owner law must update dependent mirrors in the same delivery
