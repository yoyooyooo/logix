# Quickstart: O-005 默认 Full Cutover 验收

## 前置

- 分支: `impl/o005-unified-minimal-ir`
- 目录: 仓库根目录
- 运行方式: 一次性 `vitest run`（禁止 watch）

## 1. 运行最小回归集

```bash
pnpm --filter @logixjs/core vitest run \
  test/Runtime/Runtime.noImplicitFallback.test.ts \
  test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts \
  test/Contracts/Contracts.047.FullCutoverGate.fallback.test.ts
```

## 2. 预期结果

- `Runtime.noImplicitFallback`:
  - 无显式 `fullCutoverGateModeLayer` 也会在 fallback 场景失败（默认 full cutover 生效）。
- `Contracts.047.FullCutoverGate.trial`:
  - 显式 `trial` 下 gate 可通过，但 `fullyActivated=false`，并带可解释 `reason`。
- `Contracts.047.FullCutoverGate.fallback`:
  - `fullCutover` 下 fallback 必须失败，并可读取 `reason/evidence`。

## 3. 可选验证（类型）

```bash
pnpm --filter @logixjs/core typecheck:test
```

## 4. 迁移检查

- 若旧调用方依赖隐式 trial，请显式注入：

```ts
CoreKernel.fullCutoverGateModeLayer('trial')
```

- 同时消费失败对象上的 `reason/evidence` 字段用于诊断与日志。
