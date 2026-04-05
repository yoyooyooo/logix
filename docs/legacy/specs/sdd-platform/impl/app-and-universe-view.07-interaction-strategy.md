# 7. 交互策略：宏观可编，微观只读 (Interaction Strategy)

针对“图形化编辑是否有意义”的问题，当前主线采取 **二八原则**：

## 7.1 宏观架构 (L1/L2)：可编辑 (Editable)

**场景**：模块划分、依赖治理、链路骨架设计。
**价值**：降低架构重构成本，可视化意图。

- **拖拽重构**：将 Module 节点在 Module 之间拖拽，平台自动重构文件目录与 `imports` 配置。
- **连线编排**：在 Link Node 与 Module Node 之间拉线，平台自动在 Link 代码中插入 `yield* SomeServiceTag` / `yield* SomeModuleDef.tag` 骨架。
- **爆炸半径分析**：点击节点高亮所有上下游依赖，辅助架构决策。

## 7.2 微观逻辑 (L3)：只读/跳转 (Read-only / Jump)

**场景**：具体业务逻辑实现（如 `filter`, `map`, `if/else`）。
**价值**：避免“连线编程”带来的低效与臃肿。

- **拒绝意大利面条**：不提供细粒度的 AST 节点编辑（如不提供“If 节点”、“Loop 节点”）。
- **代码为王**：双击 Link/Module 节点，直接跳转到 VSCode / 编辑器对应行。
- **AI 辅助**：L3 层的逻辑修改由 **AI Copilot** 在代码编辑器中完成，而不是在画布上连线。

**总结**：Universe View 是架构师的上帝视角（God Mode），而不是程序员的积木玩具。
