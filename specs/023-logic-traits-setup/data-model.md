# Data Model: Logic Traits in Setup

> 本文件描述“组合与诊断所需的最小数据模型”，不引入持久化存储。

## Core Entities

### Trait

- **traitId**: string（稳定标识；用于冲突检测、诊断引用、回放对齐）
- **name**: string（展示名）
- **description**: string（可选：简短描述；用于测试/诊断展示，不影响语义）
- **kind**: string（能力类别；例如字段派生/资源 source 等）
- **meta**: object（可选、白名单、可序列化；不得影响语义）
- **requires**: ReadonlyArray<string>（可选：前置条件；要求的 traitId 列表）
- **excludes**: ReadonlyArray<string>（可选：互斥条件；不允许同时存在的 traitId 列表）

### TraitProvenance

- **originType**: `"module"` | `"logicUnit"`（来源类型）
- **originId**: string（稳定来源标识；ModuleId 或 resolved `logicUnitId`）
- **originIdKind**: `"explicit"` | `"derived"`（来源 id 的裁决方式；derived 不承诺跨重排稳定）
- **originLabel**: string（用于 Devtools 展示的可读标签）
- **path**: string（可选：引用路径/声明位置摘要，用于定位）

> 对齐 022：`originId` 以“挂载后的逻辑单元 id（logicUnitId）”为准；其解析优先级为：挂载时显式 id（`withLogic/withLogics` options.id）> 逻辑值默认 id（`module.logic(build, { id })`）> derived id（当前实现形如 `"<base>#<n>"`，base 来自 `name/kind`，仅保证在同一组合顺序内可复现）。同一 module 内重复 logicUnitId 采用 `last-write-wins`，旧逻辑单元被覆盖后不应再产生 traits 贡献。

### TraitContribution

- **traits**: ReadonlyArray<Trait>（由某个来源贡献的一组 traits）
- **provenance**: TraitProvenance（该贡献的来源信息）

### ModuleTraitsSnapshot (Final)

- **moduleId**: string
- **digest**: string（最终 traits 集的稳定摘要，用于对比/缓存/回放对齐）
- **traits**: ReadonlyArray<Trait>（按确定性规则排序后的最终集合）
- **provenanceIndex**: Record<traitId, TraitProvenance>（traitId → 来源）
- **conflicts**: ReadonlyArray<{ traitId: string; sources: ReadonlyArray<TraitProvenance> }>（仅在失败时用于诊断/错误报告）

## Relationships

- 一个 Module 由多份 TraitContribution 构成（Module-level + 多个 Logic-level）。
- 合并算法输出一个 ModuleTraitsSnapshot；若冲突则输出失败信息并阻止进入运行。

## Validation Rules (from spec)

- 重复 traitId：视为配置错误，必须硬失败并列出所有冲突来源。
- 一致性校验（FR-007）：若 traits 声明 `requires/excludes`，必须在进入运行前校验；失败必须明确列出缺失项或互斥对及其来源（不允许静默降级）。
- 合并确定性：同一输入下产出完全一致的 ModuleTraitsSnapshot（traits 顺序、digest、provenance 映射不漂移）。
- 冻结语义：setup 完成后 ModuleTraitsSnapshot 不得被业务运行期修改。
