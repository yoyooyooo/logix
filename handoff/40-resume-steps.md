# Resume Steps（新会话 2 分钟内恢复）

1. 读 `handoff/00-tldr.md` 与 `handoff/20-decisions.md`，确认硬约束不变。
2. 打开 `handoff/specs/080-full-duplex-prelude/next-actions.md`，确认推进顺序仍是：078 → 081 → 082 → 079 → 085 →（再）084/083。
3. 进入实现时，以 `specs/*/tasks.md` 为唯一任务清单：先做 M2，严格保持 Node-only 工具链与 runtime 隔离。
4. 写回相关实现统一走 082 的 PatchPlan/WriteBackResult；Autofill 只补未声明字段，遇到不确定一律 reason codes 跳过。

