# PR：Logix Form（非 React）优先吸收点（TanStack Form 启发 · DX 优先 · 可推翻 010）— 精简归档

> 说明：本文件原本用于把 TanStack Form 的启发点“转译”为 Logix 体系的 What/IR/Policy/Evidence。  
> 截至目前，大部分高价值结论已被 010 的 `spec.md/plan.md/tasks.md/quickstart.md` 固化，因此这里仅保留 **待定（OPEN）/后置（DEFER）** 项与索引，避免重复维护长文。

## 已吸收（ADOPT/TRANSFORM → 010 已固化）

已吸收项以 010 的 `spec.md/plan.md/tasks.md/quickstart.md` 为准；本文件仅保留 **待定（OPEN）/后置（DEFER）**。

## 待定（OPEN）

> 这些点仍可能显著影响 DX，但当前不应在 010 主线里扩大表面积；建议等 US1–US3 与 Path/Controller/Schema 主线落稳后，再以最小增量方式引入。

- `[OPEN]` **`errors.$manual` 的外观名词**：内部仍保留 `manual > rules > schema` 分层，但对用户是否需要暴露 “manual” 词汇，可能影响学习成本；如要改名应仅改外观，不改内核语义与错误树结构。

## 后置（DEFER）

- `[DEFER]` **提交 meta / 多按钮提交语义（onSubmitMeta）**：可作为 `controller.handleSubmit(meta?)` 的后续 DX。
- `[DEFER]` **Focus management**：不在 form 内核耦合 DOM；如需“聚焦首错”放到 UI/React 层实现。
- `[DEFER]` **Schema transform output**：是否让 schema decode 产出 “output values” 并参与提交链路，需要单独评估性能与契约复杂度；不进 010 核心交付面。
- `[DEFER]` **跨模块 Form 消费 Query 的示例与共享缓存**：010 先只覆盖“本模块 source 写回快照 → local deps 消费”；跨模块消费通过 Link/Logic 显式投影到 Form `ui.*`，以及按 `resourceId+keyHash` 的跨模块缓存/in-flight 去重，后续在 `StateTrait.source`/`@logix/query` 跑道单独加强并补齐示例。
