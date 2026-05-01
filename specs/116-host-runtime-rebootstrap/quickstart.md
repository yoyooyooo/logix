# Quickstart: Host Runtime Rebootstrap

## 1. 先盘点四个包

```bash
find packages/logix-react/src packages/logix-sandbox/src packages/logix-test/src packages/logix-devtools-react/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

先看这几份当前台账：

- `inventory/host-role-matrix.md`
- `inventory/reuse-ledger.md`
- `inventory/shared-control-plane.md`
- `inventory/package-templates.md`

## 2. 先回答三组问题

1. 每个包的唯一主职责是什么
2. 哪些协议和测试可以直接复用
3. 哪些目录需要收缩或重排

## 3. 重点对齐文档

- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/07-standardized-scenario-patterns.md`

## 4. 完成标准

- role matrix 稳定
- shared control plane contract 稳定
- reuse ledger 稳定
- package templates 稳定
