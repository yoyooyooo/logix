# Contracts: IR（SourceAutoTriggerPolicy in StateTraitStaticIr）

目标：让 Devtools/审查/diff 能看到 auto-trigger 的静态结构，而不是只看到运行期 watcher。

## 1) Static IR（V1）

复用 `StateTraitStaticIr` 的 `policy` 字段（见 `packages/logix-core/src/internal/state-trait/ir.ts`）：

```json
{
  "kind": "source",
  "reads": ["params.q", "ui.page"],
  "writes": ["queries.search"],
  "policy": {
    "autoRefresh": { "onMount": true, "onDepsChange": true, "debounceMs": 200 }
  }
}
```

约束：

- 必须 JSON 可序列化
- diagnostics=off 不应携带 IR 全量（只在导出/对比时需要）

## 2) 版本策略

- 仅新增可选字段：保持向前可解析；
- 遇到未知 `version` 必须 fail-fast（避免静默误解释导致证据漂移）。

