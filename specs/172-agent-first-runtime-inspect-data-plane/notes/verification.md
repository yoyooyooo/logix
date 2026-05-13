# 172 Verification Notes

本文件记录 172 实施后的验证证据。当前 `tasks.md` 的 work packets 已全部勾选；P1 rows 按 `Owner-backed or gap` 关闭，P2/future rows 保持 deferred 或 rejected。

## Expected proof families

- core runtime inspect projection tests
- logix-react browser adapter tests
- logix-cli parser/daemon/IPC tests
- multi-tab + concurrent request tests
- examples/logix-react Playwright live inspect E2E
- evidence export / workbench projection tests
- docs/skill/text sweep

## Runtime Inspect Coverage Harness

172 完成前必须补充本节真实验证证据。缺少本节时，不能宣称 172 已达到 Agent-first Runtime inspect data plane 终局。

Original 172 closure record, superseded by the post-178 and post-179 closure records below for current owner-backed counts:

- command: `rtk pnpm -C packages/logix-core test -- --run runtime-inspect-coverage.harness --reporter=dot`
- result: PASS, 1 file / 2 tests
- inventory schemaVersion: `runtime-inspect-coverage.v1`
- inventory digest: `runtime-inspect-coverage:8b448c87` from test helper `fnv1a32(stableStringify(inventory))`; the digest is evidence for this harness run, not an external source authority.
- inventory summary: 21 fact families; 8 owner-backed, 9 structured-gap, 2 deferred, 2 rejected.
- unmapped matrix rows count: 0 for `R172-001` through `R172-026`.
- unmapped current core fact families count: 0 in the current harness inventory; `RuntimeInternals`, `DebugSink`/`DevtoolsHub`, reflection, field-runtime and repoBridge live fact families are mapped to owner-backed output, structured gap, deferred owner or rejected/future row.
- structured gaps count by reason:
  - `missing-event-producer`: 1
  - `missing-operation-window`: 2
  - `missing-field-summary`: 1
  - `missing-field-owner-projection`: 2
  - `missing-latest-field-summary`: 1
  - `unsupported-event-kind`: 2
- P1 closure note: `WP-005`、`WP-006`、`WP-007` are closed under the spec's `Owner-backed or gap` rule. The CLI drilldown routes exist and missing event/timeline/summary/field producers return stable owner-attributed structured gaps; this does not claim full owner-backed event or field producer payloads are implemented.
- deferred rows count: 2 in current test inventory
- rejected/future rows count: 2 in current test inventory
- evidence package export proof refs:
  - `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts`
  - `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
  - `examples/logix-react/test/browser/live-real-carrier.playwright.ts`
- production source hygiene sweep:
  - command: `rtk rg -n "@172|R172-|matrixRow|matrixRowForSection|runtime-inspect-coverage@172" packages/logix-core/src packages/logix-cli/src packages/logix-react/src --glob '!**/node_modules/**' --glob '!**/dist/**'`
  - result: zero matches
- forbidden public surface sweep:
  - command: `rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection|\\blogix (state|actions|events|timeline|fields|field-graph|field-summary|summary)\\b" packages/logix-core/src packages/logix-cli/src packages/logix-react/src examples/logix-react/src --glob '!**/node_modules/**' --glob '!**/dist/**'`
  - result: zero matches
  - docs/spec/skill matches are negative-only explanations or flat-root rejection examples.

## 2026-05-03 Harness Asset Standardization

- Added [../../../docs/standards/harness-and-proof-assets-standard.md](../../../docs/standards/harness-and-proof-assets-standard.md).
- Linked the standard from docs root, standards root, runtime verification SSoT, guardrails, `AGENTS.md`, and `skills/logix-best-practices`.
- Moved test/DTO schema versions away from spec-numbered forms:
  - `runtime-inspect-coverage@172` -> `runtime-inspect-coverage.v1`
  - `live-inspect@172` -> `live-inspect.v1`
- React dev live browser adapter now answers `inspect.state` with owner runtime state via `LiveInspectArtifact(section="state" | "state-path")`.
- React dev lifecycle bindings can carry owner reflection manifests and module runtime projections. Browser adapter now answers `inspect.actions` with owner-backed `LiveManifestBindingRef` and uses reflection admission for `dispatch.declaredAction`; unknown actions return `operation.denied(noMutation=true)` before mutation.
- CLI daemon snapshot route now returns bounded `LiveInspectArtifact(section="snapshot")` composition. Multi-tab carrier tests use `capture.eventWindow` for browser operation routing and lineage export proof, keeping snapshot out of the old `LiveCapture` model.
- Inspect lineage risk `Q172-016` is drained: core owns facet metadata and source authority, while daemon lineage owns transport/request/connection isolation metadata. `export evidence` consumes the daemon lineage ref and maps inspect artifacts into canonical evidence; proof refs are `packages/logix-cli/test/Integration/live-daemon-multitab.contract.test.ts` and `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`.
- The remaining `Pressure` production-source sweep hits are existing concurrency/backpressure diagnostic names outside 172 inspect row/matrix helpers. They are not modified in this pass; future work touching that diagnostic owner should either justify them as stable backpressure vocabulary or rename them under the new standard.

## 2026-05-03 Runtime Counter Live Chain Dogfood

- Root `package.json` now exposes `pnpm cli` as the local TypeScript CLI entry: `tsx packages/logix-cli/src/bin/logix.ts`.
- Root cause for the tmux `%314` / `%315` connection symptom was not daemon startup. The daemon was ready, but the browser live adapter only sent `host.offer` on WebSocket open; when React runtime bindings appeared after open, targets were not refreshed. The lifecycle carrier now emits a binding-change event on bind/reset/dispose, and the browser adapter refreshes `host.offer`.
- `useModule(ModuleTag)` now registers a dev lifecycle live target. Before this, only Program/runtime acquisition paths were visible to live inspect, so `/runtime-counter` could attach while `AppCounter` stayed missing from target discovery.
- Browser self-verification used the stable direct URL `http://localhost:5175/runtime-counter`. The harness standard now requires browser-verification demos to expose a stable direct route before they are used as proof targets.
- Live status proof after opening the direct route:
  - attachment: `browser:dev-live:conn:7`
  - targets:
    - `runtime:AppDemoRuntime::runtime:1/module:AppDemoRuntime/instance:default`
    - `runtime:i2/module:AppCounter/instance:default`
- State inspect proof:
  - `logix live state --target runtime:i2/module:AppCounter/instance:default --attachment browser:dev-live:conn:7` returned `LiveInspectArtifact(section="state")` with preview `{ count: 0 }`.
  - `logix live state --path count` returned `valuePreview: 0`.
  - After a DOM click on the `加一` button through `agent-browser`, `logix live state --path count` returned `valuePreview: 1`, and the page text rendered `当前值 1`.
- Actions inspect proof intentionally returns a structured reflection gap for this ModuleTag target until reflection manifest binding is carried on this path:
  - gap code: `missing-live-manifest-binding`
  - owner: `reflection`

## 2026-05-04 Runtime Summary Projection Closure

- 178 promoted `operation-summary` and `field-converge` from structured gap rows to owner-backed summary projection rows.
- Runtime inspect coverage harness now records 21 fact families with 15 owner-backed, 2 structured-gap, 2 deferred and 2 rejected rows.
- Remaining structured gap reasons are only:
  - `unsupported-event-kind`: 2
- Summary owner proof refs:
  - `packages/logix-core/test/internal/LiveBridge/live-summary-projection.contract.test.ts`
  - `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
  - `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `logix live summary` still uses the existing 172/15 CLI grammar. The browser adapter and daemon are carriers only; summary facts derive from 175 operation windows and 176 field summaries.
  - stage class: `drilldown-only`

## 2026-05-04 Debug Event Source Bridge Closure

- 179 promoted `diagnostics` and `process-events` from structured gap rows to owner-backed runtime-live event windows.
- Runtime inspect coverage harness now records 21 fact families with 17 owner-backed, 0 structured-gap, 2 deferred and 2 rejected rows.
- DebugSink remains source material only. `LiveDebugSourceRecord` / `RuntimeDebugEventRef` source records enter the 175 runtime-live ledger only during explicit diagnostic/process reads.
- Browser adapter and daemon remain carriers. They preserve runtime-live `LiveOperationWindow` order, watermark, owner markers, gaps and canonical evidence export lineage without rewriting diagnostic/process facts.
- Public CLI grammar remains unchanged: `logix live events --target ... --kind diagnostic|process`.

Proof refs:

- `packages/logix-core/test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts`
- `packages/logix-react/test/internal/dev/live-browser-adapter-inspect.contract.test.ts`
- `packages/logix-cli/test/Integration/live-daemon-carrier.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`

179 verification commands:

- `rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-debug-source-bridge.contract.test.ts test/internal/LiveBridge/live-operation-ledger.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts`: PASS, 4 files / 13 tests
- `rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/live-browser-adapter-inspect.contract.test.ts`: PASS, 1 file / 10 tests
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts`: PASS, 1 file / 13 tests
- `rtk pnpm typecheck`: PASS, TypeScript no errors
- `rtk pnpm lint`: PASS, oxlint 0 warnings / 0 errors, eslint 0 warnings
- `rtk rg -n "Runtime\\.inspect|runtime\\.inspect|Runtime\\.devtools|runtime\\.devtools|Logix\\.Reflection" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/179-debug-event-source-bridge packages/logix-core/src packages/logix-react/src packages/logix-cli/src`: PASS, zero matches
- `rtk rg -n "[D]ebugSink.*owns|[C]LI.*owns|[d]aemon.*owns|[b]rowser adapter.*owns|[W]orkbench.*owns|[c]anonical evidence.*owns.*diagnostic|[c]anonical evidence.*owns.*process" docs/ssot/runtime/18-runtime-inspect-evidence-contract.md specs/179-debug-event-source-bridge`: PASS, zero matches
- `rtk rg -n "matrixRowForSection|matrixRow|R172-|179-debug|DebugSourceBridge|Probe|Witness|Pressure|TASK-|CAP-PRESS" packages/logix-core/src/internal/runtime/core/liveLedger.ts packages/logix-react/src/internal/dev/lifecycleCarrier.ts packages/logix-react/src/internal/provider/RuntimeProvider.tsx`: PASS for production process-name hygiene; only internal `isDebugSourceBridgeEvent` / `makeDebugSourceBridgeLayer` semantic names matched, no planning编号 or pressure/probe/witness naming.
- The broad hygiene pattern `raw DebugSink|raw ring|runtime handle|SubscriptionRef|verification verdict|repairHints|always-on.*ledger` has existing legitimate matches in verification-control-plane and runtime internals, so it is not used as a zero-match gate. The 179 output proofs assert absence on diagnostic/process owner windows and carrier/export artifacts.

Commands run:

- `rtk pnpm -C packages/logix-core test -- --run live-inspect-facet --reporter=dot`: PASS, 1 file / 3 tests
- `rtk pnpm -C packages/logix-core test -- --run runtime-inspect-coverage.harness --reporter=dot`: PASS, 1 file / 2 tests
- `rtk pnpm -C packages/logix-react test -- --run live-browser-adapter-inspect --reporter=dot`: PASS, 1 file / 4 tests
- `rtk pnpm -C packages/logix-cli test -- --run live-inspect-routes --reporter=dot`: PASS, 1 file / 3 tests
- `rtk pnpm -C packages/logix-cli test -- --run live-daemon-carrier --reporter=dot`: PASS, 1 file / 7 tests
- `rtk pnpm -C packages/logix-cli test -- --run live-daemon-multitab --reporter=dot`: PASS, 1 file / 5 tests
- `rtk pnpm -C packages/logix-cli test -- --run live- --reporter=dot`: PASS, 9 files / 37 tests
- `rtk pnpm -C packages/logix-core test -- --run live- --reporter=dot`: PASS, 13 files / 34 tests
- `rtk pnpm -C packages/logix-react test -- --run runtime-hot-lifecycle-projection --reporter=dot`: PASS, 1 file / 4 tests
- `rtk pnpm -C packages/logix-react test -- --run live-browser-adapter --reporter=dot`: PASS, 2 files / 9 tests
- `rtk pnpm -C examples/logix-react test:browser:live-dev-only-import`: PASS
- `rtk pnpm -C examples/logix-react test:browser:live-real-carrier`: PASS
- `rtk pnpm -C examples/logix-react exec tsx test/browser/playground-live-bridge-dogfood.playwright.ts`: PASS
- `rtk pnpm -C packages/logix-core typecheck`: PASS
- `rtk pnpm -C packages/logix-react typecheck`: PASS
- `rtk pnpm -C packages/logix-cli typecheck`: PASS
- `rtk rg -n "@172|R172-|matrixRow|matrixRowForSection|runtime-inspect-coverage@172|live-inspect@172" packages/logix-core/src packages/logix-cli/src packages/logix-react/src --glob '!**/node_modules/**' --glob '!**/dist/**'`: PASS, zero matches
- `rtk git diff --check -- ...`: PASS for touched 172/docs/skills/core/react files

Harness authority:

- [../implementation-details/runtime-inspect-coverage-harness.md](../implementation-details/runtime-inspect-coverage-harness.md)
- [../../../docs/standards/harness-and-proof-assets-standard.md](../../../docs/standards/harness-and-proof-assets-standard.md)
