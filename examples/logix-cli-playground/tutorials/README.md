# Logix CLI Playground · 教程（从 0 到 1）

目标：让“刚接手的人”在 **不理解 IR 字段/协议细节** 的前提下，快速学会用 `logix`/`logix-devserver` 做三件事：

1) 一键验收：改完代码后，快速知道能不能过门禁、失败原因是什么  
2) 产出证据：把结果落盘成一组稳定文件，方便 CI/审阅/Agent 消费  
3)（可选）生成补丁计划：只 report 不写回，先把“怎么补”看明白

> 你只需要记住一句话：**先跑一遍 `contract-suite run`，看 verdict + reasons；需要交给 Agent 时再看 context pack。**

## 你会看到的“产物长相”

本教程所有命令默认把输出落到：

- `examples/logix-cli-playground/.logix/out/<command>/<runId>/`

例如：

- `.logix/out/contract-suite.run/demo-contract-pass/contract-suite.verdict.json`
- `.logix/out/trialrun/demo-host-browser-mock/trialrun.report.json`

> 小提醒：这个目录里可能混有你以前跑过的旧目录；**以本教程写的 `<command>/<runId>` 为准**。

## 开始前（一次）

建议先确保 CLI 已构建（多数脚本会自动 build，但你后面会用 `pnpm ... exec logix ...`）：

```bash
pnpm -C examples/logix-cli-playground cli:build
```

> 建议：能用脚本就用脚本（`cli:*`），因为它们会帮你处理“先 build CLI”的坑。

## 递进路径

按顺序走即可（每个目录都是一个“可跑的 demo + 你该看什么”）：

1. `00-smoke/`：一条命令跑通 + 认识输出目录与关键文件
2. `01-fail-and-context-pack/`：故意失败一次，学会“怎么看 FAIL / 怎么把事实包交给 Agent”
3. `02-anchor-autofill-report/`：顺带生成“补丁计划/缺口报告”（只 report，不写回）
4. `03-host-browser-mock/`：入口碰到 `window` 时怎么跑（`--host browser-mock`）
5. `04-devserver-ws-bridge/`：用 `logix-devserver` 把 CLI 变成 WS 可调用（默认只读）
6. `05-baseline-and-diff/`：做一次“基线→对比→diff”（不需要手改源码）
7. `06-transform-module-report/`：（可选）体验 batch transform 的 report-only（看 patch plan，不写回）

## 卡住了先看哪里（最常用）

- **门禁 PASS/FAIL**：先看 `contract-suite.verdict.json` 里的 `verdict` / `reasons`
- **把最小事实交给 Agent**：看 `contract-suite.context-pack.json`
- **“怎么补”的计划**：看 `patch.plan.json`（只 report 时不会改你源码）

## 常见坑（新人最容易卡住的 3 个点）

1) **找不到输出目录**：确认你跑的是 `pnpm -C examples/logix-cli-playground ...`（否则 `logix.cli.json` 可能没生效）  
2) **看见 exit code 2 就慌了**：在本教程里，`01/03/05` 会故意跑出 `2`（这是“门禁失败/发现差异”的信号，不是命令崩了）  
3) **不确定该看哪个 JSON**：优先看 `contract-suite.verdict.json`（人类读），需要交给 Agent/工具再看 `contract-suite.context-pack.json`（机器读）
