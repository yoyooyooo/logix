# Quickstart: I18n Logic Contract Cutover

## 1. 先看哪些页面和路径

- `docs/ssot/runtime/08-domain-packages.md`
- `packages/i18n/src/index.ts`
- `packages/i18n/src/I18n.ts`
- `packages/i18n/src/Token.ts`

## 2. 先回答哪些问题

1. I18n 的默认主身份是什么
2. root exports 的 keep 或 remove 或 move ledger 是否已经写死
3. driver ready/reset 等接线属于 shared declaration 还是包内独立叙事
4. projection 与 root/global 解析语义应停在哪一层
