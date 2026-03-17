# 2026-03-20 · P1-1.1 剩余面收口（externalStore single-field producer-side FieldPathId 预取扩展）

## 结果分类

- `accepted_with_evidence`

## 目标与边界

- 目标：推进 `P1-1.1` 剩余面，只扩展 `externalStore` 单字段 producer-side `FieldPathId` 预取路径。
- 本次保持：
  - 不触达 reducer 动态识别。
  - 不回到 `single-field pathId` 直写链。
  - 不重做 `dispatch PatchAnchor precompile`。
  - 不触达 draft primitive 方向。

## 实施改动

- 文件：`packages/logix-core/src/internal/state-trait/external-store.ts`
- 改动点：
  - 把 `patchPath` / `fieldAccessor` / `commitPriority` 提前到 install 阶段统一构建，module-as-source 与普通 externalStore 写回共用同一 producer-side 句柄。
  - module-as-source 写回分支从 `RowId.getAtPath / RowId.setAtPathMutating` 切到 `fieldAccessor.get / fieldAccessor.set`，去掉该分支的路径字符串解析热税。
  - 保持事务窗口、调度语义、commit priority 映射与诊断语义不变。

## 验证与证据

- `pnpm -C packages/logix-core typecheck:test`：通过
- `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts`：通过（12/12）
- `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts`：通过
  - `single-shallow ratio=0.80496`
  - `single-deep ratio=0.89498`
  - `single-same-value-noop ratio=0.53810`
  - `multi-2 ratio=1.04883`
  - `multi-8 ratio=0.98203`
  - `multi-64 ratio=1.00852`
- `python3 fabfile.py probe_next_blocker --json`：`status=clear`
  - `externalStore.ingest.tickNotify`：passed
  - `runtimeStore.noTearing.tickNotify`：passed
  - `form.listScopeCheck`：passed
  - `threshold_anomaly_count=0`

## 结论

- 单字段高频路径证据为正，邻近 externalStore/browser suite 无回退。
- 该线可作为 `P1-1.1` 剩余面的一次可审查收口。
