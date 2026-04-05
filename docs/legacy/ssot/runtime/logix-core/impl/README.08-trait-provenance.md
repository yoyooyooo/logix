# Trait Provenance & Static Governance（023 · Logic Traits in Setup）

当业务场景出现大量 Module / Form / Link / Feature Kits 混用时，traits 很容易从“声明式能力”退化为黑盒：能看到 computed/check 的存在，却难回答“这条规则是谁定义的、定义在什么位置、为何会生效”。

023 的治理裁决不是提供 Runtime Listeners（动态监听/增删 traits），而是：

- **Static Provenance**：所有 traits 声明在 setup 阶段一次性收敛为 `ModuleTraitsSnapshot`，并为每个 `traitId` 固化 `originType/originId/path` 等溯源信息（`provenanceIndex`），可被 Devtools/EvidencePackage 导出与回放对齐。
- **Graph Execution**：运行时只执行已构建的 Program/Plan（例如 `StateTraitProgram.graph/plan`），不对 trait 变更做运行时监听；traits 变化意味着重新 build+mount（重建图），而不是热路径内重算。
- **静态冲突检测**：Duplicate / Missing Requires / Excludes 等一致性问题在 finalize 阶段 fail-fast，并在抛错前发出 `trace:module:traits:conflict`，避免问题滞后到运行期才暴露。

详解见：`05-trait-provenance-and-static-governance.md`。
