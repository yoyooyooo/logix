# Quickstart: Form Active Shape Locality Cutover

```bash
pnpm exec vitest run packages/logix-form/test
```

```bash
pnpm typecheck
```

Expected:

- reorder / replace 后 continuity 仍稳定
- active exit 后不再残留 pending/blocking
