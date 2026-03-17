# 2026-03-19 · P1-1.1 externalStore single-field producer-side FieldPathId 预取复用

## 结果分类

- `accepted_with_evidence`

## 目标与边界

- 只做 `externalStore` single-field 高频路径的 producer-side 预取与复用。
- 明确排除：
  - reducer 动态 pathId 识别
  - 全量 PatchAnchor 扩面
  - external-store draft primitive / batch dual path

## 实施改动

- `packages/logix-core/src/internal/state-trait/external-store.ts`
  - 在 install 阶段对 `normalizeFieldPath(fieldPath)` 的 single-field 路径做一次性 producer-side 预取标记。
  - writeback 热路统一复用同一 `prefetchedPatchPath`，不在每次写回里重新构造 patch path 句柄。

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 为 fast patch array 增加 `WeakMap` 缓存：`path-array-ref -> { registry, fieldPathId }`。
  - single-field fast array 在首次解析出 `FieldPathId` 后，后续同引用路径直接复用 id。
  - 新增 helper：`prefetchProducerPatchArrayPath`（producer-side 预取入口）。

- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - 对齐使用 `prefetchProducerPatchArrayPath`，避免调用面分叉。

## 验证摘要

通过：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts -t "single-field shallow writeback should not re-parse fieldPath at runtime"
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts -t "single-field deep same-value no-op should not re-parse fieldPath at runtime"
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts
python3 fabfile.py probe_next_blocker --json
```

关键正证据（single-field perf）：

- `single-shallow ratio=0.7942`
- `single-deep ratio=0.8743`
- `single-same-value-noop ratio=0.5526`
- `multi-2 ratio=0.9812`
- `multi-8 ratio=1.0039`
- `multi-64 ratio=0.9994`

补充说明（已知存量红线，非本刀引入）：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleAsSource.tick.test.ts -t "should settle A->B writeback and downstream derived within the same tick|should apply Module-as-Source during scheduled microtask tick (no manual flushNow)"
```

- 与历史记录一致，仍有 `externalStore ingest perf skeleton` 与 `ModuleAsSource.tick` 相关红线。
- 当前 `probe_next_blocker` 为 `clear`，三条 gate 全绿。

## 证据落盘

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-1-1-fieldpathid.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-1-1-fieldpathid.semantic-guard.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-1-1-fieldpathid.probe-next-blocker.json`
