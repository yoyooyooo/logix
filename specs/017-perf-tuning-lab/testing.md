# 017 · 文档配方的测试覆盖情况

> 这份文档回答一个问题：高级指南里提到的“配方/覆盖优先级/热切换”等契约，是否都有自动化测试兜底。

## 1) 013 控制面（converge）覆盖优先级

覆盖优先级（下一笔事务生效）：`provider > runtime_module > runtime_default > builtin`

已覆盖（✅）：

- `traitConvergeMode` 覆盖优先级与 builtin 默认值
  - `packages/logix-core/test/StateTrait.ConvergeAuto.Config.test.ts`
- `traitConvergeMode` 的热切换（`setTraitConvergeOverride`）与“Provider 仍然最高优先级”
  - `packages/logix-core/test/StateTrait.ConvergeAuto.ModuleOverride.test.ts`
- `traitConvergeBudgetMs` / `traitConvergeDecisionBudgetMs` 的默认值与覆盖优先级链路
  - `packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`

## 2) 017 sweep 的可复现性（跑道层）

017 的 sweep/推荐依赖 014 跑道中对 “PerfReport/thresholds” 的统一口径。

- 跑道与矩阵：`@logix/perf-evidence/assets/matrix.json`
- 采集与落盘：`pnpm perf collect`
- 017 sweep：`pnpm perf tuning:recommend`

说明：

- 017 recommend 支持 `--files` 透传给 014 collect，并支持把 `traitConvergeBudgetMs/traitConvergeDecisionBudgetMs` 纳入 candidates；输出包含 `summary` 与阈值失败信息，便于审计与 LLM 消费。
- `quick/default/soak` 的区别主要是采样次数与超时预算不同；`quick` 适合迭代反馈，但更容易抖动。
- 若结论贴近阈值或出现明显抖动，建议至少用 `default` 或重复跑同一个候选确认。
- `auto<=full*1.05` 属于 runtime 类硬门，由 `converge.txnCommit` 用例自身断言；若失败，采集会直接失败，sweep 会把该候选标记为 error。
- 如遇偶发失败（环境/浏览器波动），可用 `pnpm perf tuning:recommend -- --retries 2` 做有限重试。

## 3) 目前仍是“文档承诺/待补证据”的部分（⚠️）

这些属于“可调但还没纳入统一证据/矩阵”的范围，未来纳入 017 sweep 前应先补齐：

- `stateTransaction.instrumentation`（事务观测开销曲线）
- Devtools 相关旋钮（bufferSize / observer / sampling）的开销曲线
- `traitConvergeBudgetMs` 触发降级时的证据字段（例如 `budget_cutoff` 的聚合计数）

建议从 `specs/017-perf-tuning-lab/knobs.md` 的“候选旋钮”段落开始逐步推进。
