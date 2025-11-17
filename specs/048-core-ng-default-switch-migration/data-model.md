# Data Model: 048 切默认到 core-ng（迁移与回退口径）

## Entities

### DefaultKernelPolicy

- `defaultKernelId`: `"core-ng"`
- `override`: `{ kernelId: "core" | "core-ng" }`（显式指定）
- `mode`: `"fullCutover"`（默认必须 full cutover）

### RollbackPolicy

- `allowed`: `true`（显式回退允许）
- `implicitFallbackAllowed`: `false`
- `evidenceRequired`: `true`

### MigrationPlaybook

- `precheck`: `ReadonlyArray<string>`（必须包含 047 Gate）
- `switchSteps`: `ReadonlyArray<string>`
- `rollbackSteps`: `ReadonlyArray<string>`
- `evidencePaths`: `ReadonlyArray<string>`

### PerfEvidenceSet

- `matrixId`: `string`（suites/budgets 的 SSoT；before/after 必须一致）
- `matrixHash`: `string`（矩阵哈希；before/after 必须一致，保证可比性）
- `profile`: `string`（硬结论至少 `default`；`quick` 仅线索）
- `before`: paths（切默认前 core 默认）
- `after`: paths（切默认后 core-ng 默认）
- `diff`: paths
