# 00 · 一条命令跑通（Smoke Test）

目标：你不需要懂 IR，只要确认三件事（并能立刻找到证据文件）：

- 命令能跑通
- 产物落在哪
- 成功/失败先看哪个文件

## 0) 你在哪跑（推荐）

在仓库根目录执行（用 `-C` 固定工作目录，避免找不到 `logix.cli.json`）：

- 你只需要复制粘贴命令本身即可

## 1) 跑一次“一键验收”（预期：exit code 0）

复制粘贴：

```bash
pnpm -C examples/logix-cli-playground cli:contract:pass
```

## 2) 找到输出目录（你只需要记住这个规则）

`contract-suite run` 的输出会落在：

- `.logix/out/contract-suite.run/<runId>/`

本教程的 runId 是 `demo-contract-pass`，所以目录是：

- `examples/logix-cli-playground/.logix/out/contract-suite.run/demo-contract-pass/`

## 3) 先看这两个文件（足够你做日常判断）

- `contract-suite.verdict.json`：门禁结论（`verdict=PASS|FAIL`）+ `reasons[]`（失败原因）
- `trialrun.report.json`：试跑报告（用于解释“为什么会这样/缺了什么”）

## 4) 成功标志（你应该看到什么）

打开 `contract-suite.verdict.json`：

- `verdict` 应该是 `PASS`
- `reasons` 应该是空数组

> exit code 规则：`0=PASS / 2=VIOLATION(门禁失败) / 1=ERROR(命令自身错误)`。你只需要用它做脚本/CI 分支即可。

## 常见问题

- 看不到 `.logix/out/...`：先确认你是用 `pnpm -C examples/logix-cli-playground ...` 跑的（这样才会自动发现 `logix.cli.json`）。
