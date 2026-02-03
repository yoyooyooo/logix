# 05 · 做一次“基线 → 对比 → diff”（不需要手改源码 / 不需要懂 IR 字段）

目标：把 CLI 当作一种“可稳定对比”的工具：你改动前后到底变了什么？

这一关我们用三份入口文件做对比（避免你手动改源码）：

- `src/entry.basic.ts`：`count: 0`
- `src/entry.basic.count1.ts`：只改初始值（`count: 1`）
- `src/entry.basic.v2.ts`：改“控制面”（moduleId 变更为 `CliPlayground.BasicV2`，用于演示 diff 必然出现）

## 1) 导出一份“基线”（entry.basic.ts）

```bash
pnpm -C examples/logix-cli-playground cli:build
pnpm -C examples/logix-cli-playground exec logix ir export --runId baseline-1 --entry src/entry.basic.ts#AppRoot --outRoot .logix/out
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:ir:export:baseline
```

基线目录：

- `examples/logix-cli-playground/.logix/out/ir.export/baseline-1/`

## 2) 导出一份“当前”（entry.basic.count1.ts）

```bash
pnpm -C examples/logix-cli-playground exec logix ir export --runId current-1 --entry src/entry.basic.count1.ts#AppRoot --outRoot .logix/out
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:ir:export:current1
```

当前目录：

- `examples/logix-cli-playground/.logix/out/ir.export/current-1/`

## 3) 做一次 diff（你会发现：可能“看起来没变”）

```bash
pnpm -C examples/logix-cli-playground exec logix ir diff --runId diff-1 --before .logix/out/ir.export/baseline-1 --after .logix/out/ir.export/current-1 --outRoot .logix/out
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:ir:diff:pass
```

如果你想“一键跑完基线+当前+diff(pass)”，用这个脚本：

```bash
pnpm -C examples/logix-cli-playground cli:ir:demo:pass
```

看输出（report）：

- `examples/logix-cli-playground/.logix/out/ir.diff/diff-1/`

先看这个文件：

- `ir.diff.report.json`：结构化的变更摘要（你不需要理解 IR 字段）

如果你看到 `summary.unchanged: 1`、`changedFiles: []`，这是正常的：  
**只改初始值/运行时行为**，不一定会影响“对外接口工件”，所以 diff 可能是空的。

## 4) 再来一次：改“控制面”，你会看到 diff 变化

导出一个“接口有变化”的版本：

```bash
pnpm -C examples/logix-cli-playground exec logix ir export --runId current-2 --entry src/entry.basic.v2.ts#AppRoot --outRoot .logix/out
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:ir:export:current2
```

再 diff 一次：

```bash
pnpm -C examples/logix-cli-playground exec logix ir diff --runId diff-2 --before .logix/out/ir.export/baseline-1 --after .logix/out/ir.export/current-2 --outRoot .logix/out
```

也可以用脚本（等价；预期 exit code 2）：

```bash
pnpm -C examples/logix-cli-playground cli:ir:diff:violation
```

如果你想“一键跑完基线+当前+diff(violation)”，用这个脚本（预期 exit code 2）：

```bash
pnpm -C examples/logix-cli-playground cli:ir:demo:violation
```

这一次你大概率会看到 exit code 2（表示“发现差异”，这就是 diff 的意义）。

看输出：

- `examples/logix-cli-playground/.logix/out/ir.diff/diff-2/ir.diff.report.json`

> 你只需要把 diff report 当成“结构化的变更摘要/可行动原因”：它更像在对比“对外接口/门禁关心的东西”，而不是对比所有运行时细节。

## 常见问题

- 为什么 diff-1 没变化：因为你只改了初始值；这类改动更像“运行时细节”，不一定会反映在 `ir export/diff` 关注的工件里。
- 为什么 diff-2 变成 exit code 2：因为它真的发现了差异；去看 `ir.diff.report.json` 的 `changedPathsSample` 能快速知道“变在哪里”。
