---
title: '@logixjs/sandbox' · 规范索引（渐进式披露）
status: living
---

# `@logixjs/sandbox` · 规范索引（渐进式披露）

> **定位**：Playground / Runtime Alignment Lab 的“可解释执行底座”（隔离 + 协议 + 证据事件），而不是通用代码 runner。

## 建议阅读顺序

1. `05-architecture-and-boundary.md`
2. `10-runtime-baseline.md`
3. `15-protocol-and-schema.md`
4. `20-dependency-and-mock-strategy.md`
5. `25-sandbox-package-api.md`

## 代码落点（用于深挖）

- Host SDK：`packages/logix-sandbox/src/Client.ts`
- Protocol/Types：`packages/logix-sandbox/src/Protocol.ts`、`packages/logix-sandbox/src/Types.ts`
- Worker：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`
- Effect Service：`packages/logix-sandbox/src/Service.ts`
- Vite 插件：`packages/logix-sandbox/src/Vite.ts`

## 上游对齐（runtime SSoT）

- Debug/Trace：`../logix-core/observability/09-debugging.md`
- Trial Run / IR：`../logix-core/api/06-reflection-and-trial-run.md`
