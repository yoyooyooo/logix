---
title: New SSoT Root
status: living
version: 14
---

# New SSoT Root

本目录承接当前生效的单一事实源。

## 当前状态

- 历史 SSoT 已整体迁入 `docs/archive/ssot/`
- 新 SSoT 只维护当前有效结论
- 子树 owner 路由统一在各自 README 维护

## 当前角色

- 本页只负责把稳定事实分流到 `runtime/`、`form/` 或 `platform/`
- 叶子页语义由对应子树 README 和 leaf pages 承接
- 待升格内容先回到 `docs/next/**` 或 `docs/proposals/**`

## 当前入口

| 子树 | 进入条件 | 当前入口 |
| --- | --- | --- |
| `capability/` | Logix-wide capability planning harness、API projection decision policy、frozen API shape、proposal workflow 等跨 domain 规划事实 | [Capability SSoT Root](./capability/README.md) |
| `runtime/` | public spine、hot path、control plane、domain、verification、toolkit layer、selector type-safety ceiling、DVTools internal workbench、CLI Agent First control-plane route、Playground product workbench 等运行时事实 | [Runtime SSoT Root](./runtime/README.md) |
| `form/` | form 领域语义、owner split、exact surface contract、场景矩阵与 capability planning harness | [Form SSoT Root](./form/README.md) |
| `platform/` | 跨层结构、anchor/profile、instantiation 边界 | [Platform SSoT Root](./platform/README.md) |

## 相关裁决

- [2026-04-04 Logix API Next Charter](../adr/2026-04-04-logix-api-next-charter.md)
- [2026-04-05 AI Native Runtime First Charter](../adr/2026-04-05-ai-native-runtime-first-charter.md)

## 相关规范

- [Docs Governance](../standards/docs-governance.md)
- [Effect V4 Baseline](../standards/effect-v4-baseline.md)

## 导航说明

- 稳定事实先判断进入 `runtime/`、`form/` 还是 `platform/`
- 叶子页 owner 路由继续看对应子树 README
- 仍待升格的专题先看 [Next Docs Root](../next/README.md)
- 若需要查历史材料，转到 `docs/archive/ssot/`

## 当前一句话结论

这里是稳定事实的总入口；当前冻结 API 形状看 [capability/03-frozen-api-shape.md](./capability/03-frozen-api-shape.md)，叶子页 owner 路由继续看 [runtime/README.md](./runtime/README.md)、[form/README.md](./form/README.md) 和 [platform/README.md](./platform/README.md)。
