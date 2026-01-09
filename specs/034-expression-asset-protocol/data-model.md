# Data Model: Expression Asset Protocol（034：CodeAsset / Deps / Digest / Anchor）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/034-expression-asset-protocol/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/034-expression-asset-protocol/plan.md`

> 本文件固化 034 的资产协议数据模型；表达式语言实现与编辑器 UI 不在此规定。

## Design Principles

- **可审阅**：同一资产重复保存产生确定性 IR/digest；diff 噪音可控。
- **可治理**：deps/能力/预算显式可检查；黑盒资产不得“偷跑”。
- **可验收**：不靠 LLM 自评，靠 trial-run 工件闭环（031/036）。

## Protocols（统一 `@logixjs/module.*` 域）

### `@logixjs/module.codeAsset@v1`

统一承载两类资产（用 `kind` 区分）：

- `kind="expression"`：映射/条件表达式（用于 IntentRule payload/patch 变换）
- `kind="validator"`：校验资产（用于 rules/check 等场景）

字段核心：

- `source`：可编辑源码层（truth）
- `normalizedIr`：规范化 IR（可 diff/可重写；可解析子集或 blackbox）
- `deps`：显式依赖（对齐 035 PortAddress/exports/services/config）
- `digest`：稳定摘要（由 normalizedIr 稳定派生）
- `budgets/capabilities`：sandbox 约束与能力声明
- `anchor`：可逆溯源锚点（不影响运行语义）

Canonical schema：`specs/034-expression-asset-protocol/contracts/schemas/code-asset.schema.json`

### `@logixjs/module.deps@v1`

显式依赖清单：至少覆盖 `reads`（output/export）+ `services` + `configs`。  
Canonical schema：`specs/034-expression-asset-protocol/contracts/schemas/deps.schema.json`

### `@logixjs/module.reversibilityAnchor@v1`

可逆溯源锚点：允许携带 spec/block 指针、生成指纹与人类说明，用于 agent 重生成与 drift detection。  
Canonical schema：`specs/034-expression-asset-protocol/contracts/schemas/reversibility-anchor.schema.json`

### `CodeAssetRef@v1`

以 `digest` 作为最小引用锚点（供 032/033 引用资产）。  
Canonical schema：`specs/034-expression-asset-protocol/contracts/schemas/code-asset-ref.schema.json`

## Cross-Spec References

- deps 的地址基元：`specs/035-module-ports-typeir/contracts/schemas/port-address.schema.json`
