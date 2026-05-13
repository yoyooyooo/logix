# Quickstart: Agent Debug Closure

This quickstart describes the intended implementation proof flow for 183. Commands are proof targets for the implementation wave; they are not all guaranteed to pass before 183 is implemented.

## Intended Agent Flow

1. Start the example dev host with the live adapter enabled.

```text
rtk pnpm -C examples/logix-react dev
```

2. Open a direct demo route that exposes a live Logix target.

```text
http://localhost:5173/live-bridge
```

If the final route differs, update this file and the browser proof tests in the same change.

3. Discover targets.

```text
rtk pnpm cli live status
rtk pnpm cli live targets --tree
```

4. Inspect Runtime owner facts.

```text
rtk pnpm cli live timeline --target <target> --limit 20
rtk pnpm cli live fields --target <target>
rtk pnpm cli live summary --target <target>
```

5. Trigger a declared action through a host interaction or CLI dispatch.

```text
rtk pnpm cli live dispatch --target <target> --action <declared-action>
```

6. Export diagnosis-ready evidence.

```text
rtk pnpm cli live export evidence --from <daemon-lineage-ref>
```

Expected evidence package:

- Runtime owner fact refs
- host adjunct refs or structured host gaps
- interaction linkage refs or admission/linkage gaps
- local profile summary refs or profile gaps
- redaction/degraded/disagreement markers
- no verification verdict
- no public `HostEvidence` or `HostAdjunctEvidence` artifact kind

## UI Did Not Update Diagnosis

Expected proof chain:

```text
declared action
  -> dispatch admission
  -> Runtime operation coordinate
  -> field semantic payload
  -> selector fingerprint / subscription ref
  -> render boundary ref or host gap
```

If any link is missing, the command must return a structured gap with owner and reopen bar. It must not guess component paths or infer host subscriptions from DOM text.

## Interaction Linkage Diagnosis

Expected proof chain:

```text
host interaction ref
  -> declared action admission
  -> txnSeq / opSeq / linkId
  -> operation artifact ref
  -> render linkage or gap
```

An interaction outside declared action admission remains provenance only. It cannot fabricate a Runtime operation.

## Local Profile Summary Flow

Profile summary is observation-only and local-only.

```text
rtk pnpm cli live profile start --target <target>
rtk pnpm cli live dispatch --target <target> --action <declared-action>
rtk pnpm cli live profile stop --target <target>
rtk pnpm cli live profile summary --target <target> --limit 20
```

Expected behavior:

- authorized capture returns a bounded summary linked by target/time/link refs
- disabled capture allocates no sample buffer
- unavailable, unauthorized, over-budget or cross-target requests return structured profile gaps
- raw samples do not become Runtime facts or timeline items

## Production Safety Flow

Use `examples/logix-react` as the business-project witness.

```text
rtk pnpm -C examples/logix-react test:bundle:production
```

Expected behavior:

- normal production imports do not pull dev/live/debug carrier modules
- proof output is deterministic
- failures list concrete bundle marker hits

## Focused Proof Commands

Core/runtime:

```text
rtk pnpm --filter @logixjs/core exec vitest run test/internal/LiveBridge/live-inspect-evidence-bridge.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts test/internal/LiveBridge/live-operation-ledger-disabled.guard.test.ts
```

React host:

```text
rtk pnpm --filter @logixjs/react exec vitest run test/internal/dev/live-browser-adapter-inspect.contract.test.ts test/RuntimeProvider/runtime-hot-lifecycle-host-cleanup.contract.test.tsx test/RuntimeProvider/runtime-hot-lifecycle-projection.contract.test.tsx
```

CLI/daemon:

```text
rtk pnpm --filter @logixjs/cli exec vitest run test/Integration/live-inspect-routes.contract.test.ts test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts
```

Dogfood:

```text
rtk pnpm -C examples/logix-react test:browser:live-real-carrier
rtk pnpm -C examples/logix-react test:bundle:production
```

Repository gates:

```text
rtk pnpm check:effect-v4-matrix
rtk pnpm typecheck
rtk pnpm lint
```

Final text sweeps:

- Run the public-surface rejection sweep from the 183 completion gate over this spec pack plus SSoT 18 and SSoT 15.
- Run the unresolved-marker sweep from the 183 completion gate over this spec pack.

The public-surface sweep may only return explicit rejection, guard-test or "not admitted" text. Any positive admission of the rejected namespace or host artifact names is a failure. The unresolved-marker sweep must treat [tasks.md](./tasks.md) checkboxes as implementation backlog, not unresolved planning placeholders.
