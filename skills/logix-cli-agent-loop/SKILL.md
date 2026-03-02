---
name: logix-cli-agent-loop
description: 在本仓使用 logix-cli 做“发现能力 -> 执行命令 -> 解析结果 -> 自我修正”的最小闭环。只要用户提到 logix-cli、CLI 自举、agent 闭环、IR 导出/校验/对比、examples 验证，必须优先使用本 skill，并按这里的闭环步骤执行，不要跳步。
---

# logix-cli-agent-loop

用于让 Agent 在本仓通过 `logix-cli` 自主完成一轮可验证闭环：先探测可用能力，再执行可跑命令，再依据结构化输出决定下一步。

## 1) 适用边界

- 适用：
  - `describe`、`ir.export`、`ir.validate`、`ir.diff`、`anchor.autofill`
  - 在 `examples/*` 上做 CLI 能力验证
  - 需要结构化输出给上层 Agent 决策
- 不适用：
  - 把 `logix-cli` 当成完整 Agent Runtime
  - 直接假定 `trialrun / contract-suite.run / spy.evidence / anchor.index / transform.module` 已可用

## 2) 先做能力探测（强制）

任何执行前，先跑 `describe` 生成当前真值能力快照，不要凭记忆写死命令可用性。

### 2.1 选择 runner

优先顺序：

1. 若存在 `packages/logix-cli/dist/bin/logix.js`，使用：
   - `node packages/logix-cli/dist/bin/logix.js`
2. 否则使用源码 runner：
   - `node --import tsx/esm packages/logix-cli/src/bin/logix.ts`

建议先定义：

```bash
LOGIX_RUNNER="node --import tsx/esm packages/logix-cli/src/bin/logix.ts"
```

如 dist 存在可替换为：

```bash
LOGIX_RUNNER="node packages/logix-cli/dist/bin/logix.js"
```

### 2.2 产出 describe 快照

```bash
$LOGIX_RUNNER describe --runId cli-scan-001 --json --out .artifacts/logix-cli/describe
```

然后读取：

- `.artifacts/logix-cli/describe/describe.report.json`
- stdout 的 `CommandResult`

以 `describe.report.json.commands` 为唯一命令能力真值源。

### 2.3 命令名映射（避免点号误用）

`describe.report.json.commands[].name` 是能力标识，不总是 shell 子命令写法。

- 能力名 `ir.export` -> CLI 调用 `ir export`
- 能力名 `ir.validate` -> CLI 调用 `ir validate`
- 能力名 `ir.diff` -> CLI 调用 `ir diff`
- 能力名 `anchor.autofill` -> CLI 调用 `anchor autofill`

不要直接把能力名原样拼到命令行。

### 2.4 执行前 preflight（建议）

在正式跑闭环前先做一次快速健康检查：

```bash
$LOGIX_RUNNER --help >/dev/null
$LOGIX_RUNNER describe --runId cli-preflight-001 --json >/dev/null
```

若这一步失败，先修复环境（依赖/路径/runner）再进入后续步骤。

## 3) examples 最小闭环流程（默认）

默认在 `examples/logix` 做一轮闭环；可按任务改成其他 `examples/*`。

### 3.1 导出 IR

```bash
$LOGIX_RUNNER ir export \
  --runId cli-loop-ir-export-001 \
  --entry examples/logix/src/scenarios/customer-search/index.ts#CustomerSearchScenario \
  --out .artifacts/logix-cli/ir-export
```

如果入口符号不确定，可先在 `examples/logix/src` 检索导出名并替换 `--entry`。

### 3.2 校验 IR

```bash
$LOGIX_RUNNER ir validate \
  --runId cli-loop-ir-validate-001 \
  --in .artifacts/logix-cli/ir-export \
  --out .artifacts/logix-cli/ir-validate
```

### 3.3 对比 IR（自检可重复性）

用同一产物做自对比，验证“零差异”路径能通过：

```bash
$LOGIX_RUNNER ir diff \
  --runId cli-loop-ir-diff-001 \
  --before .artifacts/logix-cli/ir-export \
  --after .artifacts/logix-cli/ir-export \
  --out .artifacts/logix-cli/ir-diff
```

### 3.4 可选：锚点补齐 dry-run

```bash
$LOGIX_RUNNER anchor autofill \
  --runId cli-loop-anchor-001 \
  --repoRoot . \
  --mode report \
  --out .artifacts/logix-cli/anchor-autofill
```

## 4) 决策规则（闭环核心）

每条命令执行后都要解析 stdout 的 `CommandResult`：

- `ok=true`：进入下一步
- `ok=false` 且 `error.code=CLI_NOT_IMPLEMENTED`：记为“能力未启用”，换到已实现命令，不要卡死
- `ok=false` 且 `error.code=CLI_HOST_MISSING_BROWSER_GLOBAL|CLI_HOST_MISMATCH`：
  - 按 `artifacts[].outputKey=cliDiagnostics` 的建议，用 `--host browser-mock` 重试
- 其他失败：
  - 读取对应 artifact（如 `ir.validate.report.json` / `ir.diff.report.json`）里的 reason 信息，给出修复动作，再执行下一轮

## 5) 输出格式（给上层 Agent/用户）

始终输出以下结构：

1. 运行环境：
   - runner 选择（dist/source）
   - examples 目标目录
2. 命令执行表：
   - command
   - runId
   - exit（0/1/2）
   - ok
   - reasonCode（如有）
   - artifact 路径
3. 能力结论：
   - 已验证可用命令
   - 未启用命令（`CLI_NOT_IMPLEMENTED`）
4. 下一步建议：
   - 基于失败原因的最小修复动作

## 6) 实施注意事项

- 所有命令必须显式 `--runId`。
- 优先 `--out` 落盘，避免只看 stdout。
- 不要把 `describe` 的静态契约当真实执行结果；必须以实际命令返回为准二次确认。
- 不要使用 watch 模式或交互式阻塞流程。
