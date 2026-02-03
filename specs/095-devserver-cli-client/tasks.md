# Tasks: DevServer CLI Client（095）

## P0（纯命令行 client）

- [x] `logix-devserver call`：按 `requestId` 等待最终 response（忽略 event）
- [x] `call`：exit code 语义 0/1/2 + stdout 单行 JSON
- [x] `call`：支持 `--includeEvents`（把 events 累积到最终输出）
- [x] `call`：支持从 state file 解析 `url/token`（省略 `--url`）

## P1（回归与文档）

- [x] 集成测试覆盖：启动 devserver → 从 `stateFile` 无 `--url` 调 `dev.info`
- [x] 更新 demo 文档：`examples/logix-cli-playground/README.md` / `specs/094` quickstart
