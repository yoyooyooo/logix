---
title: Public Submodules migration and import conventions
description: Choose stable import paths, avoid unsupported subpaths, and use a reusable migration template.
---

This page provides a reusable “import convention + migration template” for upgrading Logix package entry points, so teams can standardize imports and reduce regression risk.

## The 3 rules to remember

1. Only import from `@logixjs/<pkg>` or `@logixjs/<pkg>/<Concept>`. Only use subpath entry points explicitly allowed by docs (e.g. `@logixjs/form/react`, `@logixjs/sandbox/vite`).
2. Never import `@logixjs/*/internal/*`, and never bypass exports via “unapproved subpaths” (e.g. importing `dist/*` / `src/*` directly).
3. After migration, run verification: `pnpm verify:public-submodules`, and ensure `pnpm typecheck` / `pnpm lint` / `pnpm test` all pass.

## Keywords (≤5)

- **Public Submodule**: a stable concept entry point exported by a package (an importable contract unit).
- **Independent Entry Point**: an independent subpath entry (e.g. `@logixjs/form/react`, `@logixjs/sandbox/vite`).
- **Exports Policy**: the consolidation policy in `package.json#exports` (including blocking `internal` paths).
- **Verify Gate**: the structural governance check `pnpm verify:public-submodules`.
- **Promotion Path**: the path to “promote into a standalone package” when an entry grows enough to evolve independently.

## Common migration: old import → new import

> Examples below only show “entry shape changes”. If you import from the package root (`@logixjs/<pkg>`), you usually don’t need changes.

- `@logixjs/sandbox/client` → `@logixjs/sandbox/Client`
- `@logixjs/sandbox/service` → `@logixjs/sandbox/Service`
- `@logixjs/sandbox/vite` → `@logixjs/sandbox/vite` (kept; an Independent Entry Point)
- `@logixjs/test/vitest` → `@logixjs/test/Vitest`
- `@logixjs/domain/crud` → `@logixjs/domain/Crud`
- `@logixjs/query/react` → removed (this entry is no longer provided)

## Migration template (copy/paste)

```text
Title: <pkg> Public Submodules migration

Old imports:
- ...

New imports:
- ...

Prohibited:
- @logixjs/<pkg>/internal/*
- Any unapproved subpath bypass (e.g. dist/src direct imports)

Verification:
- pnpm verify:public-submodules
- pnpm typecheck
- pnpm lint
- pnpm test
```
