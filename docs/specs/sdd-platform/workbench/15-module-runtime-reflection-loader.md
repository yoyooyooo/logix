---
title: 15 · Module Runtime Reflection & Loader Pattern（免 AST 的结构提取）
status: draft
version: 2025-12-22
value: core
priority: later
related:
  - ./13-agentic-reversibility.md
  - ./08-alignment-lab-and-sandbox.md
  - ../../../../../specs/022-module/spec.md
---

# Module Runtime Reflection & Loader Pattern（免 AST 的结构提取）

> 目标：让 Studio/CLI 通过“动态 import + 运行时反射”读取模块对象（如 Module）的结构信息（Schema/Meta/源码锚点/逻辑 slot），而不是静态 AST 分析。
>
> 说明：本文是 platform 侧的待办收敛；`022-module` 已在 `Module` 形状与 `ModuleDescriptor` 合同上预留了 `schemas/meta/dev.source` 等字段，但平台消费能力尚未落地。

## 1) 为什么需要 Loader Pattern

静态分析（AST/TS Compiler API）在以下场景会变得脆弱且昂贵：

- Schema/逻辑是“动态组合”的（函数生成、配置驱动、feature flag 控制分支）
- 类型/Schema 经过多层封装（工厂函数 + trait/blueprint 封装），平台很难从源码中可靠推断最终形状
- 平台希望把“上下文”压缩成可对比、可序列化的结构化数据（JSON Schema / Descriptor），而不是把整份源码喂给 Agent

因此平台优先走“运行时拿最终对象”的路径：

- `import` 用户导出的 Module/IntentRule 等对象
- 读取其反射字段（`schemas/meta/dev.source`、稳定 id/slot key 等）
- 输出为 slim JSON（供 Studio/Agent/Playground/CI 消费）

## 2) 反射输入：对用户代码的最小约束

### 2.1 领域对象必须“显式回挂”（Reflection）

对 `Module`：

- `module.schemas?: Record<string, Schema>`（可选）：原样透传 Schema 引用（由平台决定是否转换/序列化）
- `module.meta?: Record<string, unknown>`（可选）：specId/scenarioId/version/generatedBy 等链路信息
- `module.dev?.source?: { file?: string; line?: number; column?: number }`（可选，仅 dev）
- `logicUnits[].id` 作为稳定 id/slot key（用于 diff/回放对齐，也为未来“具名逻辑插槽”铺路）

> 这些字段是“平台反射载荷”，缺省为空且不应进入运行时热路径。

### 2.2 构建态必须可试运行（可控副作用）

为支持“动态 import + 试运行”，用户代码应遵守 Draft 13 的构建态约束：

- 模块/领域对象构造阶段应尽量 pure（或只依赖可 mock 的构建态依赖，如 Config）
- 业务 IO/网络/数据库等依赖只应出现在运行态 handler 内，不应影响拓扑/Schema 构造

平台侧会提供标准 build env（Effect DI）来承载这次试运行，缺失依赖即视为“定义阶段耦合了运行态副作用”。

## 3) Loader Script：平台侧最小产物

### 3.1 Loader 的基本职责

Loader Script 是一个极小的 Node/Vite 脚本，职责是：

1. 动态 import 用户导出的对象（Module/IntentRule）
2. 读取反射字段（schemas/meta/source/logicSlots/descriptor）
3. 把“不可序列化载荷”（Schema/闭包）转换/投影成可序列化结构（优先 JSON Schema）
4. 输出 JSON（stdout 或写文件），供 Studio/CI 消费

### 3.2 输出：Module Manifest（建议形状）

建议平台产出一个“Manifest”（与运行时诊断 `ModuleDescriptor` 相区分）：

- `id`: 领域对象 id（可读）
- `schemas`: `{ key -> jsonSchema }`（可选）
- `schemaKeys`: keys-only（可选，便于 UI 快速列举）
- `meta`: traceability（可选）
- `source`: dev source（可选）
- `logicSlots`: `{ slotKey -> summary }`（可选；slotKey 与 `logicUnits[].id` 对齐）

> Manifest 的 JSON Schema 建议后续补一个单独的 contract（平台/工具链共用）。

## 4) 待办：Named Logic Slots（具名逻辑插槽）

`logicUnits[].id` 已要求稳定可复现，但“具名插槽”仍需要平台侧与 runtime 侧共同补齐语义：

- API：`withLogic(key, logic)` / `setSlot(slotName, logic)` / `withLogics({ key: logic })` 等形态裁决
- 语义：append-only 与 keyed override 的关系（覆盖/替换/禁用/叠加）
- 可诊断：slot 冲突与覆盖必须能解释（devtools 可见、可回放对齐）
- 迁移：从“数组顺序”迁到“具名插槽”的兼容策略（不引入兼容层也需有迁移说明）

## 5) Open Questions

- JSON Schema 转换的统一实现应落在哪（platform package / shared utils）？如何保证 deterministic（字段顺序、ref 命名、去随机化）？
- Loader 运行环境如何最小化副作用（mock 方案、禁网/禁 IO、超时/资源上界）？
- ESM/CJS、TS 编译与路径解析的统一策略（Vite runner / tsx / node --loader）？
- dev.source 注入优先用构建插件还是手工传参？如何避免影响生产包体？

## 6) Backlog（可执行拆分建议）

- 定义 `ModuleManifest` 的 JSON Schema（对齐 sdd-platform 的 loader 输出与 Studio 输入）
- 增加一个最小 loader 原型（动态 import + 读取 `schemas/meta/source` + 输出 JSON）
- 增加 Schema → JSON Schema 的转换器（含 deterministic 约束与大小上界）
- 把 loader 集成到 Studio/CLI 的“metadata extraction”命令（支持多入口与批量扫描）
- 为 Named Logic Slots 补齐 API/语义/诊断与迁移文档（并决定是否进入 022 或后续 feature）
