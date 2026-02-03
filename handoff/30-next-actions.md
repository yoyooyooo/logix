# Next Actions（可执行，按优先级）

## CLI/DevServer（状态）

- M2+ 已达标：`099/100/101/102`（Host adapters + snapshot + 默认只读护栏 + trace 事件桥接）
- vNext（按需另立 spec）：Playwright/真实浏览器 runner、trace 结构化 items / realtime streaming、更细粒度 allowlist/capabilities

## 下一优先级（回到四条跑道）

1. 跑道 1（Runtime Core / Control Laws，总控 077）：优先从 `specs/077-logix-control-laws-v1/spec-registry.json` 的未完成成员开刀（性能/一致性/控制律）
2. 跑道 2（Async Coordination，总控 087）：先收口协议与 policy，再落地 088–092
3. 跑道 3（Observability Protocol + Devtools，总控 005）：先保证协议/trace slim 的“可解释链路”，再做 UI 消费面
