# 2026-03-06 · F-4：`Fabfile` browser blocker probe

本刀不做 runtime 优化，也不直接跑 full collect；目标只是把“下一个 browser blocker 是谁”收口成更快的只读 probe。

## 实现

更新：
- `fabfile.py`
- `docs/perf/04-agent-execution-playbook.md`
- `docs/perf/07-optimization-backlog-and-routing.md`

新增命令：
- `python3 fabfile.py probe_next_blocker`
- `python3 fabfile.py probe_next_blocker --dry-run`
- `python3 fabfile.py probe_next_blocker --json`

补充能力：
- `probe_next_blocker` 从 `docs/perf/04-agent-execution-playbook.md` 读取 machine-readable 的默认 browser probe 顺序，而不是在 `fabfile.py` 里再发明一套列表。
- 默认只跑 targeted browser suites，顺序对齐当前 playbook 的 browser blocker 优先级：
  - `txnLanes.urgentBacklog`
  - `externalStore.ingest.tickNotify`
  - `runtimeStore.noTearing.tickNotify`
  - `form.listScopeCheck`
- 命令会串行执行，遇到第一个失败立即停止，并报告：
  - 失败的 suite / gate
  - 实际执行命令
  - return code
  - failure_kind（environment / suite）
  - stdout/stderr tail
  - 尚未执行的 remaining suites
- `--dry-run` 只展示顺序与命令，不执行任何 probe。
- `--json` 输出结构化结果，便于后续脚本或主会话直接消费。

## 设计约束

- 保持只读默认：不引入任何 git 写操作，不自动 collect，不创建/删除/切换 worktree。
- 不新增第三套真相源：browser blocker probe 顺序放回 `04-agent-execution-playbook.md`，`fabfile.py` 只解析并执行。
- 不碰 `packages/**`；本刀只改工具层和 perf 文档。
- `main()` 改成按命令懒加载 `tasks/worktrees`，避免 `probe_next_blocker` 为了只跑 browser probe 还额外做无关的 routing/git 读取。

## 验证

- `python3 -m py_compile fabfile.py`
- `python3 fabfile.py probe_next_blocker --dry-run`
- `python3 fabfile.py probe_next_blocker --json --dry-run`
- `python3 fabfile.py probe_next_blocker`

## 证据文件路径

- 本刀无新的 perf report / diff；证据是命令输出本身。
- blocker probe 顺序源：`docs/perf/04-agent-execution-playbook.md`

当前 worktree 实跑结果：
- 首个停止点是 `txnLanes.urgentBacklog`。
- `failure_kind=environment`；stdout 提示 `Local package.json exists, but node_modules missing`，stderr 为 `sh: vitest: command not found`。
- 该结果只说明当前环境不满足 browser probe 运行前提，不应把它直接解读成新的 runtime/perf regression。

## 通过/未通过门

- 通过：`fabfile.py` 能在不跑 full collect 的前提下，快速指出下一个 browser blocker。
- 通过：失败时会停在第一个 blocker，而不是把整串 suites 全跑完。
- 通过：完成后仍满足“只读默认”的工具约束。

## 下一刀计划

- 如果后续需要扩展，可以继续补 `probe_suite <suite-id>` 或 `probe_next_blocker --from <suite-id>`，但仍应维持“命令顺序来自 playbook、默认不触发 full collect”的约束。
