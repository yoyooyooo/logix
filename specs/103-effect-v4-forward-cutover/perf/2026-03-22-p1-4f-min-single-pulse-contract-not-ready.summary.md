# 2026-03-22 · P1-4F-min single pulse contract not-ready summary

## 结论

- 结论类型：`docs/evidence-only`
- 结果分类：`discarded_or_pending`
- 代码改动：`none`
- accepted_with_evidence：`false`

## 主要 blocker

1. `TickScheduler` selector active contract 仍绑 `readQuery subscriber count`。  
2. `RuntimeExternalStore` 的 readQuery activation retain 生命周期未迁移。  
3. `useSelector` 的单订阅路径合同未定。

## 裁决

- `P1-4F` 当前不进入实现线。
- 先完成合同定义与验证门，再重开最小实现尝试。

## 证据文件

- `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.evidence.json`
