# 03 · 入口里碰到 `window` 怎么办（`--host browser-mock`）

目标：你可能接手到一个入口模块，顶层就访问了 `window/document/navigator`。在 Node 里这会直接炸。

CLI 提供 `--host browser-mock`：在 Node 进程里注入“最小浏览器全局”，用于导出/试跑的 best-effort 跑道（不是完整浏览器语义）。

## 1) 先 build（一次）

```bash
pnpm -C examples/logix-cli-playground cli:build
```

## 2) 先跑一次（预期会失败；exit code 2）

```bash
pnpm -C examples/logix-cli-playground exec logix trialrun --runId demo-host-node --entry src/entry.browser-global.ts#AppRoot
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:trialrun:host:node
```

你会在 stdout JSON 里看到结构化错误：

- `error.code === "CLI_HOST_MISSING_BROWSER_GLOBAL"`

> 这是预期行为：它的价值在于“告诉你为什么不能跑、下一步怎么跑”，而不是让你硬跑过去。

## 3) 加上 `--host browser-mock` 再跑一次（预期能跑）

```bash
pnpm -C examples/logix-cli-playground exec logix trialrun --runId demo-host-browser-mock --host browser-mock --entry src/entry.browser-global.ts#AppRoot
```

也可以用脚本（等价）：

```bash
pnpm -C examples/logix-cli-playground cli:trialrun:host:browser-mock
```

看输出目录（这次会落盘）：

- `examples/logix-cli-playground/.logix/out/trialrun/demo-host-browser-mock/`

> 重要：`browser-mock` 只为了“能跑就跑/能导出就导出”。真实浏览器差异（事件/布局/定时器/网络）不在它的目标里。

## 常见问题

- 为什么第 2 步失败后没有 `.logix/out/...`：这是“入口加载阶段”就失败了，CLI 会把结构化错误直接写到 stdout（看 `error.code`）。
