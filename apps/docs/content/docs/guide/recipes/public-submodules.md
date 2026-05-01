---
title: Public submodules
description: Import only stable package roots and explicitly supported public subpaths.
---

Use only package roots and explicitly supported public subpaths.

## Rules

1. Import from `@logixjs/<pkg>` or an explicitly supported public subpath.
2. Do not import `internal/*`, `src/*`, or `dist/*` paths.
3. After migration, verify the public import surface with repository checks.

## Typical replacements

- `@logixjs/domain/crud` → `@logixjs/domain/Crud`

## Verification

Run:

```bash
pnpm verify:public-submodules
pnpm typecheck
pnpm lint
pnpm test
```
