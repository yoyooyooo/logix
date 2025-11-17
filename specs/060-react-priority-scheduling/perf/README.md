# Perf Evidence: 060 Txn Lanes

> 本特性触及 Logix Runtime 核心路径（txnQueue 调度与 follow-up work），必须提供可复现证据。
> suites/budgets 的 SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`

本目录用于存放 `$logix-perf-evidence` 的 before/after/diff 输出文件（Node + Browser）。

- 采集与对比命令：见 `specs/060-react-priority-scheduling/plan.md`
- 注意：硬结论证据必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索。
