# Contracts: Examples Verification Alignment

## 1. Example Structure Contract

- `examples/logix/src/` 至少包含 `features`、`patterns`、`runtime`、`scenarios`、`verification`

## 2. Anchor Contract

- docs 页面必须能找到主线 example
- example 必须能回到 docs 页面
- verification 示例必须能回到对应 example 或 docs

## 3. Verification Contract

- verification 示例只认 `fixtures/env + steps + expect`
- 不允许额外长出第二 DSL

## 4. Reuse Contract

- 已能表达主线语义的现有 scenarios、patterns、fixtures 与测试优先复用或最小适配
