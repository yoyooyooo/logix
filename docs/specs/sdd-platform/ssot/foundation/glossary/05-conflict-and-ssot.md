# 5. 冲突解决与 SSoT 归属

当你在实现或阅读过程中遇到“概念不一致”或“多处定义冲突”时，按以下顺序判断：

1. **平台侧概念/平台术语：优先查本文件**：
   - 若术语在此有定义，以此为准；
   - 若表述与其它文档不一致，应先修改其它文档，使之与本文件对齐。

2. **运行时术语与契约：优先查 runtime SSoT**：
   - `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`
   - `.codex/skills/project-guide/references/runtime-logix/logix-core/*`

3. **其次查模型与协议层文档**：
   - 三位一体与资产结构：`docs/specs/sdd-platform/ssot/foundation/03-trinity-and-layers.md`、`docs/specs/sdd-platform/ssot/assets/00-assets-and-schemas.md`；
  - 平台资产与视图：`docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md`、`docs/specs/sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md`。

4. **最后看示例与实现细节**：
   - `examples/logix` 与 `packages/logix-*` 仅作为“实现参考”（用于验证与沉淀），不应反向定义概念层术语；
   - 如实现先于文档演进，应尽快回写概念层与模型层文档，避免“事实源漂移”。

> 一句话记忆：**概念先于实现，模型约束实现；示例用来帮我们验证与修正概念/模型，而不是反过来由示例决定世界观。**
