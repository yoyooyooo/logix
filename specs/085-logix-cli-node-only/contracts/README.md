# 085 · Logix CLI Contracts

本目录固化 085 的 contracts（长期可存储、可 diff 的协议面），用于平台/CI/Devtools/脚本统一消费：

- `CommandResult@v1`：CLI 输出 envelope（stdout + 落盘引用），承载各类 IR/报告工件
- `public-api.md`：命令表与参数语义（稳定入口）
- `artifacts.md`：工件命名与落盘策略（稳定可预测）
- `safety.md`：report/write 安全边界与写回硬门槛（复用 082）
- `transform-ops.md`：batch transform 的 delta.json 语义（纯数据、可版本化）

## Schemas

- `schemas/cli-command-result.schema.json`
  - Title: `CommandResult@v1`
  - Kind: `CommandResult`
  - Invariants:
    - 强制显式 `runId`（禁止默认时间戳/随机）
    - stdout 默认只输出该 envelope（避免各子命令 JSON 形态漂移）
    - `artifacts[]` 支持 stdout inline 与落盘 file 引用（可同时存在）
    - `ok=false` 时必须包含结构化 `error`（SerializableErrorSummary）

## CLI Exit Code（与 contracts 协同）

为便于 CI 门禁，本 spec 约定 CLI Exit Code：

- `0`：PASS
- `2`：VIOLATION（门禁违规/差异/规则未满足）
- `1`：ERROR（运行失败/异常）
