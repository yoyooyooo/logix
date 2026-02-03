# Quickstart: Dev Server Local Bridge（094）

## 1) 启动 devserver

在仓库根目录：

```bash
pnpm -C packages/logix-cli build
node packages/logix-cli/dist/bin/logix-devserver.js --port 0 --shutdownAfterMs 30000
```

启动后 stdout 会输出一行 `DevServerStarted@v1`，从中取 `url`（例如 `ws://127.0.0.1:42137`）。

也会输出 `stateFile`，之后可省略 `--url`，直接从 state file 读取连接信息。

## 1.5) （可选）获取 workspace snapshot（dev.workspace.snapshot）

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-0 --method dev.workspace.snapshot
```

## 2) 发送一个最小请求（dev.run）

用 `logix-devserver call`（推荐：Agent 纯命令行）：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --url "<PASTE_URL_HERE>" --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

或（推荐）省略 `--url`：从 state file 读取：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

或用任意 WS 客户端发送 JSON（示例）：

```json
{
  "protocol": "intent-flow.devserver.v1",
  "type": "request",
  "requestId": "demo-1",
  "method": "dev.run",
  "params": { "argv": ["anchor", "index", "--repoRoot", "examples/logix-cli-playground"] }
}
```

你会收到 `type: "response"`，其中 `result.outcome.kind === "result"` 且 `result.outcome.result.kind === "CommandResult"`。
