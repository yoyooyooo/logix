# Contracts: 025 IR Reflection Loader

**Date**: 2025-12-24  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/025-ir-reflection-loader/spec.md`

本目录固化 025 的“对外契约层”产物：

- `api.md`：对外 API 与行为契约（后续实现/测试对齐用）。
- `schemas/*`：Manifest/StaticIR/EnvironmentIR/TrialRunReport 的 JSON Schema（跨宿主可序列化硬门）。
- `schemas/module-manifest-diff.schema.json`：Contract Guard（diffManifest）的差异输出 schema（CI/POC 共享口径）。

复用（单一事实源）：

- JsonValue 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- 控制面证据：`specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json`
- EvidencePackage：`specs/020-runtime-internals-contracts/contracts/schemas/runtime-evidence-package.schema.json`
- 可序列化错误摘要：`specs/016-serializable-diagnostics-and-identity/contracts/schemas/serializable-error-summary.schema.json`
