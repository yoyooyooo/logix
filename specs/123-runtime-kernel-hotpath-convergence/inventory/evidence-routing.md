# Evidence Routing

| Change Type | Requires | Active Route | Background Route | No-Go |
| --- | --- | --- | --- | --- |
| kernel steady-state code change | before + after + diff | `specs/<active-spec>/perf/*.json` | `specs/115-core-kernel-extraction/perf/*.json` | `comparable=false`、profile/env drift、只报口头结论 |
| shell / control-plane 文案或结构整理 | audit only | 对应 spec inventory + docs 回写 | `docs/archive/perf/**` 只作背景 | 不需要硬拉新 perf 采样 |
| reopen 提议 | clean comparable evidence + trigger explanation | 当前活跃 spec 的 `perf/*.json` + reopen ledger | `docs/archive/perf/03-next-stage-major-cuts.md`、`06-current-head-triage.md` | 只有 archive 旧文，没有 current-head 样本 |
| diagnostics-on 优化 | default/off 对照样本 | 当前活跃 spec 的 `perf/*.json` | `115/perf/*.json` | 只证明 diagnostics=on 局部收益，无法解释 default steady-state |

## Notes

- 当前仓库没有 `docs/perf/**` 活跃目录
- active comparable evidence 默认落在 spec 自身 `perf/`
- archive perf 只负责背景、no-go 和记账，不单独构成新事实源
