# Quickstart: Form Canonical Error Carrier Cutover

```bash
pnpm exec vitest run packages/logix-form/test
```

```bash
pnpm typecheck
```

Expected:

- error tree 只承认 canonical leaf
- old string/raw leaf residue 不再是主线
