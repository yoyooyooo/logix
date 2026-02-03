---
name: logix-cli-agent
description: 使用 Logix CLI（logix）与 DevServer（logix-devserver）构建可复现的门禁闭环（Oracle→Gate→可选 WriteBack/Transform），覆盖 ir export/validate/diff、trialrun、contract-suite run（context pack / inputs / includeAnchorAutofill）、anchor index/autofill、transform module、Host adapters（--host browser-mock）、DevServer WS（dev.info/dev.workspace.snapshot/dev.run/dev.runChecks/dev.cancel/dev.stop）与 trace 事件桥接；以 stdout 单行 CommandResult@v1/DevServerResponse 与 exit code 0/2/1 为准做自动化裁决与可解释输出。
---

# Logix CLI 跑道

## 快速开始（运行前提）

- 确认命令可用：`logix`、`logix-devserver`（在 PATH 中，或以你项目的安装方式提供）。
- 本 skill 不依赖任何特定仓库文件；不要引用/跳转到仓库里的其它文档路径作为前置条件。

## 决策树（先选你要的产物）

1. 需要“最小闭环 + 最小事实包” → `logix contract-suite run`
2. 需要“结构工件基线/门禁” → `logix ir export` → `logix ir validate` →（可选）`logix ir diff`
3. 需要“锚点缺口 + 最小补丁” → `logix anchor index` / `logix anchor autofill --mode report`
4. 需要“可交互调用/Studio bridge” → `logix-devserver` + `logix-devserver call dev.*`

## 硬规则（必须遵守）

- 始终显式提供 `--runId`；推荐显式提供 `--outRoot`（避免工件覆盖，保证可对比性）。
- 未经明确指示，不要使用 `--mode write`（默认只跑 `--mode report`）。
- `logix-devserver` 默认只读；只读时遇到写回 argv 必须 `ERR_FORBIDDEN`（写回必须显式 `--allowWrite` 启动 devserver）。
- `logix-devserver call` 的进程 exit code **只反映协议调用是否成功**；业务 exit code 要读 stdout JSON 的 `result.outcome.exitCode`。

## 常用剧本（复制即用）

### A) 一键验收（推荐）

目标：一次拿到 `trialrun.report.json` + `contract-suite.verdict.json`，必要时带上 `contract-suite.context-pack.json`（最小事实包）。

- 基本：
  - `logix contract-suite run --runId <id> --entry <path>#<export> --outRoot .logix/out`
- 强制输出 context pack（无论 PASS/FAIL）：
  - `... --includeContextPack`
- 注入最小 inputs（用于编辑上下文/复现）：
  - `... --inputs <file|->`
- 顺带定位锚点缺口（report-only；会额外产出 `patch.plan.json` / `autofill.report.json` 并写入 context pack）：
  - `... --includeAnchorAutofill`
- 需要 trace（非门禁口径）：
  - `... --includeTrace`

### B) IR 门禁（适合做基线对比）

- 导出：
  - `logix ir export --runId <id> --outRoot .logix/out --entry <path>#<export>`
- 校验：
  - `logix ir validate --runId <id> --outRoot .logix/out --in <dir>|--artifact <file>`
- 对比：
  - `logix ir diff --runId <id> --outRoot .logix/out --before <dir|file> --after <dir|file>`

### C) Host adapters（入口包含浏览器全局）

当看到错误码 `CLI_HOST_MISSING_BROWSER_GLOBAL` / `CLI_HOST_MISMATCH`：

- 给对应命令追加：`--host browser-mock`

### D) DevServer（WS bridge）

- 启动（建议带 `--shutdownAfterMs` 防驻留）：
  - `logix-devserver --port 0 --shutdownAfterMs 30000`
- 读 snapshot（workspace + cliConfig）：
  - `logix-devserver call --requestId <id> --method dev.workspace.snapshot`
- 调用 CLI：
  - `logix-devserver call --requestId <id> --method dev.run -- <logix argv...>`
- 需要把 trace 作为 events 桥接给客户端：
  - `logix-devserver call --requestId <id> --method dev.run --trace --includeEvents -- <logix argv...> --includeTrace`

## 引用（按需打开）

- 本 skill 内的“最小合同摘要/协议/错误码/工件约定”：见 `references/contracts.md`
