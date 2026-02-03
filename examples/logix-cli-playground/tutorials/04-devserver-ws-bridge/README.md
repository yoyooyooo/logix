# 04 · 用 `logix-devserver` 把 CLI 变成 WS 可调用（默认只读）

目标：有些场景你不想让 Studio/Agent 直接在机器上跑 `logix ...`，而是通过 WS 调用一个常驻 bridge。

这个 bridge 默认 **只读**：即使你通过 `dev.run` 传了 `--mode write`，也会被拒绝（`ERR_FORBIDDEN`）。

## 你需要两个终端（但每条命令都会自动结束）

- **终端 A**：启动 devserver（它会占用前台）
- **终端 B**：发起 `call` 请求

> 如果你不想常驻进程，记住：用 `--shutdownAfterMs` 让它自动退出。

## 1) 终端 A：启动 devserver（2 分钟后自动退出）

最推荐：直接跑脚本（会自动 build，并写入 state file）：

```bash
pnpm -C examples/logix-cli-playground cli:devserver:start
```

等价写法（展开脚本内容）：

```bash
pnpm -C examples/logix-cli-playground exec logix-devserver --port 0 --shutdownAfterMs 120000 --stateFile .logix/out/devserver.state.json
```

启动后 stdout 会打印一段 JSON（`kind: "DevServerStarted"`），里面会包含：

- `stateFile`：你指定的路径
- `url`：WS 地址（你也可以复制出来用 `--url` 直连）

## 2) 终端 B：取一个 workspace snapshot（看看它识别到了什么）

```bash
pnpm -C examples/logix-cli-playground exec logix-devserver call --stateFile .logix/out/devserver.state.json --requestId demo-0 --method dev.workspace.snapshot
```

成功标志：stdout JSON 里 `ok: true`，并且能看到 `result.cliConfig` / `result.repoRoot` 等信息（无需理解其字段）。

## 3) 终端 B：通过 `dev.run` 调用一条 logix 命令（示例：anchor index）

```bash
pnpm -C examples/logix-cli-playground exec logix-devserver call --stateFile .logix/out/devserver.state.json --requestId demo-1 --method dev.run -- anchor index --repoRoot .
```

> 提示：`dev.run` 会在 argv 缺失 `--runId` 时自动注入 `--runId <requestId>`，所以你可以直接用 requestId 当 runId。

## 4) 只读防误写：试着传 `--mode write`（预期被拒绝）

```bash
pnpm -C examples/logix-cli-playground exec logix-devserver call --stateFile .logix/out/devserver.state.json --requestId demo-2 --method dev.run -- anchor autofill --repoRoot . --mode write
```

你会收到 `ERR_FORBIDDEN`（且不会实际执行写回）。你只需要关注 stdout JSON：

- `ok: false`
- `error.code: "ERR_FORBIDDEN"`

> 想允许写回：启动 devserver 时显式加 `--allowWrite`（但建议先把 report-only 链路跑熟再开）。

## 常见问题

- `ERR_STATE_NOT_FOUND` / “no state file found”：确认终端 A 启动时指定的 `--stateFile` 路径，和终端 B 调用时使用的是同一个。
- 想手动结束 devserver：直接等 `--shutdownAfterMs` 到点退出即可（本教程默认 2 分钟）。
