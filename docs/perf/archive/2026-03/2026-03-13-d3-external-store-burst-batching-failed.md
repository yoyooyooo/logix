# 2026-03-13 · D-3：externalStore burst writeback batching 试探失败

## 目标

针对 `externalStore.ingest.tickNotify` 的绝对预算债，尝试在
`packages/logix-core/src/internal/state-trait/external-store.ts`
引入跨模块 burst writeback batching，压掉“每个 module 一笔 txn”的固定税。

## 约束

- 不重做 single-field fast path
- 不重做 RuntimeExternalStore notify coalescing
- 保留标准要求 `256/512` 也要稳定向好

## 已完成验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/vitest/vitest.mjs run packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.TxnWindow.test.ts
```

结果：

- `Test Files  2 passed (2)`
- `Tests  9 passed (9)`

### 2. typecheck

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-core/node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

结果：

- 成功退出
- 无 TS 错误

## 未完成验证

### 3. browser targeted perf

方案 A：

```sh
HOST=127.0.0.1 PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

方案 B：

```sh
HOST=127.0.0.1 PORT=41731 PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

两次都失败，原始错误一致：

```text
Error: listen EPERM: operation not permitted ::1:63315
Serialized Error: { code: 'EPERM', errno: -1, syscall: 'listen', address: '::1', port: 63315 }
```

## 结论

- 当前没有拿到 `externalStore.ingest.tickNotify` 的 browser targeted 结果
- 当前无法证明 `256/512` 稳定向好
- 这刀不满足保留标准
- 本轮应按 `failed evidence-only` 收口
- 主分支不应吸收 runtime 代码改动
