# 079 · 已完成 plan + tasks（下一步进入 implement）

- `specs/079-platform-anchor-autofill/plan.md` 已更新：明确依赖 `081/082`，并将落点收敛到 `packages/logix-anchor-engine` + `packages/logix-cli`。

## 下一步（resume 后立即执行）

- 执行 `specs/079-platform-anchor-autofill/tasks.md`，把“policy（允许写回什么）”与“engine（怎么写回）”按顺序落地：
  - policy：只补未声明且高置信度；默认 `port = serviceId`；宁可漏不乱补
  - engine：复用 `081 AnchorIndex` + `082 PatchPlan/WriteBackResult`
