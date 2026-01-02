# Contract: Perf evidence suites（070）

## 必跑（交付结论）

### 1) Node：`converge.txnCommit`

- 目的：验证 trait converge 的 decision/dirtySummary 门控与 DebugSink fast-path 不引入回归，并捕捉默认税改善。
- 命令形态：见 `specs/070-core-pure-perf-wins/plan.md` 的 `Perf Evidence Plan（MUST）`。

### 2) Browser：`diagnostics.overhead.e2e`

- 目的：验证 diagnostics/Devtools 相关开销在 off 档保持近零成本，并捕捉默认税改善。
- suite 文件：`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`

## 可选（定位与扩展）

- 若回归定位需要缩小范围，可在 `pnpm perf collect` 使用 `--files` 指定单文件子集，先用 `profile=quick` 探路，再用 `profile=default` 下硬结论。
