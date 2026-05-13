# 05 · CLI 公共面收口后的 playground 入口

当前 `@logixjs/cli` 的公共命令面只保留：

- `logix check`
- `logix trial`
- `logix compare`

这个 playground 现在只保留最小 public route 演示，不再维护额外的维护级脚本集合。

## 1) 先构建 CLI

```bash
pnpm -C examples/logix-cli-playground cli:build
```

## 2) 跑一次最小 `trial`

```bash
pnpm -C examples/logix-cli-playground cli:trial
```

等价命令：

```bash
pnpm -C examples/logix-cli-playground exec logix trial --runId demo-trial --entry src/entry.basic.ts#AppRoot
```

这条命令当前会返回结构化的 `trialReport`，用于证明 `runtime.trial(mode="startup")` 的公共 CLI 路径仍然稳定。

## 3) `check` 与 `compare` 的输入约定

`check` 消费 `Program` entry。`compare` 消费两份 `VerificationControlPlaneReport` 文件：

- `logix check --runId demo-check --entry src/entry.basic.ts#AppRoot`
- `logix trial --runId demo-trial --entry src/entry.basic.ts#AppRoot --mode startup`
- `logix compare --runId demo-compare --beforeReport ./before.report.json --afterReport ./after.report.json`

报告文件应由 `runtime.check`、`runtime.trial`、DVTools evidence export 或仓内验证流程生成后再交给 CLI。这个 playground 当前不额外包装报告准备动作。

## 4) 查看公共帮助

```bash
pnpm -C examples/logix-cli-playground cli:help
```
