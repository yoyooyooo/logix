# Refs（权威入口与关键落点）

## Group / Specs

- `specs/080-full-duplex-prelude/spec.md`
- `specs/080-full-duplex-prelude/spec-registry.md`
- `specs/078-module-service-manifest/spec.md`
- `specs/079-platform-anchor-autofill/spec.md`
- `specs/081-platform-grade-parser-mvp/spec.md`
- `specs/082-platform-grade-rewriter-mvp/spec.md`
- `specs/083-named-logic-slots/spec.md`
- `specs/084-loader-spy-dep-capture/spec.md`
- `specs/085-logix-cli-node-only/spec.md`

## Contracts（关键 schema）

- `specs/078-module-service-manifest/contracts/schemas/module-manifest.schema.json`
- `specs/084-loader-spy-dep-capture/contracts/schemas/spy-evidence-report.schema.json`
- `specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json`
- `specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
- `specs/079-platform-anchor-autofill/contracts/schemas/autofill-report.schema.json`

## Code（实现落点）

- `packages/logix-core/src/Module.ts`
- `packages/logix-core/src/internal/reflection/manifest.ts`
- `packages/logix-core/src/internal/runtime/core/LogicUnitMeta.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-anchor-engine/`（待实现，Node-only）
- `packages/logix-cli/`（待实现，Node-only）

