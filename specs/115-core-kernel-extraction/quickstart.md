# Quickstart: Core Kernel Extraction

## 1. 先看哪些路径

- `packages/logix-core/src/internal/runtime/core/`
- `packages/logix-core/src/internal/observability/`
- `packages/logix-core/src/internal/reflection/`
- `packages/logix-core/src/internal/runtime/core/process/`
- `packages/logix-core-ng/src/`

先看这些 planning 台账：

- `inventory/kernel-zone-map.md`
- `inventory/support-matrix.md`
- `inventory/reuse-ledger.md`
- `inventory/public-surface-map.md`
- `perf/README.md`

## 2. 先回答三个问题

1. 哪些模块属于 kernel
2. 哪些模块属于 runtime shell / observability / reflection / process
3. 哪些现有实现和测试可以直接复用
4. `core-ng` 当前哪些导出只是 legacy routing，哪些桥接点已经回到 `@logixjs/core`

## 3. 推荐先跑的只读检查

```bash
find packages/logix-core/src packages/logix-core-ng/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

```bash
rg -n 'kernel|control plane|Runtime|Program|Module' docs/ssot/runtime/*.md docs/standards/*.md
```

## 4. 完成标准

- kernel / shell / observability / reflection / process 的边界图稳定
- `core-ng` 的去向稳定
- `core-ng` public barrel 已明确标注 legacy routing 语义
- reuse ledger 已能说明哪些热链路和测试可直接沿用
- public surface map 与 perf evidence 路径已经就位
