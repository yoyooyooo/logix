# Tasks: DevServer Process Governance（098）

## P0（state file）

- [x] 定义 `DevServerState@v1`（url/pid/cwd/host/port/token?）
- [x] 启动时写 state file；退出时清理（防止 stale）
- [x] 默认 state file 路径：基于 repoRoot 的 tmp；可通过 `--stateFile`/env 覆盖

## P1（治理命令）

- [x] `status/health`：读取 state file → 调 `dev.info` → 输出 `DevServerStatus@v1`
- [x] `stop`：读取 state file → 调 `dev.stop` → 清理 state file

## P2（token）

- [x] `--token`/`LOGIX_DEVSERVER_TOKEN`：启动时写入 state；请求携带 `auth.token`
- [x] token 模式缺失/错误返回 `ERR_UNAUTHORIZED`
