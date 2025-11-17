---
name: logix-best-practices
description: Logix（@logix/core + effect）业务开发工程最佳实践的自包含技能包。用于新建/重构 Logix feature 的目录结构（feature-first）、编写 ModuleDef/Logic/ModuleImpl、用 Process.link 进行跨模块协作、用 Tag-only Service + Layer 注入依赖、提炼可复用 Pattern 并通过脚本做复用门禁与健康检查。
---

# logix-best-practices

按“最少必要步骤”把 Logix 的写法与工程组织落到一个**可运行、可复用、可团队复制**的模式（不依赖仓库外部文档链接）。

## 快速用法（默认 feature-first）

1. 选择落点：用 `src/features/<feature>/` 聚合该 feature 的 Module/Process/局部 Pattern/Service Tag。
2. 建最小闭环：用 `src/runtime/*` 作为 Composition Root（imports/processes/layer），再用 `src/scenarios/*` 提供可运行入口。
3. 需要“逐文件最小写法”时：直接复制本 skill 内置样板（见 “资源导航”）。

## 工作流（从需求到落点）

1. 先判断你要产出哪一类：`scenario` / `pattern` / `module` / `process`。
2. 选落点：
   - 业务开发推荐目录（feature-first）：`src/features/<feature>/**`（Module/Process/局部 Pattern/Service Tag 就近聚合）。
   - 可复用 Pattern 目录（跨 feature）：`src/patterns/*`（至少 2 个 feature/场景消费再升级）。
   - 组合根（Composition Root）：`src/runtime/*`（只做 imports/processes/layer）。
   - 可运行入口：`src/scenarios/*`（单文件闭包；确保资源释放）。
   - IR/Parser 映射演示：独立放 `src/scenarios/ir/*`（非业务推荐）。
3. 组合根原则：Root 只做 `imports/processes/layer`，避免堆业务细节。
4. 依赖注入原则：Pattern/Module 只声明 Tag 契约；实现集中在组合层用 `Layer` 提供。
5. Pattern 升级门槛：进入 `src/patterns/*` 前，确保有 ≥2 个 consumers；用脚本做门禁（见 “资源导航”）。

## 资源导航（本 skill 内置）

- 最小闭环工作流与检查清单：`references/workflow.md`
- Logix Core 注意事项（setup/run、Phase Guard、Tag 泛型）：`references/logix-core-notes.md`
- Logix React 注意事项（useModule/useSelector 性能与语义）：`references/logix-react-notes.md`
- feature-first 逐文件最小写法（可复制模板）：`references/feature-first-minimal-example.md`
- 内置可复制样板源码（按目录拷贝进你的 repo）：`assets/feature-first-customer-search/src`
- 一键落地样板到目标目录（默认不覆盖）：`scripts/scaffold-feature-first.mjs`
- Pattern 复用门禁脚本（可放进 CI/本地 preflight）：`scripts/check-pattern-reuse.mjs`
