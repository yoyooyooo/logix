# Public API: DevServer 安全硬化（101）

## CLI：`logix-devserver`（新增/调整参数）

- `--allowWrite`：显式允许写回（默认 **false**）。
- `--readOnly`：显式只读（等价于未传 `--allowWrite`；可用于脚本自解释）。

默认策略（v1）：

- **默认只读**：未传 `--allowWrite` 时，`capabilities.write === false`。
- 启动时两者同时出现视为用法错误（CLI 侧报错并退出）。

## 协议扩展（建议）

### `dev.info`（新增字段）

- `capabilities: { write: boolean }`

### `dev.run`（拒绝策略）

- 当 `capabilities.write === false` 且 argv 试图执行写回（例如包含 `--mode write` / `--mode=write`），必须返回：
  - `ok:false`
  - `error.code === "ERR_FORBIDDEN"`

最小检测规则（v1）：

- 命中任意 token 序列：
  - `["--mode", "write"]`
  - `["--mode=write"]`
  - `["--mode", "WRITE"]`（大小写是否兼容由实现裁决；推荐严格只接受小写以减少歧义）

## 错误码（v1 最小集合）

- `ERR_FORBIDDEN`：被 server policy 拒绝（只读模式不允许写回）
