始终用中文回复用户。

并行开发安全（强约束）：

- 默认假设工作区存在其他并行任务的未提交改动。
- 禁止为了“让 diff 干净/只留下本任务文件”而丢弃改动：禁止任何形式的 `git restore`、`git checkout -- <path>`、`git reset`、`git clean`、`git stash`。
- 禁止自动执行 `git add` / `git commit` / `git push` / `git rebase` / `git merge` / `git cherry-pick`，除非用户明确要求。
- 禁止删除/覆盖与本任务无关的文件；如确需删除/大范围移动，必须先征得用户明确同意。
- 如需查看差异，只使用只读命令（`git status`、`git diff` 等）。
