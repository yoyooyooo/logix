# Contract: Logic-level Traits Composition

**Status**: Draft  
**Scope**: `@logix/core` 内部/公共 API 合约（非网络 API）

## Goals

- 允许 Logic 在 setup 阶段声明 traits，并随 Logic 复用而复用。
- 将 Module-level 与 Logic-level traits 合并为“最终 traits 集”，提供确定性、冲突检测与 provenance。
- 将最终 traits 信息纳入可序列化证据/Devtools 解释链路，默认关闭诊断时近零成本。

## Contract Surface (high-level)

### 1) Logic can contribute traits during setup

- Logic 的 setup 阶段需要一个“声明入口”，其输出必须是纯数据或可在初始化阶段确定的结构化声明（不得依赖随机/时间/外部 IO）。
- 声明的 traits 必须可被赋予稳定 traitId，并能标注来源为该 Logic。
- setup 完成后必须冻结：进入 Running 后任何“追加 traits 贡献”的调用必须失败（硬错误），以防止行为漂移。
- provenance 的来源标识（originId）必须稳定可复现：对齐 `022-module` 的 `logicUnitId`（slot key）作为主锚点；优先显式提供（跨组合/diff/replay 稳定），缺失时允许 derived id（仅保证同一组合顺序内可复现）。其解析优先级为：挂载时显式 id（`withLogic/withLogics` options.id）> 逻辑值默认 id（`module.logic(build, { id })`）> derived id（如 `"<base>#<n>"`）。同一 module 内重复 logicUnitId 采用 `last-write-wins`（dev 可诊断），被覆盖的逻辑单元不应再产生 traits 贡献。
- `$.traits.declare` 必须能拿到“当前正在执行的逻辑单元（logicUnit）”上下文（用于自动填充 provenance），且该上下文必须是显式可注入契约（Service Tag），作用域为该 logic 的 setup/run fiber；不得写入 runtime state，也不得依赖进程级单例。

### 2) Deterministic merge and hard-fail conflicts (including consistency checks)

- 输入：Module-level traits + N 个 Logic-level contributions。
- 输出：确定性排序的最终 traits 集 + provenanceIndex。
- 冲突：同一 module 内重复 traitId 必须失败，并返回包含所有来源的错误信息。
- 一致性校验（FR-007）：若 traits 声明了互斥或前置条件（例如 `requires/excludes`），必须在进入运行前校验并硬失败，且错误中必须列出触发的 traitId、缺失项/互斥对以及所有来源（不允许静默降级）。
- 确定性要求：错误报告与来源列表必须稳定排序（同一输入下不因组合顺序变化）。

### 3) Evidence/Diagnostics requirements

- 必须能导出最小证据：最终 traits 集（含 traitId）+ provenance（来源链路）+ 稳定标识锚点。
- 诊断事件必须 Slim 且可序列化；禁用时近零成本（不得引入默认 O(n) 扫描或额外分配）。

### 4) Final traits list (for tests / diagnostics)

- 系统必须提供“最终 traits 清单”的可枚举入口（面向测试与诊断），其最小字段集与 `spec.md`/`data-model.md` 对齐：
  - `traitId`
  - `name`
  - `provenance`（至少包含 `originType` / `originId` / `originLabel`，并标注 `originIdKind`）
  - `description?`（可选：简短描述，用于展示，不影响语义）
- 输出顺序必须确定（同一输入下稳定），并与 snapshot digest 的计算口径一致。

## Non-goals

- 不在 023 内重新设计一个完全通用的 Trait Kernel（优先复用现有 StateTrait/Program/IR）。
- 不支持运行期动态增删 traits（避免行为漂移；setup 后冻结）。
