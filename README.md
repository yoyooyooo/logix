# intent-flow / Logix 实验场

本仓库是「意图驱动开发 + Effect-Native 运行时」的实验场，用于打磨：

- Logix Runtime（前端运行时内核）；
- Intent/Flow/Effect 的组合模式；
- 面向 ToB 典型场景的 PoC 与最佳实践。

原则：性能与可诊断性优先、拒绝向后兼容；目标是让 Logix 成为逻辑编排领域的“React”
（声明式、可推导、内部自动优化、可解释）。治理与工作流以 `.specify/memory/constitution.md`
为准。

## 文档分层

- **用户文档（推荐从这里开始）**  
  - 路径：`apps/docs`（Next.js + Fumadocs）  
  - 内容：Logix 使用指南、API 参考、教程、配方。  
  - 本地开发：
    ```bash
    cd apps/docs
    pnpm install
    pnpm dev
    # 打开 http://localhost:3000
    ```

- **规范与设计文档（SSoT）**  
  - Intent / 平台侧：`docs/specs/intent-driven-ai-coding`  
  - Runtime / Logix 内核：`.codex/skills/project-guide/references/runtime-logix`（project-guide 内置的 Runtime SSoT，按渐进式披露组织）  
  - 任何影响 Intent 模型、Flow DSL、Runtime 契约的决策，优先更新上述文档。

- **团队引入/宣讲材料（精简版）**
  - 路径：`docs/team-briefing/README.md`
  - 内容：Logix 的初衷、优势与对比（面向团队沟通，不替代用户文档与 SSoT）。

## 代码主线

- `packages/logix-core`：Logix 运行时内核（Module / Logic / Bound API `$` / Runtime 等）；  
- `packages/logix-react`：React 适配层（`RuntimeProvider`、`useModule` 等）；  
- `examples/logix`：可运行的 PoC 场景与 Pattern（scenarios + patterns）。

如需在真实业务仓库中接入 Logix，建议先阅读 `apps/docs` 中的「快速上手」与 Essentials，再结合 `.codex/skills/project-guide/references/runtime-logix` 理解运行时契约。 

## Speckit Kanban（本地调试）

- 快速预览（静态 dist）：`pnpm speckit:kanban`
- 开发模式（HMR）：`pnpm speckit:kanban:dev`
