# 2026-03-06 · F-2：`Fabfile` worktree 规划层

本刀延续 `F-1` 的最小可用 `fabfile.py`，目标不是执行 git 动作，而是把“并行 worktree 怎么命名、当前有哪些活跃 worktree、当前并行组如何结构化输出”落成只读规划层。

## 实现

更新：
- `fabfile.py`

新增命令：
- `python3 fabfile.py show_worktree_plan R-1`
- `python3 fabfile.py list_active_worktrees`
- `python3 fabfile.py plan_parallel --json`

补充能力：
- 从 `git worktree list --porcelain` 读取当前 `effect-v4.*` satellites，并补充 branch / head / dirty_count / task_id 推断。
- `show_worktree_plan` 会基于当前 backlog 任务信息和现有 worktree 占用情况，输出建议的 `agent/<slug>` / `effect-v4.<slug>` 命名，以及同任务占位和共享落点冲突说明。
- `plan_parallel --json` 不再返回裸数组，而是输出 `groups + serial_constraints + active_worktrees` 的结构化对象，便于后续脚本消费。

## 设计约束

- 仍然只有一个真相源：任务信息继续来自 `docs/perf/07-optimization-backlog-and-routing.md`。
- 不引入危险 git 默认动作：不自动创建、切换、删除、清理 worktree；只读取 `git worktree list` 与各 worktree 的 `git status --short`。
- 命名建议优先复用已有同任务 worktree 的 slug；只有在没有现成模式时才从任务标题/问题描述推导 slug。
- `plan_parallel` 的分组与约束对齐当前 backlog 盘面：`Phase 1` 的主三线是 `R-1 + S-2 + F-1`；`S-5` 会作为可选第四线保留，如果稳定任务表暂缺则显式标成 `missing_from_source`；`R-2` 继续 blocked by `R-1`。

## 验证

- `python3 -m py_compile fabfile.py`
- `python3 fabfile.py show_worktree_plan R-1`
- `python3 fabfile.py show_worktree_plan F-1 --json`
- `python3 fabfile.py list_active_worktrees`
- `python3 fabfile.py list_active_worktrees --json`
- `python3 fabfile.py plan_parallel`
- `python3 fabfile.py plan_parallel --json`

## 后续

- 如果要继续往下切，可以在这层之上追加“生成 worktree 创建命令草案”或“生成 subagent 提示词模板”，但仍应保持只读默认，不把 `fabfile.py` 变成危险 git 入口。
