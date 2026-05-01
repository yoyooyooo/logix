# Quickstart: Runtime Control Plane Report Shell Cutover

## Goal

验证 `runtime.check / runtime.trial / runtime.compare` 是否都回到同一 report shell，并且 repair hint 已切到 coordinate-first machine core。

## Suggested Validation Steps

1. 跑 core contract test

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts
```

2. 跑 CLI integration output contract tests

```bash
pnpm vitest run \
  packages/logix-cli/test/Integration/output-contract.test.ts \
  packages/logix-cli/test/Integration/check.command.test.ts \
  packages/logix-cli/test/Integration/trial.command.test.ts \
  packages/logix-cli/test/Integration/compare.command.test.ts
```

3. 跑 typecheck

```bash
pnpm typecheck
```

## Expected Outcome

- 所有 stage 输出都通过同一 control plane contract guard
- `kind` 是单一常量 `VerificationControlPlaneReport`
- `artifact.role` 不再存在
- `TrialReport` 不再拥有第二 shape
- `repairHints` 的 machine core 已按新 contract 对齐
