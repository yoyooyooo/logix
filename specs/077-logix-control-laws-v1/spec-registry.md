# Spec Registry: Logix Control Laws v1（077 总控）

本文件是 `specs/077-logix-control-laws-v1/` 的“人读入口”。关系 SSoT 以 `spec-registry.json` 为准。

## SSoT

- 公式/分层裁决（最高层）：`docs/specs/sdd-platform/ssot/foundation/01-the-one.md`
- 成员关系（机器可读）：`specs/077-logix-control-laws-v1/spec-registry.json`
- 索引式执行清单：`specs/077-logix-control-laws-v1/checklists/group.registry.md`

## Members（按依赖顺序）

- 073 `specs/073-logix-external-store-tick/`
  - 交付：`RuntimeStore + tickSeq`（React 单订阅点，no-tearing）+ `trace:tick`
- 075 `specs/075-logix-flow-program-ir/`
  - 交付：FlowProgram IR（可编译控制律：Action→Action + 时间算子）
- 076 `specs/076-logix-source-auto-trigger-kernel/`
  - 交付：source 自动触发内核化（dirtyPaths+depsIndex），消灭 Query/Form watcher 胶水

## 约定（避免并行真相源）

- registry 的依赖关系只写在 `spec-registry.json`（脚本只读 json）
- 本文件只解释，不新增“只有 md 有、json 没有”的关系信息
- group spec 不复制 member tasks；执行时从 checklist 跳到 member `tasks.md`
