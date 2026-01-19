# Data Model（depsIndex / policy / trace）

## 1) Source Auto-Trigger Policy（对外契约）

目标：用最小参数描述受限控制律，避免把通用 Flow 塞回 trait meta。

建议形态（概念）：

```ts
type SourceAutoRefresh =
  | { readonly onMount?: boolean; readonly onDepsChange?: boolean; readonly debounceMs?: number }
  | false // manual-only
```

默认值：

- `autoRefresh` 未提供：等价于 `{ onMount: true, onDepsChange: true, debounceMs: 0 }`
- `autoRefresh: false`：关闭自动触发，但允许显式触发 refresh；Platform-Grade/LLM 出码推荐通过 `callById('logix/kernel/sourceRefresh')`（避免形成不可对齐的“手写特权路径”；`call(KernelPorts.sourceRefresh)` 仅作为 TS sugar）

## 2) depsIndex（增量定位）

**输入**：

- `sources[]`：从 TraitProgram 收集的 source entries（fieldPath + deps + policy）
- `dirtyPaths[]`：一次提交中的变更路径（来自 StateTransaction patch）

**核心数据结构**：

```text
depsIndex: Map<DepPatternPathId, SourceFieldPathId[]>
```

关键点：

- 依赖匹配按 pattern path（例如 `items[].warehouseId`）而不是具体 index 路径；
- `dirtyPaths` 同样需要 canonicalize（`items.0.warehouseId` → `items[].warehouseId`）。

约束：

- build 时 `O(totalDeps)` 构建；
- commit 时 `O(|dirtyPaths| + |affectedSources|)` 查找；
- 禁止 commit 时扫描全部 sources。

## 3) Runtime State（debounce 合并）

```text
debounceState: Map<SourceFieldPathId, { deadlineAtMs: number, pending: boolean }>
```

说明：

- debounce 只用于合并触发，不改变 source refresh 的 keyHash gating 语义；
- 实现上应尽量复用 073 的 tick/time 设施（避免在业务层/feature 包制造影子计时器）。

## 4) Trace / Diagnostics（最小证据）

建议事件（概念）：

- `trace:source.auto`（diagnostics=light/sampled/full）
  - `tickSeq`
  - `reason`: `mount | depsChange`
  - `affectedCount`
  - `debounce`: `{ scheduled, cancelled, fired }`（摘要计数即可）

事件必须 Slim、可序列化，且带稳定锚点（instanceId/txnSeq/opSeq/tickSeq）。
