# Contracts: Runtime Control Plane Report Shell Cutover

本目录不生成 OpenAPI 一类外部接口合同。

这轮 contract 面只涉及内部稳定协议：

- `packages/logix-core/src/ControlPlane.ts`
  - `VerificationControlPlaneReport`
  - `VerificationControlPlaneRepairHint`
  - `VerificationControlPlaneFocusRef`
  - `VerificationControlPlaneArtifactRef`
- `packages/logix-cli/src/internal/result.ts`
  - CLI artifact output 到 control plane artifact ref 的映射
- `packages/logix-cli/src/internal/commands/check.ts`
- `packages/logix-cli/src/internal/commands/trial.ts`
- `packages/logix-cli/src/internal/commands/compare.ts`
  - stage-specific emit path

本波次 contract 只回答三件事：

1. single report shell
2. coordinate-first repair target
3. artifact-backed linking
