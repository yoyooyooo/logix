# TanStack Form（React）文档要点摘录（面向 010）— 精简归档

> 来源：`/Users/yoyo/Documents/code/personal/llms.txt/docs/tanstack-form`（TanStack Form React docs 快照）  
> 官方入口：https://tanstack.com/form/latest/docs/framework/react/reference/index  
> 说明：本文件原本用于摘录 TanStack Form 的启发点；截至目前，绝大多数“高价值结论”已被 010 的 `spec.md/plan.md/tasks.md/quickstart.md` 固化，因此这里只保留 **后置（DEFER）/不采纳（REJECT）** 与索引，避免重复维护。

## 已吸收（ADOPT/TRANSFORM → 010 已固化）

已吸收项以 010 的 `spec.md/plan.md/tasks.md/quickstart.md` 为准；本文件仅保留 **后置（DEFER）/不采纳（REJECT）**。

## 后置（DEFER）

> 方向认可，但不进入 010 核心交付面；等 010/013/014 的主线落稳后再做。

- `[DEFER]` **工程脚手架（createFormHook / withFieldGroup）**：更偏 React DX/生态层，建议后置到 `@logixjs/form/react`（不改变 010 的 IR/语义）。
- `[DEFER]` **onSubmitMeta（多按钮/附加提交语义）**：可作为 controller/handleSubmit 的后续 DX；010 先固化事务内/事务外边界与默认动作语义。
- `[DEFER]` **Schema transform output**：TanStack 的 Standard Schema 不返回 transform 后值；010 当前不把“schema 产出值”纳入核心交付面，避免扩大热路径与契约复杂度。

## 不采纳（REJECT）

- `[REJECT]` **rule 返回任意 valuePath→error 的 path-map**（例如 `{ fields: { "a.b": "err" } }`）：写回点不可预测、难以做定向优化/清理/合并；命令式写入只允许走 controller `setError/clearErrors`（进入 `errors.$manual` 覆盖层）。
- `[REJECT]` **第二 errors 真相源（按来源/阶段分叉保存 errorMap）**：来源/阶段信息应进入诊断事件与 UI 策略（`touched/submitCount`），不进入 state 的第二真相源。
