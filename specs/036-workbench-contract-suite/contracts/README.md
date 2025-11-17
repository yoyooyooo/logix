# Contracts: 036 Workbench Contract Suite（Integrated Verdict / Context Pack）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/spec.md`

本目录固化 036 的治理层对外契约（仅用于验收/CI/Agent 工具面，不要求 runtime 热路径承担任何额外成本）：

- `schemas/contract-suite-verdict.schema.json`：`ContractSuiteVerdict@v1`（PASS/WARN/FAIL + reasons + per-artifact 状态）
- `schemas/contract-suite-context-pack.schema.json`：`ContractSuiteContextPack@v1`（给 Agent 的最小事实包）

复用（单一事实源，避免重复定义）：

- Manifest/StaticIR/TrialRunReport/Diff：`specs/025-ir-reflection-loader/contracts/schemas/*`
- EvidencePackage：`specs/020-runtime-internals-contracts/contracts/schemas/runtime-evidence-package.schema.json`
- JsonValue 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- 可序列化错误摘要：`specs/016-serializable-diagnostics-and-identity/contracts/schemas/serializable-error-summary.schema.json`
