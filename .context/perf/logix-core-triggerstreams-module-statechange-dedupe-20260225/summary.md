# triggerStreams moduleStateChange dedupe perf evidence (Diagnostics=off)

- Command: `pnpm -C packages/logix-core exec vitest run test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts test/Process/Process.Trigger.ModuleStateChange.DedupePerfEvidence.off.test.ts`
- Source log: `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/vitest.module-statechange-dedupe-perf.log`
- Structured evidence: `.context/perf/logix-core-triggerstreams-module-statechange-dedupe-20260225/module-statechange-dedupe.perf-evidence.off.json`
- Behavior invariant: `legacyAccepted == optimizedAccepted == expectedAccepted` (no behavior regression).

This evidence is intended to validate hot-path dedupe behavior parity while exposing a reproducible local metric for legacy (`Ref.get + Ref.set`) vs optimized (`Ref.modify`) implementations under a diagnostics-off scenario.
