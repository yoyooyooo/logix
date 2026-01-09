# 085 · TL;DR（Logix CLI：Node-only 基础能力入口）

目标：提供 Node-only `logix` CLI，作为平台落地前的“基础能力外壳 + 集成测试跑道”，串联：IR 导出、TrialRun、AnchorIndex、Autofill（report/write）。

关键裁决（已回灌到 plan/spec/tasks/contracts）：

- stdout 统一输出 `CommandResult@v1`（无时间戳/随机；artifacts 以 file/inline 承载）。
- Exit Code：`0=PASS`、`2=VIOLATION`、`1=ERROR`。
- 入口加载：`tsx`（Node ESM TS loader）；解析/索引/回写：`ts-morph`（lazy-load，`--help` 冷启动 `< 500ms`）。

下一步：实现新包 `packages/logix-cli`，并在 Phase 2 先打通“确定性输出骨架 + 落盘 + 错误语义”，再逐个子命令接入。

