# 2026-03-19 · state write / data plane 方向识别（PatchAnchor / FieldPathId / whole-state fallback / externalStore）

## 输入与边界

- 本文基于 read-only 分析。
- 重点参考：
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
  - `docs/perf/archive/2026-03/2026-03-18-s1-externalstore-regression-localize.md`
  - `docs/perf/archive/2026-03/2026-03-18-s1-threshold-modeling.md`
  - `docs/perf/archive/2026-03/2026-03-18-form-threshold-modeling.md`
  - `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`
  - `docs/perf/archive/2026-03/2026-03-17-p1-1-single-field-pathid-discarded.md`
  - `docs/perf/archive/2026-03/2026-03-15-p1-whole-state-fallback-top-level-dirty.md`

## 当前事实压缩

1. `P1-2` 已继续吸收到 `v3`。
- 现状是：`dispatch/reducer + action state writeback(kind:update)` 已从初始 top-level dirty evidence 收紧到更广 state-write 入口。
- 最新吸收切口见 `docs/perf/archive/2026-03/2026-03-19-p1-2-1-v3-state-write.md`。

2. `P1-1` 已有两次失败信号。
- `dispatch PatchAnchor precompile`：尾部收益不稳，`many` 场景 `p95` 变差。
- `single-field pathId` 直写链：reducer 侧贴边 micro-bench 明确负收益。
- 结论是 reducer 运行时动态识别单字段再转 id 的策略当前不成立。

3. `P1-3` 原题已否决，但 `P1-3R` 的窄切口已吸收。
- `draft primitive / large-batch-only` 仍维持否决。
- 已吸收的窄切口见 `docs/perf/archive/2026-03/2026-03-20-p1-3r-accessor-reuse.md`。
- 结论：后续不再以 `P1-3R` 作为默认下一线。

4. `externalStore` 近期阻塞主要来自阈值建模表达，非 runtime 新回退。
- `S-1` 已通过 `minDeltaMs` 建模收口，`probe_next_blocker --json` 连续 clear。
- 说明下一刀应优先压真实 runtime 固定税，避免再把 gate 噪声当瓶颈。

## 剩余 future cut（state write / data plane）

### 候选 1（优先级 1）：`P1-1.1` externalStore 单字段 producer-side `FieldPathId` 预取

切口定义：
- 只做 externalStore single-field 高频路径。
- 在 producer/setup 阶段一次性解析并缓存 `FieldPathId`，writeback 热路直接复用。
- 明确排除 reducer 运行时动态识别与全量 PatchAnchor 预编译扩面。

正面收益：
- 命中 single-field 高频路径，可减少每次写回 path 解析成本。
- 范围窄，回滚边界清晰，适合作为受控试探刀。

反面风险：
- `FieldPathIdRegistry` 生命周期与缓存一致性管理复杂，错误会导致 id 漂移或回退抖动。
- 若缓存命中率不足，收益可能被维护成本抵消。

API 变动可能性：
- 预计不需要公开 API 变动，可先内部实现。
- 若后续要外显为可配置策略，才可能引入内部配置面扩展。

为何不会重蹈 `P1-3` 失败：
- 不触碰 draft mutate primitive，不做 batch-size 双路径事务改写。
- 不改变 module-as-source tick 语义，仅优化路径标识准备阶段。
- 语义面比 `P1-3` 更窄，守门成本更低。

## 唯一建议下一线

当前不再默认建议新开 state-write 实施线。

- `P1-2.1 v3` 已吸收。
- 若后续需要继续推进，优先顺序改为：
  1. `P1-1.1`

## 最小验证命令（下一线实施时）

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
python3 fabfile.py probe_next_blocker --json
```

## 开线建议

- 当前建议：`不开`
- 仅当 state-write 再次成为下一轮明确 residual 时，再评估是否只开 `P1-1.1`。
