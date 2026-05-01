# Quickstart: Examples Verification Alignment

## 1. 先盘点 examples

```bash
find examples/logix/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

## 2. 先回答三组问题

1. 哪些 examples 直接保留
2. 哪些 examples 需要适配成 verification
3. docs 锚点如何映射到 examples

## 3. 重点对齐文档

- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- `docs/ssot/runtime/09-verification-control-plane.md`

## 4. 完成标准

- inventory 稳定
- anchor map 稳定
- verification template 稳定
- `examples/logix/src/verification/` 有统一入口
