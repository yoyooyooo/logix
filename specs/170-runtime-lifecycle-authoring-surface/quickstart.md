# Quickstart: Runtime Lifecycle Authoring Surface

## Purpose

Use this file to execute the planning, implementation, and verification loop for `170-runtime-lifecycle-authoring-surface`.

## Read First

1. [spec.md](./spec.md)
2. [plan.md](./plan.md)
3. [contracts/README.md](./contracts/README.md)
4. [data-model.md](./data-model.md)
5. [research.md](./research.md)
6. [discussion.md](./discussion.md)
7. [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
8. [../../docs/ssot/runtime/03-canonical-authoring.md](../../docs/ssot/runtime/03-canonical-authoring.md)
9. [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)

## Implementation Entry Gates

Before code changes:

1. Confirm [discussion.md](./discussion.md) has no Must Close blockers.
2. Confirm old lifecycle public routes are treated as forward-only removals.
3. Confirm `BoundApiRuntime.ts` large-file handling follows the decomposition brief in [plan.md](./plan.md#decomposition-brief).
4. Capture or define a perf baseline plan under `specs/170-runtime-lifecycle-authoring-surface/perf/`.
5. Confirm no compatibility alias or replacement namespace is planned.

## Suggested Focused Tests

Core readiness and run ordering:

```bash
rtk pnpm -C packages/logix-core test -- Runtime/ModuleRuntime/ModuleRuntime.InitGate.test.ts Runtime/Lifecycle/Lifecycle.test.ts Logic/LogicPhaseAuthoringContract.test.ts
```

Internal lifecycle substrate and diagnostics:

```bash
rtk pnpm -C packages/logix-core test -- internal/Runtime/Lifecycle Runtime/Lifecycle
```

React Provider observation:

```bash
rtk pnpm -C packages/logix-react test -- RuntimeProvider/runtime-provider-onError.test.tsx
```

Public type surface and contract tests once added:

```bash
rtk pnpm -C packages/logix-core test -- Contracts/LogicLifecycleAuthoringSurface.contract.test.ts
rtk pnpm -C packages/logix-core typecheck
```

## Workspace Quality Gates

Run after implementation stabilizes:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

If core Effect usage changes, also run:

```bash
rtk pnpm check:effect-v4-matrix
```

## Performance Evidence

Collect only when the branch is performance-comparable. For the current 2026-05-01 dirty mixed-feature worktree, collection is intentionally deferred and no performance pass or regression claim is made.

When the branch is stable enough to compare, collect the before baseline before changing runtime startup / close behavior:

```bash
rtk pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/before.<sha>.<envId>.default.json
```

After implementation on a comparable branch:

```bash
rtk pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/170-runtime-lifecycle-authoring-surface/perf/before.<sha>.<envId>.default.json --after specs/170-runtime-lifecycle-authoring-surface/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/170-runtime-lifecycle-authoring-surface/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json
```

Required focus areas:

- instance creation without readiness
- instance creation with one readiness requirement
- instance creation with multiple readiness requirements
- readiness failure diagnostics
- returned run effect scheduling after readiness
- runtime close and Scope finalizer execution
- diagnostics disabled path

## Text Sweep

Old lifecycle public family and replacement-family sweep:

```bash
rtk rg -n "\\$\\.lifecycle|onInitRequired|onStart|onDestroy|onError|onSuspend|onResume|onReset|\\$\\.startup|\\$\\.ready|\\$\\.resources|\\$\\.signals" docs/ssot docs/standards specs packages examples skills
```

Required classification for every active hit:

- `removed-public`
- `internal-only`
- `negative-only`
- `archived`

Public success-path readiness sweep:

```bash
rtk rg -n "\\$\\.readyAfter" docs/ssot docs/standards specs packages examples skills
```

## Acceptance Checklist

- Public authoring exposes `$.readyAfter(effect, { id?: string })`.
- Runtime instance ready status is reached after registered readiness effects succeed.
- Public authoring exposes no lifecycle namespace and no replacement phase family.
- Readiness requirements execute in order and block ready status.
- Readiness failure fails acquisition and emits stable diagnostics.
- Returned run effect starts after readiness and does not block ready status.
- Dynamic cleanup uses Scope finalizers.
- RuntimeProvider observation stays observation-only.
- Platform / host signals stay outside ordinary Logic authoring.
- Text sweep classifications are complete.
- Performance evidence is either comparable and attached, or explicitly deferred with reason and no performance claim.
- SSoT, standards, specs, examples, skills, and tests agree.
