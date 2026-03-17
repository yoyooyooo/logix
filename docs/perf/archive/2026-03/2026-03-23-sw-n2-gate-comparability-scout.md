# 2026-03-23 · SW-N2 gate comparability scout（docs/evidence-only）

## 结论

- `SW-N2` 当前仍不进入实现线
- 阻塞门仍是 `pnpm -C packages/logix-core test` 必须全绿
- 当前唯一失败门更像 **full-suite perf gate 噪声**，不足以推出新的 `SW-N2` 实现切口

## 证据

### 1. current-head probe

- `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=clear`
- 仅保留既有 soft watch：
  - `externalStore.ingest.tickNotify / full-off<=1.25 / gateClass=soft`

### 2. 全量 `packages/logix-core test`

- 当前唯一失败：
  - [StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf/packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts)
- 该次 full-suite 失败样本：
  - `single-shallow ratio = 1.0519`

### 3. 独立单跑 5 轮复核

独立运行：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts
```

结果：

1. `run1`：通过
2. `run2`：通过
3. `run3`：通过
4. `run4`：通过
5. `run5`：失败

关键 ratio：

- `single-shallow`：`0.683 ~ 0.746`
- `single-deep`：`0.866 ~ 0.918`
- `single-same-value-noop`：`0.533 ~ 0.561`
- `multi-8`：`0.946 ~ 1.101`
- `multi-64`：`0.958 ~ 1.052`

裁决：

- 单独运行时，`single-shallow` 与 `single-deep` 都稳定在门内
- 唯一 isolated 失败来自 `multi-8 = 1.1006`，只是轻微越线
- 这说明当前 failing suite 更像 **负载敏感 / 热机漂移 / 采样噪声**，而非稳定的 `SW-N2` 结构回归

## 识别结论

### 当前瓶颈排行

1. `SW-N2`
   - 仍被 correctness/perf gate 挡住
   - 当前失败样本未形成稳定、可归因的实现切口
2. `R-2`
   - 仍缺外部 `SLA-R2`
3. `P1-3R`
   - trigger 不成立
4. `P2-1`
   - trigger 不成立

### 为什么现在不开 `SW-N2` 实现线

1. `probe_next_blocker` 没有给出新的 hard blocker
2. `packages/logix-core test` 的失败集中在单一 perf suite
3. 同 suite 独立复跑没有稳定复现同一失败形态
4. 因此当前继续改 `SW-N2` 代码，只会把真实瓶颈与测量噪声混在一起

## 建议下一步

- 不开新的 `SW-N2` 实现线
- 若继续，只建议开更窄的 docs-only / gate-only 线：
  - `StateTrait.ExternalStoreTrait.SingleFieldFastPath` 的 threshold audit / sampling audit
- 在这条门禁稳定前，`SW-N2` 继续保持 watchlist
