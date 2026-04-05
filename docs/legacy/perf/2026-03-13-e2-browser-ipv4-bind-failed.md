# 2026-03-13 · E-2：browser project IPv4 / api bind 试探失败

## 目标

解锁 `packages/logix-react` 的 browser targeted perf，使下面这条命令可稳定运行：

```sh
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

## 试探

文件：

- `packages/logix-react/vitest.config.ts`

试探 1：

- 在顶层 `server` 增加 `host: '127.0.0.1'`
- 进一步增加 `port: 41731`
- 进一步增加 `strictPort: true`

试探 2：

- 不改顶层 `server`
- 只在 browser project 配置下增加：

```ts
test: {
  browser: {
    api: {
      host: '127.0.0.1',
      port: 41731,
      strictPort: true,
    },
  },
}
```

## 已完成验证

### 1. `pnpm` 正常入口

命令：

```sh
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果：

```text
Error:   × Main thread panicked.
  ├─▶ at ... system-configuration-0.6.1/src/dynamic_store.rs:154:1
  ╰─▶ Attempted to create a NULL object.
```

结论：

- `pnpm/proto` shim 本身不稳定

### 2. 直接 `node` 入口，强制 IPv4

命令：

```sh
HOST=127.0.0.1 PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果：

```text
Error: listen EPERM: operation not permitted 127.0.0.1:63315
Serialized Error: { code: 'EPERM', errno: -1, syscall: 'listen', address: '127.0.0.1', port: 63315 }
```

结论：

- `host: '127.0.0.1'` 已生效
- browser server 仍未吃到固定端口配置，继续监听随机端口 `63315`

### 3. 直接 `node` 入口，强制 IPv4 + 固定端口

命令：

```sh
HOST=127.0.0.1 PORT=41731 PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果：

```text
Error: listen EPERM: operation not permitted 127.0.0.1:63315
Serialized Error: { code: 'EPERM', errno: -1, syscall: 'listen', address: '127.0.0.1', port: 63315 }
```

结论：

- 当前 `vitest.config.ts -> server.port/strictPort` 没有影响到 browser project 实际监听端口

### 4. browser project `test.browser.api`

实现：

- 不保留代码
- 仅作为一次性验证试探

验证命令：

```sh
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果：

```text
Error:   × Main thread panicked.
  ├─▶ at ... system-configuration-0.6.1/src/dynamic_store.rs:154:1
  ╰─▶ Attempted to create a NULL object.
```

直接 `node` 入口复核：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

结果：

```text
Error: listen EPERM: operation not permitted 127.0.0.1:41731
Serialized Error: { code: 'EPERM', errno: -1, syscall: 'listen', address: '127.0.0.1', port: 41731 }
```

结论：

- `test.browser.api` 已经生效
- browser project 真实监听端口已从随机端口切到固定 `41731`
- 当前剩余阻塞已经收敛成“环境禁止在 `127.0.0.1:41731` 监听”，不再是配置未生效

## 裁决

- 这条基础设施线当前失败
- 不保留任何配置改动
- 只保留失败记录

## 下一步建议

- 这条线下一步不该再改 Vitest 配置
- 当前配置入口已经收口到 `test.browser.api`
- 应直接诊断“为什么子环境禁止监听 `127.0.0.1:<port>`”
- 若要继续推进 perf 主线，先解决 subagent/browser server 的本地监听权限问题
