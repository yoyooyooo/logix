# logix-core StateTransaction perf note (2026-02-22)

## Command

`OUT_FILE=<...> pnpm perf bench:009:txn-dirtyset`

## Baseline files

- before: `.context/perf/logix-core-state-txn-20260222/before.local.default.json`
- after: `.context/perf/logix-core-state-txn-20260222/after.local.default.json`

## Result snapshot

- typical median: `0.522208 -> 0.547209` (`+4.79%`)
- typical p95: `1.609333 -> 1.848459` (`+14.86%`)
- extreme median: `0.589167 -> 0.528625` (`-10.28%`)
- extreme p95: `0.764708 -> 0.759625` (`-0.66%`)

## Interpretation

- 结果为 mixed（typical 变慢、extreme 变快），当前样本下不支持“确定性性能提升/回退”的硬结论。
- 两次采集均出现相同 runtime warning（`options.stateTransaction.instrumentation` 配置无效），但 before/after 条件一致，可作为同口径参考。
