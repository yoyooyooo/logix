---
description: 整理草稿 (Organize Drafts)
---

遵循 `.agent/skills/drafts-tiered-system/SKILL.md` 的规则来整理、合并和提升草稿。

1.  **理解用户意图**：
    *   用户想要整理混乱的草稿 (L9 -> L7/L5)。
    *   用户想要将草稿归档到 Topic (L* -> topics)。
    *   用户想要将成熟草稿并入 Specs (L3/L2 -> specs)。

2.  **执行步骤**：
    *   **梳理与前移 (4.2 流程)**：
        *   选择主题，收集 L7-L9 草稿。
        *   创建更高层级文件 (L6/L5)。
        *   汇总结论，标记旧草稿为 `superseded`。
    *   **专题收编 (4.3 流程)**：
        *   在 `docs/specs/drafts/topics/` 创建目录。
        *   移动并重命名草稿。
        *   创建 Topic README/Index。
        *   更新 `docs/specs/drafts/index.md`。
    *   **落地与归档 (4.4 流程)**：
        *   **区分目标**：
            *   **内部规范 (SSoT)** -> `docs/specs/`: 架构决策、核心逻辑、设计约束。
            *   **用户文档 (User Docs)** -> `apps/docs/`: 使用指南、API 文档、教程 (面向最终用户)。
        *   **执行迁移**：
            *   提炼草稿中的稳定结论，分别写入上述目标位置。
            *   注意：`apps/docs` 应避免出现 "v3/PoC" 等内部术语，保持产品视角。
        *   **更新状态**：
            *   更新草稿状态为 `merged` 或 `implemented`。
            *   在草稿开头注明已归档到何处。

3.  **注意事项**：
    *   始终保持 `index.md` 与文件系统同步。
    *   不要在 drafts 中引入未标记冲突的新标准。
