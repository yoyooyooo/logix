# 2026-03-20 externalstore-threshold-localize-v3 · Summary

## 结论

- 本轮按 `docs/evidence-only` 收口。
- `externalStore.ingest.tickNotify` 继续归类为 `edge_gate_noise`，不保留实现代码改动。

## 关键证据

- 单次 probe：`2026-03-20-externalstore-threshold-localize-v3.probe-next-blocker.json`
- 5 轮 probe：`2026-03-20-externalstore-threshold-localize-v3.probe-wave.json`
- 7 轮 focused：`2026-03-20-externalstore-threshold-localize-v3.focused-wave.json`
- focused 原始输出：`2026-03-20-externalstore-threshold-localize-v3.focused-tests.txt`

## 读法

1. 先看 `probe-wave.json` 的 `blocked_runs` 与 `external_blocked_runs`。
2. 再看 `focused-wave.json` 的 `fail_count` 与 `delta_128_mean_ms`。
3. 若后续出现连续 blocked，可基于同前缀文件直接做前后对比。
