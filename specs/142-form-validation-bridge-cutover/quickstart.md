# Quickstart: Form Validation Bridge Cutover

## Goal

验证 structural decode 是否只在 submit lane 激活，并且 bridge lowering 是否已经回到 path-first + submit fallback。

## Suggested Validation Steps

```bash
pnpm exec vitest run \
  packages/logix-form/test/SchemaPathMapping.test.ts \
  packages/logix-form/test/SchemaErrorMapping.test.ts
```

```bash
pnpm typecheck
```

## Expected Outcome

- field-level validate 不触发 structural decode
- decode failure 只通过 canonical bridge 进入 truth
- raw schema issue 不再作为 canonical leaf 写回
