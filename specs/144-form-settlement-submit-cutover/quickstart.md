# Quickstart: Form Settlement Submit Cutover

```bash
pnpm exec vitest run packages/logix-form/test
```

```bash
pnpm typecheck
```

Expected:

- submit gate 只围绕单一 `submitAttempt`
- decoded payload 不进入第二状态树
