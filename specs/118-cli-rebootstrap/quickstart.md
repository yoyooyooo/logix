# Quickstart: CLI Rebootstrap

## 1. 先盘点现有 CLI

```bash
find packages/logix-cli/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

先看这 4 份台账：

- `inventory/command-surface.md`
- `inventory/legacy-routing.md`
- `inventory/reuse-ledger.md`
- `inventory/output-contract.md`

## 2. 先回答三组问题

1. 哪三条命令属于新主线
2. 哪些旧命令进入 archive 或 expert
3. 哪些 helper 和 tests 可以直接复用

## 3. 重点对齐文档

- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/114-package-reset-policy/*`

## 4. 完成标准

- 一级命令面稳定
- 输出契约稳定
- reuse ledger 稳定
- 旧命令去向稳定
