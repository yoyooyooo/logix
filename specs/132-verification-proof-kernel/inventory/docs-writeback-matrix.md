# Docs Writeback Matrix

| File | Role | Change Required |
| --- | --- | --- |
| `docs/ssot/runtime/09-verification-control-plane.md` | SSoT | 继续明确 proof-kernel 与 canonical / expert adapter 的边界 |
| `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md` | legacy ledger | 若 canonical adapter 拆分路径变化，更新 backing 说明 |
| `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md` | legacy consumer matrix | 保持 canonical route 与 expert route 的最终分类一致 |
| `specs/131-expert-verification-decouple/inventory/*.md` | previous-wave ledger | 若第二波压缩改变 owner 描述，同步修正 |

## Current Snapshot

### 2026-04-08

- `09-verification-control-plane.md` 已经写入 proof-kernel 与 adapter 分层的第一版说明
- `130` ledger 已经写入 proof-kernel 第一波事实
- `132` 需要在 canonical adapter 进一步拆分后，补充第二波描述

## Execution Snapshot

### 2026-04-08

- 当前待回写点聚焦在 “canonical adapter 已拆出 `trialRunEnvironment.ts` 与 `trialRunErrors.ts`”
- `docs/ssot/runtime/09-verification-control-plane.md` 已补第二波 canonical adapter 压缩说明
- `specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}` 已补第二波 canonical adapter 事实
- `specs/131-expert-verification-decouple/inventory/docs-writeback-matrix.md` 已注明 `132` 接手第二波压缩
- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
  - PASS
- `pnpm typecheck`
  - PASS
