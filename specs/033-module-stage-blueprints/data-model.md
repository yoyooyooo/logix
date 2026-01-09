# Data Model: Module Stage Blueprints（033：StageBlueprint / IntentRule / RowRef）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/033-module-stage-blueprints/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/033-module-stage-blueprints/plan.md`

> 本文件固化 033 的语义蓝图数据模型（画布配置面），不规定 UI/Layout Editor 的实现。

## Design Principles

- **最小可配置面**：画布只配置节点/边/资产三类；端口与类型来自导出事实源（035）。
- **稳定锚点**：`instanceId/ruleId/rowId` 必须稳定、可注入、可对齐到动态 Trace。
- **只靠工件验收**：行为正确性靠 trial-run artifacts/evidence 验收（031/036），不是靠“UI 看起来对”。

## Canvas：节点都有什么（可配置核心概念）

### Node：`ModuleInstance`

一个模块放到舞台上的实例化节点：

- `instanceId`：稳定实例锚点（用于注入 runtime instanceId）
- `moduleId`：概念 id（与 Manifest/PortSpec 对齐）
- `config`：模块实例配置（允许 kit 自定义，但必须 JsonValue）

### Edge：`IntentRule`（事件 → 动作）

一条语义连线：

- `ruleId`：稳定连线锚点（用于回放/高亮对齐）
- `source`：`instanceId + eventPort`
- `sink`：`instanceId + actionPort`
- `mapping?`：引用 034 的 CodeAsset（用于 payload/patch 变换）

### Asset：`CodeAsset`（034）

映射/条件/校验表达式资产：

- 保存期固化 deps/digest；预览期可在 sandbox 受控运行；黑盒资产必须显式声明 deps/能力/预算。

## Protocols（统一 `@logixjs/module.*` 域）

- `@logixjs/module.stageBlueprint@v1`：语义蓝图（包含 ModuleInstances 与 IntentRules）
- `@logixjs/module.intentRule@v1`：连线（source/sink + mapping ref）
- `@logixjs/module.rowRef@v1`：动态列表定位（rowPath 段 + rowId）

Canonical schemas：

- `specs/033-module-stage-blueprints/contracts/schemas/stage-blueprint.schema.json`
- `specs/033-module-stage-blueprints/contracts/schemas/intent-rule.schema.json`
- `specs/033-module-stage-blueprints/contracts/schemas/row-ref.schema.json`

## Cross-Spec References

- 035 Port addressing（ports/exports 的地址基元）：`specs/035-module-ports-typeir/contracts/schemas/port-address.schema.json`
- 034 CodeAssetRef（映射资产引用）：`specs/034-expression-asset-protocol/contracts/schemas/code-asset-ref.schema.json`
- 032 UIBlueprint/BindingSchema（投影与绑定）：`specs/032-ui-projection-contract/contracts/schemas/*`
