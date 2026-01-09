# 079 · TL;DR（Platform Anchor Autofill：保守补全）

目标：在 Platform-Grade 子集内，保守补全缺失的源码锚点字段（例如 `services`、`dev.source`），并通过 082 生成 PatchPlan/WriteBackResult 写回源码；原则是“宁可漏不乱补”与“只补未声明”。

当前状态：`spec/plan/contracts/tasks` 已齐；`specs/079-platform-anchor-autofill/tasks.md` 已补齐“已显式声明但不完整→只输出 deviation（写到 reason.details）”的任务口径。

下一步：实现落点在 Node-only `packages/logix-anchor-engine`；建议顺序：081 Parser → 082 Rewriter → 079 policy/report（再串联 write-back）。

