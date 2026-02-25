# logix-best-practices

面向 Logix 开发的实践 skill：先保证业务交付，再对齐 Runtime 约束，最后保证平台可解释。

## 你现在在哪一层

- `L0`（先交付业务）：先看 `SKILL.md` 的“30 秒选路”，然后读 `references/workflow.md`
- `L1`（模块协作语义）：重点读 `references/logix-core-notes.md`
- `L2`（核心路径改动）：重点读 `references/diagnostics-and-perf-gates.md`
- `L3`（平台/对齐实验）：重点读 `references/platform-integration-playbook.md`

完整路线图：`references/task-route-map.md`

## 最快上手

1. 用 `SKILL.md` 的分流选择当前任务类型。
2. 按对应路线阅读 `references/*` 并完成 `workflow.md` 的 DoD。
3. 涉及核心路径时，补齐性能与诊断证据，再交付。

## LLM 资料包（可转 llms.txt）

- 入口索引：`references/llms/README.md`
- 核心术语：`references/llms/01-core-glossary.md`
- 基础 API：`references/llms/02-module-api-basics.md`
- 协作与流程：`references/llms/03-flow-process-basics.md`
- 事务与运行时：`references/llms/04-runtime-transaction-rules.md`
- React 使用：`references/llms/05-react-usage-basics.md`
- 诊断与性能：`references/llms/06-diagnostics-perf-basics.md`
- 测试：`references/llms/07-testing-basics.md`
- Builder / IR / Codegen：`references/llms/08-builder-ir-basics.md`
- 项目锚点模板（可选）：`references/llms/99-project-anchor-template.md`

## 安装

### 1) Skillshare

官方仓库：`https://github.com/runkids/skillshare`

```bash
# 安装本 skill（project mode 示例）
skillshare install github.com/<owner>/<repo>/skills/logix-best-practices -p
skillshare sync
```

### 2) Vercel Skills CLI（`npx skills`）

官方仓库：`https://github.com/vercel-labs/skills`

```bash
# 从仓库安装到 Codex（项目级）
npx skills add <owner>/<repo> --skill logix-best-practices -a codex

# 全局安装示例
npx skills add <owner>/<repo> --skill logix-best-practices -a codex -g
```

说明：把 `<owner>/<repo>` 替换为你发布该 skill 的仓库地址。
