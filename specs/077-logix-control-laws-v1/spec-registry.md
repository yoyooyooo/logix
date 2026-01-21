# Spec Registry: Logix Control Laws v1（077 总控）

本文件是 `specs/077-logix-control-laws-v1/` 的“人读入口”。关系 SSoT 以 `spec-registry.json` 为准。

## SSoT

- 公式/分层裁决（最高层）：`docs/ssot/platform/foundation/01-the-one.md`
- 成员关系（机器可读）：`specs/077-logix-control-laws-v1/spec-registry.json`
- 索引式执行清单：`specs/077-logix-control-laws-v1/checklists/group.registry.md`

## Members（按依赖顺序）

- 073 `specs/073-logix-external-store-tick/`
  - 交付：`RuntimeStore + tickSeq`（React 单订阅点，no-tearing）+ `trace:tick`
- 070 `specs/070-core-pure-perf-wins/`
  - 交付：默认档位零诊断税（off 近零成本）+ 单内核边界（纯赚/近纯赚）
- 074 `specs/074-readquery-create-selector/`
  - 交付：显式 deps 的静态 selector 组合器（static lane / readsDigest），为 topic 分片与 watcher 降税打地基
- 068 `specs/068-watcher-pure-wins/`
  - 交付：watcher fan-out / state 通知链路的纯赚优化（无关触达降到 O(k)，可解释回退）
- 006 `specs/006-optimize-traits/`
  - 交付：Trait converge 性能上限提升（依赖图/增量/预算/降级）+ 可回归证据
- 075 `specs/075-workflow-codegen-ir/`
  - 交付：Workflow 出码 IR（AI/平台专属 DSL：Canonical AST → Static IR；时间算子进入证据链）
- 076 `specs/076-logix-source-auto-trigger-kernel/`
  - 交付：source 自动触发内核化（dirtyPaths+depsIndex），消灭 Query/Form watcher 胶水
- 018 `specs/018-periodic-self-calibration/`
  - 交付：默认值审计 + 运行时自校准（基于 014/017 工作负载；不影响默认档位）

## 约定（避免并行真相源）

- registry 的依赖关系只写在 `spec-registry.json`（脚本只读 json）
- 本文件只解释，不新增“只有 md 有、json 没有”的关系信息
- group spec 不复制 member tasks；执行时从 checklist 跳到 member `tasks.md`
