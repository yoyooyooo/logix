# 2026-03-06 · F-5：`Fabfile` current-branch base semantics

本刀只修 `fabfile.py` 的默认比较语义，不碰 runtime / packages，也不引入任何 git 写操作。目标是让 `list_merge_ready` / `show_branch_diff` 默认以“当前所在分支”作为 base，避免已经并入当前主线的 satellite branch 仍被误报成 merge-ready。

## 实现

更新：
- `fabfile.py`
- `docs/perf/07-optimization-backlog-and-routing.md`

新增/调整命令语义：
- `python3 fabfile.py list_merge_ready`
- `python3 fabfile.py list_merge_ready --base main`
- `python3 fabfile.py show_branch_diff <branch>`
- `python3 fabfile.py show_branch_diff <branch> --base main`

补充能力：
- 默认 base 不再取 `origin/HEAD -> main` 视角，而是先解析当前 worktree 的已检出分支。
- 只有在当前 worktree 处于 detached HEAD 时，才回退到 `origin/HEAD`，最终兜底为 `main`。
- `list_merge_ready` / `show_branch_diff` 都支持显式 `--base <ref>`，把 `main` 视角降级为显式请求，而不是默认行为。
- 显式 `--base` 同时支持：
  - 本地分支名（如 `main`）
  - `agent/...` 分支名
  - 已挂载 worktree 的 basename / 短名
  - 其他可被 `git rev-parse --verify <ref>^{commit}` 解析的 git 引用
- `list_merge_ready` 在默认 base=当前分支时，会跳过 base 分支自身，不把“拿自己和自己比”也算进扫描候选。

## 设计约束

- 保持只读默认：只读取 `git symbolic-ref`、`git rev-parse`、`git show-ref`、`git rev-list`、`git log`、`git worktree list`、`git status --short`。
- 不再把“主分支视角”写死进默认行为；主分支只是一种显式可选的比较视角。
- 不改变 merge-ready 判定标准本身，仍然是：
  - `ahead_count == 1`
  - `behind_count == 0`
  - 存在 active worktree
  - `dirty_count == 0`
- 本刀只修视角选择，不扩展新的 git 动作或自动合流行为。

## 验证

- `python3 -m py_compile fabfile.py`
- `python3 fabfile.py list_merge_ready`
- `python3 fabfile.py list_merge_ready --base main`
- `python3 fabfile.py show_branch_diff agent/f3-fabfile-merge-ready`
- `python3 fabfile.py show_branch_diff agent/f3-fabfile-merge-ready --base main`
- `python3 fabfile.py list_merge_ready --json`

## 结果观察（2026-03-06 当前盘面）

- 在 `agent/f5-fabfile-current-branch-base` worktree 中直接执行 `list_merge_ready` 时，输出的 `base` 已变为当前分支 `agent/f5-fabfile-current-branch-base`。
- 同一盘面下，默认 `list_merge_ready` 返回空列表；这符合预期，因为先前被 `main` 视角判成 merge-ready 的 `agent/f3-fabfile-merge-ready`，相对当前分支实际上已经 `behind=58`。
- 显式执行 `list_merge_ready --base main` 时，仍可回到原来的主分支视角，并继续看到 `agent/f3-fabfile-merge-ready` 作为 merge-ready 候选。
- `show_branch_diff agent/f3-fabfile-merge-ready` 默认输出 `base: agent/f5-fabfile-current-branch-base`，并正确给出 `behind=58`；显式 `--base main` 时则恢复为 `ahead=1 behind=0`、`merge_ready=true`。

## 证据文件路径

- 本刀无新的 perf report / diff；证据是命令输出本身。
- dated record：`docs/perf/2026-03-06-f5-perf-fabfile-current-branch-base.md`

## 后续

- 如果后续要继续扩展，可考虑补一个显式的 `--base current` 语义糖，但默认行为应继续保持“当前 worktree 分支优先，主分支视角必须显式声明”。
