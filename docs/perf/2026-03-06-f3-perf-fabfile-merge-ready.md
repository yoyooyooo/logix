# 2026-03-06 · F-3：`Fabfile` merge-ready view

本刀继续沿着 `F-1`/`F-2` 的只读工具链往前补，不做任何 git 写操作，只把“哪些 satellite branch 已经接近可合并”这层视图落到 `fabfile.py`。

## 实现

更新：
- `fabfile.py`

新增命令：
- `python3 fabfile.py list_merge_ready`
- `python3 fabfile.py list_merge_ready --json`
- `python3 fabfile.py show_branch_diff <branch>`
- `python3 fabfile.py show_branch_diff <branch> --json`

补充能力：
- `list_merge_ready` 基于当前 active `effect-v4.*` satellite worktree，筛选“相对主分支 ahead=1、behind=0、worktree clean”的 branch。
- 主分支默认从 `refs/remotes/origin/HEAD` 解析；如果仓库未配置该符号引用，则回退到 `main`。
- `show_branch_diff` 输出目标 branch 相对主分支的 ahead/behind、最新提交摘要、active worktree 路径/dirty 状态，以及为什么当前不算 merge-ready。
- `show_branch_diff` 支持直接传完整 branch 名，也支持传不带 `agent/` 前缀的短名；如果输入的是当前已挂载 worktree basename，也会反解到对应 branch。

## 设计约束

- 仍然保持只读：只调用 `git symbolic-ref`、`git show-ref`、`git rev-list`、`git log`、`git worktree list`、`git status --short`。
- `list_merge_ready` 不扫描整个仓库的所有本地分支，只看当前 `effect-v4.*` satellites，避免把无关 topic branch 混进默认视图。
- merge-ready 的判定必须同时满足：
  - `ahead_count == 1`
  - `behind_count == 0`
  - 存在 active worktree
  - `dirty_count == 0`
- 当前盘面下，这个命令允许返回空列表；空结果本身也是有效信号，说明还没有任何 satellite branch 收口到“主分支 + 1 commit”的状态。

## 验证

- `python3 -m py_compile fabfile.py`
- `python3 fabfile.py list_merge_ready`
- `python3 fabfile.py list_merge_ready --json`
- `python3 fabfile.py show_branch_diff agent/f1-perf-fabfile`
- `python3 fabfile.py show_branch_diff f2-fabfile-worktree-plan --json`

## 结果观察（2026-03-06 当前盘面）

- `list_merge_ready` 当前返回空列表；这符合实际，因为现有 satellite branches 相对 `main` 都不止多 1 个提交。
- `show_branch_diff agent/f1-perf-fabfile` / `agent/f2-fabfile-worktree-plan` 能正确展示 ahead 数、最新提交摘要和 active worktree clean 状态。

## 后续

- 如果后续要继续扩展，可以在这层只读视图上再追加“候选 merge 顺序”或“可直接 cherry-pick / squash 的提示”，但默认行为仍应保持只读，不把 `fabfile.py` 变成危险 git 入口。
