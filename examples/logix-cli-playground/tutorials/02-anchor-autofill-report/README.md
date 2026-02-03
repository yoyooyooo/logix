# 02 · 生成“补丁计划/缺口报告”（只 report，不写回）

目标：当门禁失败/缺字段时，你不想靠肉眼猜 —— 让 CLI 顺带告诉你：

- 缺什么
- 如果要补，最小补丁长什么样（PatchPlan）

## 1) 跑一次“带 autofill 的一键验收”（预期：exit code 0）

复制粘贴：

```bash
pnpm -C examples/logix-cli-playground cli:contract:with-autofill
```

## 2) 找到输出目录

- `examples/logix-cli-playground/.logix/out/contract-suite.run/demo-contract-with-autofill/`

## 3) 先看 `patch.plan.json`（最重要）

你只需要看两处：

- `summary.writableTotal`：如果 >0，说明“有东西可以写回（但当前是 report，不会写）”
- `operations[].file`：将要改哪些文件（你关心的落点）

> `mode: "report"` 表示只生成计划，不会写回源码。真的要写回必须显式 `--mode write`（建议先 report 再 write）。

## 4) 再看 `autofill.report.json`（解释“为什么这么计划/为什么跳过”）

你只需要先看：

- `summary`：统计（写了/跳过了多少）
- `changes[]`：每个文件的决策列表（哪些写、哪些跳过、原因是什么）

## 5) 最后看 `contract-suite.context-pack.json`（给 Agent）

这一步会同时产出 `contract-suite.context-pack.json`，用于把 `patch plan + report` 一起打包交给 Agent。

你只需要知道：它把 `facts.artifacts` 里的 patch plan / report 都带上了。
