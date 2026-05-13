# Contracts: Form Validation Bridge Cutover

本目录不生成对外 API contract。

本波次内部 contract 面只涉及：

- `packages/logix-form/src/internal/schema/SchemaPathMapping.ts`
- `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
- `packages/logix-form/src/internal/form/commands.ts`

本波次 contract 只回答三件事：

1. submit-only decode gate
2. normalized decode facts
3. path-first lowering + submit fallback
