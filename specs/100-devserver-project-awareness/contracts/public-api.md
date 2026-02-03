# Public API: DevServer Project Awareness（100）

> 本文件定义 devserver 的只读 Project Awareness 扩展；实现后需同步回写协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`。

## 方法：`dev.workspace.snapshot`

目的：一次返回 Studio/Agent 所需的最小工作区信息与 CLI 配置（若存在）。

入参（v1）：

- `params?: { maxBytes?: number }`
  - `maxBytes`：限制返回中 `cliConfig` 的预算（默认建议 `65536`）；超限必须裁剪并显式标记。

返回（最小）：

```ts
type WorkspaceSnapshot = {
  repoRoot: string
  cwd: string
  packageManager: "pnpm" | "npm" | "yarn" | "unknown"
  devserver: { protocol: string; version: string }
  cliConfig:
    | { found: false }
    | { found: true; path: string; ok: true; config: unknown; profiles: string[]; truncated?: boolean }
    | { found: true; path: string; ok: false; error: { code: string; message: string } }
}
```

失败（最小，仅用于“请求未被正确处理”的协议层失败）：

- `ERR_INTERNAL`：无法推导 repoRoot / 读文件失败等内部错误（可选携带 cause）

约束：

- `cliConfig.config` 必须是 JsonValue-only（必要时做裁剪/清洗）。
- 不回传源码全文。

## `cliConfig.error.code`（建议最小集合）

- `CLI_CONFIG_NOT_FOUND`：未找到 `logix.cli.json`
- `CLI_CONFIG_INVALID`：找到配置但无法解析/校验（JSON 非法、schemaVersion 不支持、未知字段等）
- `CLI_ENTRY_INVALID`：配置存在但 `defaults.entry` 非法（例如空字符串）
