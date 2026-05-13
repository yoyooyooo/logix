# Quickstart: Expert Verification Decouple

## 1. 先看哪些页面和路径

- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
- `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- `packages/logix-core/src/internal/reflection-api.ts`
- `packages/logix-core/src/internal/reflection/kernelContract.ts`
- `packages/logix-core/src/internal/reflection/fullCutoverGate.ts`
- `packages/logix-core/src/internal/observability/trialRun.ts`

## 2. 先回答哪些问题

1. 哪些能力属于 canonical route，哪些属于 expert route
2. 哪些 primitive 真正需要共享 owner
3. 哪些 `internal/reflection/** -> internal/observability/**` 边必须删除
4. 哪些 docs / ledger / tests 会因为 owner 改动而失效

## 3. 先跑哪些现状扫描

```bash
rg -n '../observability/|../../observability/|internal/observability/' \
  packages/logix-core/src/internal/reflection-api.ts \
  packages/logix-core/src/internal/reflection \
  -g '*.ts'

rg -n 'verifyKernelContract|verifyFullCutoverGate|Runtime\\.trial|Reflection\\.verify' \
  packages/logix-core/test \
  packages/logix-cli \
  packages/logix-sandbox \
  examples/logix \
  docs/ssot/runtime/09-verification-control-plane.md \
  -g '*.ts' -g '*.md'
```

## 4. 最小验证命令

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts \
  packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts

pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
```

## 5. 升级验证命令

仅当 shared primitive 抽取触及 canonical `Runtime.trial` backing 时，再跑：

```bash
pnpm typecheck
pnpm -C packages/logix-sandbox exec vitest run test/Client test/browser
```
