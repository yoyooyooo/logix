# Verification Examples

本目录承接 `examples/logix` 下用于 `runtime.check / runtime.trial / runtime.compare` 的最小验证入口。

## 模板

- `fixtures/env`
  - 记录运行环境、layer、host 预设
- `steps`
  - 记录 trial / compare 的执行步骤
- `expect`
  - 记录 verdict、summary、关键 artifacts 断言

## 当前入口

- [index.ts](./index.ts)
- 代表样例继续复用 `../scenarios/trial-run-evidence.ts`
