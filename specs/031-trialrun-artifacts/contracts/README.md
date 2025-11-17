# 031 · TrialRun Artifacts Contracts

本目录固化 031 的 contracts（长期可存储、可 diff 的协议面），用于：

- `TrialRunReport.artifacts` 槽位的统一承载形态（Envelope + budgets + errors）
- 首个内置用例：Form 的 RulesManifest artifact（Supplemental Static IR）

## Schemas

- `schemas/trial-run-artifacts.schema.json`
  - Title: `TrialRunArtifacts`
  - Shape: `Record<ArtifactKey, ArtifactEnvelope>`
- `schemas/artifact-envelope.schema.json`
  - Title: `ArtifactEnvelope`
  - Fields: `ok/value/error/truncated/budgetBytes/actualBytes/digest/notes`
- `schemas/form-rules-manifest-artifact.schema.json`
  - Title: `FormRulesManifestArtifactPayload`
  - Payload: `{ manifest, warnings }`（`manifest` 复用 028 的 RulesManifest schema）

## Keys

- `@logix/form.rulesManifest@v1`
  - Schema: `schemas/form-rules-manifest-artifact.schema.json`

## References

- JsonValue: `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- SerializableErrorSummary: `specs/016-serializable-diagnostics-and-identity/contracts/schemas/serializable-error-summary.schema.json`
- RulesManifest（SSoT）：`specs/028-form-api-dx/contracts/schemas/rules-manifest.schema.json`
