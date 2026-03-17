# 2026-03-19 · P1-3 externalStore draft primitive 重开识别（基于已吸收 P1-1.1 / P1-2.1 v2 / P1-2.2c）

## 结论

- `仅在特定触发下重开`

当前不建议直接重启 `P1-3 externalStore draft primitive` 实施线。  
仅当“`externalStore large-batch` 在当前母线再次成为可复现的主要固定税”时，才建议重开，且题目必须收敛为更小切口。

## 唯一建议题目（若触发重开）

- `P1-3R：externalStore large-batch 非 draft primitive 的单路径降税（producer 预绑定 + writeback 热路复用）`

约束：
- 禁止引入 `txn draft primitive`。
- 禁止按 batch 大小切双语义路径。
- 仅允许在现有 state write / module-as-source 语义轨道内做热路降税。

## 证据依据

1. `P1-3` 既有失败事实已明确
- 文档：`docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`
- 已记录现象：`large-batch-only` 在 targeted micro-bench 可转正，但同时触发
  - `StateTrait.ExternalStoreTrait.Runtime` 语义红线
  - `ModuleAsSource.tick` 同 tick 收敛红线
- 结论：此前失败根因在语义风险，不在“是否存在局部性能收益”。

2. 母线已吸收三个关键前置修复，改变了“是否可再观察”的前提
- `P1-2.1 v2` 已吸收：`57cfe0be`
  - 结论文档：`docs/perf/archive/2026-03/2026-03-19-p1-2-1-v2-wholestate-fallback.md`
  - 意义：whole-state fallback 收紧扩面已落地，state-write 误放大面继续缩小。
- `P1-2.2c` 已吸收：`1a346e3b`
  - 结论文档：`docs/perf/archive/2026-03/2026-03-19-p1-2-2c-module-source-tick.md`
  - 意义：`commit -> tick -> module-as-source` 触发链修复已被接受，`P1-3` 当时卡住的关键语义门已被独立修复。
- `P1-1.1` 已吸收：`06d4a7a7`
  - 结论文档：`docs/perf/archive/2026-03/2026-03-19-identify-state-write.md`（将其作为候选 2 的正向依据）
  - 意义：externalStore 单字段热路已有 producer-side `FieldPathId` 预取优化，已覆盖一部分 `P1-3` 当时试图覆盖的 parse 固定税。

3. 基于当前证据，`P1-3` 不再是“唯一可行下一刀”
- `docs/perf/archive/2026-03/2026-03-19-identify-state-write.md` 已将主线优先级放在 `P1-2.1` 扩面，`P1-3` 保持否决态。
- 在 `P1-1.1 + P1-2.1 v2 + P1-2.2c` 均已吸收后，现有证据仍不足以证明“draft primitive 改造”具备更高 ROI。

## 风险

1. 语义回归风险
- 任何重开若再次触碰事务窗口写入模型，都可能重演 `externalStore/runtime` 与 `module-as-source tick` 回归。

2. 双路径复杂度风险
- 若按 batch 阈值分叉执行路径，容易产生维护与诊断分裂，放大后续调优成本。

3. 证据污染风险
- 若在依赖未安装或环境不一致下只看局部 micro-bench，可能误判“可合入”。

## 重开触发条件（必须同时满足）

1. 在当前母线 profile 下，`externalStore large-batch` 被复测为主要瓶颈，且收益面显著高于其它候选刀。  
2. 设计方案不触碰 draft primitive / txn 语义边界。  
3. 语义红线与 probe 门全部可复现转绿。  

## 最小验证命令（重开实施线时）

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
python3 fabfile.py probe_next_blocker --json
```

## 本次会话执行备注

- 本 worktree 当前缺少依赖（`node_modules` 未安装），本次无法在本地直接复跑上述 vitest 命令，命令会报 `vitest: command not found`。
- 本文结论依据已落盘 perf 文档与已吸收提交事实给出，供后续实施线作为开线门禁。

## 后续落点

- 若触发重开，严格实验包见：`docs/perf/archive/2026-03/2026-03-19-p1-3r-reopen-plan.md`
