# Quickstart: Domain Package Rebootstrap

## 1. 先盘点四个包

```bash
find packages/logix-query/src packages/logix-form/src packages/i18n/src packages/domain/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

## 2. 先回答三组问题

1. 主输出形态是什么
2. 旧入口如何退出主线
3. 哪些协议和测试可以直接复用

## 3. 重点对齐文档

- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/standards/logix-api-next-guardrails.md`

## 4. 完成标准

- role matrix 稳定
- package template 稳定
- reuse ledger 稳定
