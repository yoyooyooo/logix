# 2026-03-06 · F-1：落最小可用 perf `fabfile.py`

本刀目标不是继续优化 runtime，而是把 `docs/perf/07-optimization-backlog-and-routing.md` 的任务模型落成可执行编排入口。

## 实现

新增：
- `fabfile.py`

当前支持命令：
- `python3 fabfile.py list-tasks`
- `python3 fabfile.py show-task R-1`
- `python3 fabfile.py plan-parallel`

## 设计约束

- 不引入新的真相源；所有任务信息都从 `docs/perf/07-optimization-backlog-and-routing.md` 读取/映射。
- 不内置危险 git 动作；只做只读编排与任务展示。
- 输出字段对齐 `07` 的稳定任务模型：
  - `task_id`
  - `kind`
  - `priority`（由表格顺序和当前推荐组隐式体现）
  - `conflict_level`
  - `parallelizable`
  - `requires_worktree`
  - `files`
  - `verify_commands`
  - `next_gate`

## 验证

- `python3 fabfile.py list-tasks`
- `python3 fabfile.py show-task F-1`
- `python3 fabfile.py plan-parallel`

## 后续

- 如果后续要继续扩展，可以再补：
  - 从 `07` 提取更精确的优先级/阶段
  - 输出 worktree 创建建议
  - 输出 subagent 提示词模板
- 但这些应继续建立在 `07` 上，而不是再发明第二套编排配置。
