# Verification Examples

本目录承接 `examples/logix` 下用于 `runtime.check / runtime.trial / runtime.compare` 的最小验证入口。

## 模板

- `fixtures/env`
  - 记录运行环境、layer、host 预设
- `steps`
  - 记录 trial / compare 的执行步骤
- `expect`
  - 记录 verdict、summary、关键 artifacts 断言

## Scenario Corpus

- [scenario-corpus.ts](./scenario-corpus.ts) is the verification-owned scenario corpus.
- It uses only `fixtures/env + steps + expect`.
- It is not generated from Playground scenario metadata.
- It is not a public scenario authoring API.
- It is not executable by CLI `trial --mode scenario` until a core-owned scenario executor exists.

## 当前入口

- [index.ts](./index.ts)
- 代表样例继续复用 `../scenarios/trial-run-evidence.ts`
