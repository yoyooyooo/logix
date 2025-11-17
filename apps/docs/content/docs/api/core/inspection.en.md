---
title: Module inspection
description: Manifest extraction and dependency preflight (trial run) APIs.
---

# Module inspection (Manifest and trial run)

When you treat a `Module` as a “deliverable asset” that evolves over time, beyond running it you typically need two additional capabilities:

- **Manifest**: export key module information (schema/actions/traits, etc.) into diffable JSON for CI and review.
- **Dependency preflight (trial run)**: assemble the module once within a controlled window and export actionable information (missing dependencies/config), so “why doesn’t the script exit / why did startup fail” is not guesswork.

## Export a manifest

```ts
import { writeFileSync } from 'node:fs'
import * as Logix from '@logix/core'

import { AppRoot } from './app.root.js'

const manifest = Logix.Reflection.extractManifest(AppRoot, {
  includeStaticIr: true,
  budgets: { maxBytes: 200_000 },
})

writeFileSync('dist/module-manifest.json', JSON.stringify(manifest, null, 2))
```

## Diff manifests (CI / breaking-change checks)

```ts
import * as Logix from '@logix/core'

const diff = Logix.Reflection.diffManifest(before, after, {
  // Optional: only focus on allowed meta keys to avoid CI noise
  metaAllowlist: ['owner', 'team'],
})

// diff.verdict: PASS | WARN | FAIL
```

## Controlled trial run (dependency preflight + evidence summary)

Trial run starts the module within a **controlled window**, then **closes the Scope** after the main flow finishes to finalize resources, and finally outputs a `TrialRunReport`:

- missing services / missing config (actionable)
- control-plane override evidence (explains “why this implementation was chosen”)
- optional event sequence (for diagnosis/replay; trim-able)

```ts
import { Effect } from 'effect'
import * as Logix from '@logix/core'
import { AppRoot } from './app.root.js'

const main = Effect.gen(function* () {
  const report = yield* Logix.Observability.trialRunModule(AppRoot, {
    // CI / reproducible runs: provide an explicit runId for comparability
    runId: 'run:commit-<sha>:app',
    buildEnv: { config: { FEATURE_FLAG_X: true } },

    diagnosticsLevel: 'light',
    maxEvents: 200,

    // Two timeouts: trial window + scope close/finalization
    trialRunTimeoutMs: 3_000,
    closeScopeTimeout: 1_000,

    budgets: { maxBytes: 500_000 },
  })

  console.log(report.ok, report.error?.code)
  console.log(report.environment?.missingServices, report.environment?.missingConfigKeys)
})

Effect.runPromise(main)
```

## Why `runId` and closing `Scope` must be explicit

- `runId` gives trial-run artifacts (reports/events) a stable identity, making comparisons reproducible across CI, machines, and time.
- A module may start long-lived listeners/background processes; the main process cannot safely infer “when it can exit”. Therefore the entry must **explicitly close the Scope** so finalizers can run, and provide explainable failures on timeout.

For a fuller “run / exit / finalize” mental model, see the `Runtime` doc page (`Core Concepts → Runtime`).
