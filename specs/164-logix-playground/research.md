# Research: Logix Playground

## Decision 1: `packages/logix-playground` owns product surface

**Decision**: Create `@logixjs/playground` as the user-facing shell-first Playground package. Its public contract is `PlaygroundPage` plus minimal project/registry declaration helpers. File model, snapshot builder, preview adapter, runner and summary derivation stay internal.

**Rationale**: Docs and examples need one reusable product surface. Putting it in `@logixjs/sandbox` would mix UI/product contracts with worker transport. Keeping it app-local inside `examples/logix-react` would block later docs reuse.

**Alternatives considered**:

- Put Playground in `@logixjs/sandbox`: rejected because sandbox must remain transport-only and must not export product UI, registry or result contracts.
- Keep Playground in `examples/logix-react`: rejected because docs would copy shell, panels and adapter wiring.
- Put Playground directly in `apps/docs`: rejected because examples proof would not dogfood the final package boundary.
- Publicly export `FileModel / ProgramEngine / PreviewAdapter / Evidence`: rejected because no second consumer proves these nouns need public status, and they would consume compatibility budget before the proof exists.

## Decision 2: Use Sandpack as default preview/edit adapter

**Decision**: Use `@codesandbox/sandpack-react` as the first internal preview/edit adapter behind `@logixjs/playground` shell.

**Rationale**: Sandpack already provides React-oriented in-browser code editing and live preview primitives such as provider/editor/preview composition, dependency configuration, bundling/runtime error display and local dependency handling. These are preview/editor concerns, not Logix diagnostic authority. The Logix package keeps `ProjectSnapshot` and runtime operations behind the shell contract.

**Alternatives considered**:

- Build preview bundling and editor from scratch: rejected for v1 because it duplicates mature preview infrastructure and delays the Logix-specific proof.
- Make Sandpack project config the public Playground contract: rejected because it would make a third-party engine the fact source for Logix examples.
- Use only iframe + Vite local route: rejected because it does not provide a portable docs package surface or source-edit loop.

## Decision 3: Shared file model is the central state

**Decision**: `ProjectSnapshot` is the single execution coordinate. It contains current files, generated files, resolved entries, dependencies, fixtures, diagnostic options and deterministic env seed. Preview adapter and internal runner consume snapshots from this store.

**Rationale**: The core closure requirement is that React preview and Program Run/Check/Trial use the same current files. A shared file store makes hidden duplicate source state testable and rejectable.

**Alternatives considered**:

- Let Sandpack own source state and query it when Program runs: rejected because the runtime path would depend on preview engine internals.
- Keep separate source state for preview and Program diagnostics: rejected by spec because it breaks same-source proof.
- Treat source tabs as read-only reflection of bundled files: rejected because edit propagation is a closure witness.
- Synchronize only file text: rejected because preview and runtime execution could still diverge through dependencies, fixtures, generated files, entry resolution or diagnostic options.

## Decision 4: Internal runner is Logix-owned and transport-backed

**Decision**: Runtime execution belongs to internal `@logixjs/playground` runner code. Its default implementation uses `@logixjs/sandbox` transport to compile/run wrapper code for `Runtime.run`, `Runtime.check` and `Runtime.trial(mode="startup")`.

**Rationale**: The package needs a Logix-owned result/diagnostic boundary while reusing browser worker isolation. The transport can stay narrow while the internal runner maps `ProjectSnapshot` to run/check/startup-trial operations.

**Alternatives considered**:

- Add public `RUN_EXAMPLE`, `RUNTIME_CHECK`, `RUNTIME_TRIAL` commands to sandbox: rejected because it creates a public worker action family around Playground product intents.
- Export public `ProgramEngine`: rejected because it mirrors runtime faces into a second public product API and conflicts with the app-local runner boundary frozen by `163`.
- Run Program directly in the outer docs page: rejected because failures and user code would not be isolated from the shell.
- Use Sandpack runtime as the diagnostic executor: rejected because Logix report truth must come from core runtime and control plane.

## Decision 5: Run result and Trial report stay shape-separated

**Decision**: Program Run returns an internal bounded app-local projection. Check/startup-Trial return core `VerificationControlPlaneReport`. UI panels and derived summaries must preserve this distinction.

**Rationale**: `Runtime.run` is result face. `Runtime.trial` is diagnostic run face. Users and Agents need to compare both, but the shapes must not merge.

**Alternatives considered**:

- Wrap both into one Playground report schema: rejected because it creates a second report truth.
- Show only Trial for Program examples: rejected because docs examples also need user-facing business results.
- Reuse Trial report fields in Run projection: rejected because it blurs report authority.
- Make Run projection a named public contract: rejected because `163` already keeps Run projection app-local.

## Decision 6: First proof uses curated example projects

**Decision**: Register 1 to 2 curated projects from `examples/logix-react`. At least one project must extract shared logic into visible source used by both React preview and internal runner.

**Rationale**: Full demo migration is a separate grooming effort. A curated proof can validate the package boundary, `ProjectSnapshot`, preview behavior, Program diagnostics and docs-ready consumption without rewriting the whole gallery.

**Alternatives considered**:

- Migrate all examples now: rejected because it mixes proof of architecture with large example taxonomy cleanup.
- Use artificial tiny examples only inside the package: rejected because it would not prove integration with real `@logixjs/react` usage.
- Reuse `examples/logix-sandbox-mvp` directly: rejected because it contains old experiment UI and old result shapes.

## Decision 7: Docs integration is a consumer contract first

**Decision**: This spec proves docs readiness by exposing a shell consumption API over the same curated project authority or a generated index from it. Full `apps/docs` integration is deferred until example taxonomy is cleaned up.

**Rationale**: The user wants to land the Playground package first and then integrate docs. The first proof should make docs integration boring: import shell, pass registry, open `/playground/:id`.

**Alternatives considered**:

- Implement docs integration first: rejected because it would lock docs around an unproven package.
- Leave docs shape undefined: rejected because the package could drift into an examples-only toy.
- Allow `docsPlaygroundRegistry` to reauthor the same project ids: rejected because it creates a second registry truth.

## Decision 8: Evidence is compact and machine-readable

**Decision**: A derived Playground summary can summarize project id, changed files, preview status, Run status, Check/startup-Trial status and bounded user-visible errors. It references full core reports without redefining them and is not stored as an independent mutable ledger.

**Rationale**: Agents need to know whether source changed, preview passed and Program diagnostics passed. The evidence should be small enough for docs/tests while leaving report authority in core.

**Alternatives considered**:

- Store raw traces by default: rejected because raw trace compare is out of scope.
- Make the evidence the new report schema: rejected because `VerificationControlPlaneReport` already owns diagnostic truth.
- Store `PlaygroundEvidence` as workspace state: rejected because it would drift from preview session, Run projection and core reports.

## Decision 9: Performance proof follows actual risk

**Decision**: Require browser render/reset and bounded panel proofs. Require runtime perf collection only if implementation changes core runtime/sandbox protocol/React host behavior.

**Rationale**: This spec should not touch scheduler or transaction hot paths. The real v1 risk is unbounded preview/editor/worker envelope behavior and shell rendering failure.

**Alternatives considered**:

- Run full runtime perf suite for package UI work: rejected because it does not measure the introduced risk.
- Skip performance evidence: rejected because Playground adds user-visible execution and preview budgets.
