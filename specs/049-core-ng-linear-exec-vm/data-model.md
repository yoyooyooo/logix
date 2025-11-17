# Data Model: 049 core-ng 线性执行 VM（Exec VM）

## Entities

### ExecIR

- `execIrVersion`: `string`（schema 版本，用于 AOT-ready；例如 `converge_ir_v1`）
- `execIrHash`: `string`（稳定 hash，用于对比/缓存/证据引用）
- `instructionStream`: `Int32Array | Uint32Array`（线性指令流，opcode/operand）
- `accessorTable`: `ReadonlyArray<unknown>`（预编译访问器/segments 表；运行期不做 split）
- `bitsets`: `ReadonlyArray<Uint32Array>`（dirty/coverage/dep 等 bitsets；复用 buffer）
- `buffers`: `ReadonlyArray<TypedArray>`（复用的临时 buffer：plan、queue、scratch）
- `summary`: `unknown`（Slim 可序列化摘要，用于 evidence/light/full；off 不输出）

### ExecVMRunEvidence

- `hit`: boolean（是否命中 Exec VM 路径）
- `reasonCode`: string（未命中/降级原因码：缺失能力/禁用/预算等；仅 light/full，要求稳定枚举码）
- `reasonDetail`: `string | undefined`（可选补充信息；仅 light/full）
- `budget`: `{ decisionMs: number; execMs: number; exhausted: boolean }`（可选摘要）

### PerfEvidenceSet

- `matrixId`: `string`
- `matrixHash`: `string`
- `profile`: `'default' | 'soak' | 'quick' | string`
- `envId`: `string`（用于保证可比性；建议从 report `meta.env` 归一化得出）
- `node`: `{ before: string; after: string; diff: string }`
- `browser`: `{ before: string; after: string; diff: string }`

## Relationships

- ExecIR 在 program generation 生命周期内构建与复用；ExecVMRunEvidence 引用 ExecIR 的 `execIrHash/summary`。
- PerfEvidenceSet 为“可合入/可扩面/可进入 047 Gate”的硬证据。
