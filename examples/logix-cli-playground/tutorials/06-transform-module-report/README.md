# 06 · （可选）体验 batch transform（只 report，不写回）

目标：你想对一个 Module 做“多项机械改动”（例如加 state / 加 action），但又不想手动改错。

`logix transform module --ops <delta.json>` 会先产出一个补丁计划（PatchPlan）。本教程只做 `--mode report`，不会写回源码。

本关用的 ops 文件在这里：

- `tutorials/06-transform-module-report/delta.add-state-action.json`

## 1) 先 build（一次）

```bash
pnpm -C examples/logix-cli-playground cli:build
```

## 2) 跑一次 report-only transform

```bash
pnpm -C examples/logix-cli-playground exec logix transform module \
  --runId demo-transform-1 \
  --ops tutorials/06-transform-module-report/delta.add-state-action.json \
  --mode report \
  --outRoot .logix/out
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:transform:report
```

## 3) 看输出（你只需要看两份文件）

- `examples/logix-cli-playground/.logix/out/transform.module/demo-transform-1/patch.plan.json`
- `examples/logix-cli-playground/.logix/out/transform.module/demo-transform-1/transform.report.json`

先看 `transform.report.json`：

- `summary.plannedOperations`：这次计划改多少处（本教程应该是 3）
- `results[]`：每个 op 是否 planned/skipped

再看 `patch.plan.json`：

- `summary.writableTotal`：如果 >0，说明“有东西可以写回（但当前是 report，不会写）”
- `operations[].file`：将要改哪些文件（你关心的落点）

> 注意：写回需要显式 `--mode write`。建议只在你明确知道后果时做，并先在 report-only 下把 patch plan 看明白。

## 常见问题

- `results[].status === "skipped"`：说明这条 op 没法在当前代码形态下“保守生成补丁”，先看 `transform.report.json` 里的原因（再决定要不要手工改）。
