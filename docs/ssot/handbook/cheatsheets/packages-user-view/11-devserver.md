---
title: 11) `logix-devserver`（DevServer Local WS：call + governance）
status: draft
version: 1
---

# 11) `logix-devserver`（DevServer Local WS：call + governance）

## 你在什么情况下会用它

- Studio/Agent：需要用 WS 调用 `logix` 的能力，而不是直接在本机跑 CLI。
- CI/脚本：需要一个“短命常驻进程”统一执行 `dev.run/dev.runChecks`，并通过 state file 自动发现连接信息。

## 主命令（按用途）

- 启动：`logix-devserver [start] --host 127.0.0.1 --port 0 [--shutdownAfterMs <ms>] [--token <token>] [--allowWrite|--readOnly]`
- 治理：`logix-devserver status|health|stop`
- 调用（纯命令行 client）：`logix-devserver call --requestId <id> --method <name> -- <logix argv...>`

WS 方法表（v1）：

- `dev.info`：返回 `protocol/version/cwd/capabilities.write`
- `dev.workspace.snapshot`：返回 repoRoot/cwd/包管理器/cliConfig（100）
- `dev.run`：等价执行 `logix <argv...>`（默认会注入 `--runId <requestId>`）
- `dev.runChecks`：按 `checks=[typecheck|lint|test]` 执行 `pnpm <check>`，返回 `durationMs + diagnostics[]`
- `dev.cancel`：取消目标 requestId
- `dev.stop`：请求停止服务（配合 stop 命令/shutdownAfterMs 使用）

## 关键约束（避免踩坑）

- 默认只读：未传 `--allowWrite` 时，`capabilities.write === false`，并会拒绝 `dev.run` 里包含 `--mode write`（返回 `ERR_FORBIDDEN`）。
- `call` 的 exit code 只反映“协议调用是否成功”（`ok:true/false`）；业务结果要看 stdout JSON 里的 `result.outcome.exitCode`。
- state file 自动发现：默认写到 `os.tmpdir()/intent-flow/logix-devserver/<repoRootHash>.json`，目录/文件权限 best-effort 固化为 `0700/0600`（非 win32）。

## trace（可选）

- 若要在 `dev.run` 中桥接 `trace.slim.json`：`logix-devserver call --trace ... -- <logix argv>`，并确保 `logix argv` 里显式包含 `--includeTrace`。
- 若要让 `call` 把 events 一起输出：加 `--includeEvents`（否则 events 仍会走 WS，但 `call` 不累积）。

## 复制粘贴（最短可跑）

```bash
pnpm -C packages/logix-cli build
node packages/logix-cli/dist/bin/logix-devserver.js --port 0 --shutdownAfterMs 30000
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-0 --method dev.workspace.snapshot
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

## 最小落地（仓库内）

- 协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`
- CLI 合同与 quickstart：`specs/094-devserver-local-bridge/contracts/public-api.md`、`specs/094-devserver-local-bridge/quickstart.md`
- 一体化教程（含 CLI 跑道）：`docs/ssot/handbook/tutorials/46-cli-oracle-gate-devserver-bridge.md`
- 递进式上手（只看 devserver 这一关）：`examples/logix-cli-playground/tutorials/04-devserver-ws-bridge/README.md`
