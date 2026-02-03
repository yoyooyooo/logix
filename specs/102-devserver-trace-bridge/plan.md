# Implementation Plan: DevServer Trace/Debug Bridge（102）

**Branch**: `102-devserver-trace-bridge` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)

## Summary

把 runtime 的 Slim Trace/诊断事件桥接到 DevServer WS event 流：

- 扩展 event kind：`dev.event.trace.*`（具体见 contracts）
- 为 `dev.run` 增加可选开关：开启时桥接 `trace.slim.json` 为 event chunks（v1 允许 post-run stream）
- 预算治理：maxBytes / chunkBytes / 截断统计

## Constitution Check

- **统一最小 IR / 单一真相源**：trace 仍由 CLI（085）生成（`--includeTrace` → `trace.slim.json`），devserver 只做桥接与预算治理。
- **JsonValue-only**：event payload 全部 JSON-safe；v1 用“JSON 文本 chunks”避免绑定 trace 内部结构。
- **预算可控**：默认不开启 trace；开启时严格执行 `maxBytes/chunkBytes`，超限必须可解释截断。
- **零/近零成本默认值**：未请求 trace 时不引入额外 IO（不读 trace 文件、不发 trace 事件）。

## Project Structure

```text
specs/102-devserver-trace-bridge/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/
    └── public-api.md
```

```text
packages/logix-cli/
└── src/internal/devserver/
    ├── protocol.ts   # dev.run params.trace 类型
    └── server.ts     # trace bridge（started/chunk/finished）+ 预算治理
```

## Design Notes（裁决点）

1. **请求内开关**：不新增独立 method；在 `dev.run` 的 params 内增量扩展 `trace`。
2. **v1 事件序列稳定**：`started` → 0..N `chunk` → `finished`；即便不可用也必须发送 `finished.available=false`。
3. **来源判定**：以 `CommandResult@v1.artifacts[outputKey=traceSlim]` 为唯一依据（先 inline，后 file best-effort）。
4. **预算治理**：
   - chunk 以 bytes 计；超出 `maxBytes` 立即停止并标记 `finished.truncated=true`；
   - 默认值保守（见 `contracts/public-api.md`），避免 WS 大消息阻塞 UI。

## Cross-Reference（需要回写/对齐）

- 协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`（补 `dev.run params.trace` 与 `dev.event.trace.*`）
- CLI 产物：`specs/085-logix-cli-node-only/contracts/artifacts.md`（确认 `traceSlim` 的 `outputKey` 与文件名口径）
