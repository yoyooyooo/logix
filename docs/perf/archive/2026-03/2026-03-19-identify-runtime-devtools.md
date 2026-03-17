# 2026-03-19 · identify runtime devtools / observability plane（read-only）

## 结论先行

### top2

1. **P2-4A：Projection Budget 证据链升级（按事件维度可归因）**
2. **P2-4B：Dirty Evidence 单一物化管线（live/import 同口径）**

### 唯一建议下一线

- **建议开 P2-4A（Projection Budget 证据链升级）**  
  该线直接命中 `slim event + debug sink + devtools projection + evidence` 的同一断点，改动范围集中在 observability plane，可独立验证，不依赖再次切回已失败的 runtime 微切口。

## 识别依据（只读）

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - `toRuntimeDebugEventRef(..., onMetaProjection)` 已拿到每事件投影统计 `stats + downgrade`，当前只在 Hub 中累计成总量，未形成可追责事件链。
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - `devtoolsHubSink.record` 仅累加 `exportBudget.{dropped,oversized}`（全局/按 runtime），没有按 `event.kind / label / moduleId / instanceId` 维度可解释归因。
  - `exportDevtoolsEvidencePackage` 导出 summary 仅覆盖 converge static IR digest 映射，未携带 projection budget 归因摘要。
- `packages/logix-devtools-react/src/internal/state/converge/compute.ts`
  - 仅消费 `event.downgrade.reason`，没有消费投影统计维度，审计只能看到“降级发生”，看不到“在哪条热路径反复发生”。
- `packages/logix-devtools-react/src/internal/state/logic.ts`、`packages/logix-devtools-react/src/internal/state/compute.ts`
  - import 路径会物化 `rootPaths`，live 路径会 gate `rootPaths`。两套物化/裁剪逻辑分散，未来字段演进容易出现展示口径漂移。

## top2 详细

## P2-4A：Projection Budget 证据链升级（推荐）

### 正面收益

- 让 `exportBudget` 从“总量计数”升级为“可归因证据链”，可直接回答哪个事件类别/模块在消耗投影预算。
- Devtools 可给出 TopN budget hotspot，减少只看 `dropped/oversized` 总数时的盲区。
- Evidence 导出可离线复盘 budget 异常，支撑 perf 基线对比。

### 反面风险

- 若归因字段过多，可能增加 Hub 热路径开销与内存占用。
- 若直接把明细塞进每条事件 meta，可能抬高 ring buffer 压力。

### API 变动

- **建议最小外部 API 变动**：保持 `RuntimeDebugEventRef` 结构不破坏，优先新增可选 summary 通道。
- 候选方案：
  - 在 `DevtoolsSnapshot.exportBudget` 下新增可选 `byKind/byModule` 汇总字段。
  - 在 `EvidencePackage.summary` 下新增 `projectionBudget` 摘要块（协议版本前向增加可选字段）。

### 最小验证命令

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run test/internal/runtime/core/DevtoolsHub*.test.ts test/internal/runtime/core/DebugSink*.test.ts
pnpm -C packages/logix-devtools-react exec vitest run test/internal/state/*.test.ts test/internal/state/converge/*.test.ts
```

## P2-4B：Dirty Evidence 单一物化管线（备选）

### 正面收益

- live snapshot 与 imported evidence 共享一套 `dirtySet/pathIds/rootIds/rootPaths` 物化与 gate 规则，减少双实现漂移。
- IR digest 缺失、字段升级、兼容旧 evidence 时行为更可预测，减少 devtools 误展示风险。

### 反面风险

- 需要在 core 与 devtools-react 之间重划边界，短期会触及多文件联动。
- 若抽象位置不当，可能把 devtools 展示策略耦合进 core。

### API 变动

- 可能新增 `@logixjs/core` 的只读 helper（如 canonical materialize/gate util）供 devtools 复用。
- 或保持外部 API 不变，仅内部模块重组。

### 最小验证命令

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-devtools-react typecheck:test
pnpm -C packages/logix-devtools-react exec vitest run test/internal/state/logic*.test.ts test/internal/state/compute*.test.ts
```

## 是否建议后续开实施线

- **建议：是。**
- **优先顺序：先开 P2-4A，一条线完成后再评估是否进入 P2-4B。**
