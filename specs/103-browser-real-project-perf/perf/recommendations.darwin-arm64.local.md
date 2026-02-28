# Recommendations (feature 103)

- envId: `darwin-arm64.local`
- comparable: `false`
- regressions: `0`
- scenario threshold deltas: `0`
- memory evidence deltas: `5`
- diagnostics evidence deltas: `4`

## 建议动作

1. 当前 diff 为 triage-only（matrixHash 漂移）；如需硬结论，先在同一 matrix 版本重采 before/after。
2. 优先收窄高频场景的写入范围（route/query/form/burst），避免单事务影响过宽。
3. 对热点读路径细化订阅粒度（selector/useModule），减少无关重算。
4. 若 diagnostics 开销抬升，默认降到 sampled/light，仅对异常切片临时开启 full。
5. 对 memory.soak 中 drift 持续上升的切片，优先检查缓存生命周期与闭包保留。

## 重点切片（前 8）

