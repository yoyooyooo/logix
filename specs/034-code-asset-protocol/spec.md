# Feature Specification: Code Asset Protocol（代码资产协议：CodeAsset/Deps/Digest/Anchor）

**Feature Branch**: `[034-code-asset-protocol]`  
**Created**: 2026-01-26  
**Status**: Done  
**Input**: 从 035 拆分：把“引用载体协议”（CodeAsset/Deps/Anchor）从“模块引用空间事实源”（PortSpec/TypeIR/PortAddress）中解耦，独立成为可治理资产协议跑道。

## 目标一句话

平台保存表达式/校验逻辑时必须固化为 **可 diff、可审阅、可门禁、可受控预览** 的资产：`CodeAsset@v1`（source + normalizedIr + deps + digest + budgets/capabilities + anchor）。

## Scope

- 定义并固化协议：
  - `@logixjs/module.codeAsset@v1`（payload：`CodeAsset@v1`）
  - `CodeAssetRef@v1`（digest 引用锚点）
  - `Deps@v1`（显式依赖：reads/services/configs；reads 的地址空间引用 035 的 `PortAddress`）
  - `ReversibilityAnchor@v1`（可逆溯源锚点）
- 不在本 spec 内强制交付“某一种表达式语言”；允许 parseable 子集与 blackbox 双态。

## Non-Negotiable Principles

- **单一真相源**：deps/能力/预算必须显式固化；平台不得靠源码推断生成并行真相源。
- **确定性优先**：digest 只由稳定字段派生；禁止时间戳/随机作为默认输入。
- **黑盒必须可治理**：blackbox 资产必须显式声明 deps/能力/预算，否则拒绝保存。

## References

- 035（引用空间事实源）：`specs/035-module-reference-space/spec.md`
- 036（Contract Suite）：`specs/036-workbench-contract-suite/spec.md`
