# 10) `@logixjs/cli`（`logix` CLI：导出/门禁/写回）

## 你在什么情况下会用它

- Agent/CI：做可门禁的导出、校验、diff、试跑（trialrun/contract-suite）。
- 把“多文件改动”收敛为“最小补丁计划/写回结果”，可审阅、可幂等（默认只 report，不写回）。

## 主命令（按链路）

- 导出：`logix ir export`、`logix trialrun`
- 门禁：`logix ir validate`、`logix ir diff`、`logix contract-suite run`（可选 `--includeAnchorAutofill` 一次性带上补丁计划/缺口报告）
- 写回：`logix anchor index`、`logix anchor autofill --mode report|write`
- Transform：`logix transform module --ops <delta.json> --mode report|write`
- Evidence：`logix spy evidence`

## 最小落地（仓库内）

- 规格与完整示例：`specs/085-logix-cli-node-only/quickstart.md`
- 最小可运行 demo：`examples/logix-cli-playground`（含 `logix.cli.json`/profiles、`--inputs` 注入与 `--includeContextPack`）
- 递进式教程（新人从 0→1）：`examples/logix-cli-playground/tutorials/README.md`
- 长文教程（跑道/剧本集）：`docs/ssot/handbook/tutorials/46-cli-oracle-gate-devserver-bridge.md`
- DevServer Bridge（WS 调用 `logix`）：`docs/ssot/handbook/cheatsheets/packages-user-view/11-devserver.md`

## 复制粘贴（最短可跑）

用仓库自带 demo（它自带 `logix.cli.json`，命令最短、最不容易踩参数坑）：

```bash
pnpm -C examples/logix-cli-playground cli:contract:pass
pnpm -C examples/logix-cli-playground cli:contract:with-autofill
```

产物默认落在 `examples/logix-cli-playground/.logix/out/`（先看 `contract-suite.verdict.json` / `trialrun.report.json`）。

## 关键约束（为什么值得）

- stdout：严格单行 JSON（便于脚本/CI 解析）
- exit code：`0=PASS` / `2=VIOLATION` / `1=ERROR`
- `--runId`：必须显式提供（决定工件命名与可对比性）
- `--mode report`：默认只生成“补丁计划”（不写回）；`--mode write` 才会写回
- 推荐短命令：用 `logix.cli.json`（cwd 向上查找，或 `--cliConfig` 显式指定）+ `--profile` 收敛默认参数；布尔类支持 `--flag/--noFlag` 且“最后出现者胜”
- 目录收敛：用 `--outRoot <dir>`（或配置 defaults.outRoot），在未显式 `--out` 时自动落盘到 `<outRoot>/<command>/<runId>`
