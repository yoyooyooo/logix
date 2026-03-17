# 2026-03-22 · cross-plane single pulse contract nextwide scout summary

## 结论

- 结论类型：`docs/evidence-only`
- 交付形态：`implementation-ready identify package`
- 代码改动：`none`
- accepted_with_evidence：`false`

## 唯一建议下一刀

- `P1-4F-min core->react single pulse contract`
- 真实瓶颈定位：`dirtyTopics` fanout 后，bridge 侧仍有按 topic/store 的重复调度与 `shouldNotify` 扇出。
- 预期收益面：同时覆盖 `TickScheduler/RuntimeStore` 与 `RuntimeExternalStore/useSelector`，可把通知路径收敛到 module 级单脉冲输入。

## Top2 与取舍

- Top1：`P1-4F-min core->react single pulse contract`（唯一推荐）
- Top2：`P1-4E-min remove unused ModuleRuntimeExternalStore*`（保留为清理候选，收益面小于 Top1）

## API 评估

- public API：当前无需变动。
- internal contract：需要新增 `ModulePulsePacket` 级别合同，统一 core/react 脉冲输入。

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.evidence.json`
- `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`
- `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`
